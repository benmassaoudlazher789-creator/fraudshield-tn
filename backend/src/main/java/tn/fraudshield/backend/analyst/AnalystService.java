package tn.fraudshield.backend.analyst;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.fraudshield.backend.account.Account;
import tn.fraudshield.backend.account.AccountDebitService;
import tn.fraudshield.backend.alert.Alert;
import tn.fraudshield.backend.alert.AlertDecision;
import tn.fraudshield.backend.alert.AlertRepository;
import tn.fraudshield.backend.alert.AnalystDecision;
import tn.fraudshield.backend.alert.dto.AlertSummaryResponse;
import tn.fraudshield.backend.analyst.dto.AlertDetailResponse;
import tn.fraudshield.backend.analyst.dto.AlertDetailResponse.ClientInfo;
import tn.fraudshield.backend.analyst.dto.AlertDetailResponse.TransactionInfo;
import tn.fraudshield.backend.analyst.dto.AlertStatusFilter;
import tn.fraudshield.backend.analyst.dto.AnalystDecisionRequest;
import tn.fraudshield.backend.analyst.dto.PageResponse;
import tn.fraudshield.backend.common.AccountRefMasker;
import tn.fraudshield.backend.common.BusinessException;
import tn.fraudshield.backend.realtime.RealtimeEvent;
import tn.fraudshield.backend.transaction.Transaction;
import tn.fraudshield.backend.transaction.TransactionRepository;
import tn.fraudshield.backend.transaction.TransactionStatus;
import tn.fraudshield.backend.transaction.dto.TransactionNotification;
import tn.fraudshield.backend.user.User;
import tn.fraudshield.backend.user.UserRepository;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.time.LocalDateTime;

/** Traitement des alertes par les analystes : liste, investigation, décision. */
@Slf4j
@Service
@RequiredArgsConstructor
public class AnalystService {

    private static final int MAX_PAGE_SIZE = 100;

    private final AlertRepository alertRepository;
    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final AccountDebitService accountDebitService;
    private final ApplicationEventPublisher eventPublisher;
    private final JsonMapper jsonMapper;

    @Transactional(readOnly = true)
    public PageResponse<AlertSummaryResponse> listAlerts(AlertStatusFilter status, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(1, Math.min(size, MAX_PAGE_SIZE)),
                Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Alert> alerts;
        if (status == null) {
            alerts = alertRepository.findAllBy(pageable);
        } else if (status == AlertStatusFilter.TRAITEE) {
            alerts = alertRepository.findByAnalystDecisionIsNotNull(pageable);
        } else {
            alerts = alertRepository.findByDecisionAndAnalystDecisionIsNull(
                    AlertDecision.valueOf(status.name()), pageable);
        }
        return PageResponse.from(alerts.map(AlertSummaryResponse::from));
    }

    @Transactional(readOnly = true)
    public AlertDetailResponse getAlert(Long id) {
        Alert alert = alertRepository.findById(id).orElseThrow(AnalystService::alertNotFound);
        Transaction tx = alert.getTransaction();
        Account account = tx.getAccount();
        User client = account.getUser();
        User analyst = alert.getAnalyst();

        return new AlertDetailResponse(
                alert.getId(),
                alert.getScore(),
                alert.getDecision(),
                alert.getAnalystDecision() != null ? "TRAITEE" : alert.getDecision().name(),
                alert.getCreatedAt(),
                parseReasons(alert),
                toInfo(tx),
                new ClientInfo(client.getId(), client.getFullName(), client.getEmail()),
                AccountRefMasker.mask(account.getAccountRef()),
                account.getBank(),
                alert.getAnalystDecision(),
                alert.getAnalystComment(),
                analyst != null ? analyst.getFullName() : null,
                alert.getDecidedAt(),
                transactionRepository.findTop6ByAccountIdAndIdNotOrderByCreatedAtDesc(account.getId(), tx.getId())
                        .stream().map(AnalystService::toInfo).toList());
    }

    /**
     * FRAUDE_CONFIRMEE -> transaction BLOQUEE ; FAUX_POSITIF -> ACCEPTEE + débit.
     * 409 si l'alerte a déjà été décidée ou si le solde ne permet plus le débit.
     */
    @Transactional
    public AlertDetailResponse decide(Long id, AnalystDecisionRequest request, String analystEmail) {
        Alert alert = alertRepository.findLockedById(id).orElseThrow(AnalystService::alertNotFound);
        if (alert.getAnalystDecision() != null) {
            throw new BusinessException(HttpStatus.CONFLICT, "Une décision a déjà été prise pour cette alerte");
        }
        User analyst = userRepository.findByEmail(analystEmail).orElseThrow();
        Transaction tx = alert.getTransaction();

        if (request.decision() == AnalystDecision.FAUX_POSITIF) {
            if (!accountDebitService.debitIfSufficient(tx.getAccount().getId(), tx.getAmount())) {
                throw new BusinessException(HttpStatus.CONFLICT,
                        "Solde insuffisant : la transaction ne peut pas être acceptée");
            }
            tx.setStatus(TransactionStatus.ACCEPTEE);
        } else {
            tx.setStatus(TransactionStatus.BLOQUEE);
        }

        alert.setAnalystDecision(request.decision());
        alert.setAnalystComment(request.comment() == null ? null : request.comment().trim());
        alert.setAnalyst(analyst);
        alert.setDecidedAt(LocalDateTime.now());

        log.info("Alerte {} : {} par {} -> transaction {} {}",
                alert.getId(), request.decision(), analystEmail, tx.getId(), tx.getStatus());

        // Le graphique du dashboard reflète le nouveau statut (après commit)
        eventPublisher.publishEvent(new RealtimeEvent(TransactionNotification.from(tx), null));
        return getAlert(id);
    }

    /** Alert.reasons est stocké en texte JSON : on le renvoie comme un vrai tableau JSON. */
    private JsonNode parseReasons(Alert alert) {
        if (alert.getReasons() == null || alert.getReasons().isBlank()) {
            return jsonMapper.createArrayNode();
        }
        try {
            return jsonMapper.readTree(alert.getReasons());
        } catch (JacksonException e) {
            log.warn("Raisons illisibles pour l'alerte {}", alert.getId());
            return jsonMapper.createArrayNode();
        }
    }

    private static TransactionInfo toInfo(Transaction t) {
        return new TransactionInfo(t.getId(), t.getBeneficiary(), t.getAmount(), t.getType(),
                t.getCountry(), t.getStatus(), t.getRiskScore(), t.getCreatedAt());
    }

    private static BusinessException alertNotFound() {
        return new BusinessException(HttpStatus.NOT_FOUND, "Alerte introuvable");
    }
}
