package tn.fraudshield.backend.fraud;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.fraudshield.backend.account.AccountDebitService;
import tn.fraudshield.backend.alert.Alert;
import tn.fraudshield.backend.alert.AlertDecision;
import tn.fraudshield.backend.alert.AlertRepository;
import tn.fraudshield.backend.alert.dto.AlertSummaryResponse;
import tn.fraudshield.backend.realtime.RealtimeEvent;
import tn.fraudshield.backend.rule.BusinessRule;
import tn.fraudshield.backend.rule.BusinessRuleRepository;
import tn.fraudshield.backend.transaction.Transaction;
import tn.fraudshield.backend.transaction.TransactionRepository;
import tn.fraudshield.backend.transaction.TransactionStatus;
import tn.fraudshield.backend.transaction.dto.TransactionNotification;
import tools.jackson.databind.json.JsonMapper;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Système hybride : score du modèle (Spark) + règles métier.
 * score final = max(score modèle, scores des règles déclenchées), puis seuils de décision.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FraudDecisionService {

    static final String RULE_MAX_AMOUNT_NEW_COUNTRY = "MAX_AMOUNT_NEW_COUNTRY";
    static final String RULE_VELOCITY_10_MIN = "VELOCITY_10_MIN";
    static final String RULE_AUTO_BLOCK_SCORE = "AUTO_BLOCK_SCORE";

    static final int SCORE_NEW_COUNTRY = 85;
    static final int SCORE_VELOCITY = 60;

    private final TransactionRepository transactionRepository;
    private final AlertRepository alertRepository;
    private final BusinessRuleRepository businessRuleRepository;
    private final AccountDebitService accountDebitService;
    private final ApplicationEventPublisher eventPublisher;
    private final JsonMapper jsonMapper;

    @Value("${app.fraud.review-threshold}")
    private int reviewThreshold;

    /** Traite un message Spark. Ignore (WARN) les transactions inconnues ou déjà traitées. */
    @Transactional
    public void process(ScoredTransactionMessage message) {
        Optional<Transaction> found = transactionRepository.findLockedById(message.transactionId());
        if (found.isEmpty()) {
            log.warn("Alerte ignorée : transaction {} inexistante", message.transactionId());
            return;
        }
        Transaction tx = found.get();

        // Idempotence : un message rejoué (redémarrage, rebalancing) ne refait rien
        if (tx.getStatus() != TransactionStatus.EN_COURS) {
            log.warn("Alerte ignorée : transaction {} déjà traitée (statut {})", tx.getId(), tx.getStatus());
            return;
        }

        // 1. Raisons du modèle
        List<FraudReason> reasons = new ArrayList<>();
        if (message.reasons() != null) {
            message.reasons().forEach(r -> reasons.add(FraudReason.fromModel(r)));
        }
        int finalScore = message.score();

        // 2. Règles métier (seulement si activées)
        finalScore = Math.max(finalScore, applyNewCountryRule(tx, reasons));
        finalScore = Math.max(finalScore, applyVelocityRule(tx, reasons));

        // 3. Décision selon les seuils
        TransactionStatus status = decide(finalScore);

        // 4. Acceptée : débit, sauf si le solde a baissé entre-temps
        if (status == TransactionStatus.ACCEPTEE
                && !accountDebitService.debitIfSufficient(tx.getAccount().getId(), tx.getAmount())) {
            status = TransactionStatus.BLOQUEE;
            reasons.add(FraudReason.fromRule("SOLDE_INSUFFISANT",
                    "Solde insuffisant au moment de la validation", tx.getAmount(), null));
        }

        tx.setStatus(status);
        tx.setRiskScore(finalScore);

        // 5. A_VERIFIER ou BLOQUEE : création de l'alerte pour les analystes
        AlertSummaryResponse alertSummary = null;
        if (status != TransactionStatus.ACCEPTEE) {
            Alert alert = alertRepository.save(Alert.builder()
                    .transaction(tx)
                    .score(finalScore)
                    .decision(AlertDecision.valueOf(status.name()))
                    .reasons(jsonMapper.writeValueAsString(reasons))
                    .build());
            alertSummary = AlertSummaryResponse.from(alert);
        }

        log.info("Transaction {} : score modèle {} -> score final {} -> {}",
                tx.getId(), message.score(), finalScore, status);

        // Diffusion WebSocket après le commit
        eventPublisher.publishEvent(new RealtimeEvent(TransactionNotification.from(tx), alertSummary));
    }

    /** MAX_AMOUNT_NEW_COUNTRY : gros montant vers un pays jamais accepté pour ce compte. */
    private int applyNewCountryRule(Transaction tx, List<FraudReason> reasons) {
        Optional<BusinessRule> rule = enabledRule(RULE_MAX_AMOUNT_NEW_COUNTRY);
        if (rule.isEmpty() || tx.getAmount().compareTo(rule.get().getThreshold()) <= 0) {
            return 0;
        }
        boolean knownCountry = transactionRepository.existsByAccountIdAndCountryAndStatus(
                tx.getAccount().getId(), tx.getCountry(), TransactionStatus.ACCEPTEE);
        if (knownCountry) {
            return 0;
        }
        reasons.add(FraudReason.fromRule(RULE_MAX_AMOUNT_NEW_COUNTRY,
                "Montant élevé vers un nouveau pays", tx.getAmount(), SCORE_NEW_COUNTRY));
        return SCORE_NEW_COUNTRY;
    }

    /** VELOCITY_10_MIN : trop de transactions du compte sur les 10 minutes précédentes. */
    private int applyVelocityRule(Transaction tx, List<FraudReason> reasons) {
        Optional<BusinessRule> rule = enabledRule(RULE_VELOCITY_10_MIN);
        if (rule.isEmpty()) {
            return 0;
        }
        LocalDateTime to = tx.getCreatedAt();
        long count = transactionRepository.countByAccountIdAndCreatedAtBetween(
                tx.getAccount().getId(), to.minusMinutes(10), to);
        if (BigDecimal.valueOf(count).compareTo(rule.get().getThreshold()) <= 0) {
            return 0;
        }
        reasons.add(FraudReason.fromRule(RULE_VELOCITY_10_MIN,
                "Transactions trop fréquentes", count, SCORE_VELOCITY));
        return SCORE_VELOCITY;
    }

    /** Seuils : AUTO_BLOCK_SCORE (règle, si activée) puis app.fraud.review-threshold. */
    private TransactionStatus decide(int score) {
        Optional<BusinessRule> autoBlock = enabledRule(RULE_AUTO_BLOCK_SCORE);
        if (autoBlock.isPresent() && score >= autoBlock.get().getThreshold().intValue()) {
            return TransactionStatus.BLOQUEE;
        }
        if (score >= reviewThreshold) {
            return TransactionStatus.A_VERIFIER;
        }
        return TransactionStatus.ACCEPTEE;
    }

    private Optional<BusinessRule> enabledRule(String code) {
        return businessRuleRepository.findByCode(code).filter(r -> Boolean.TRUE.equals(r.getEnabled()));
    }
}
