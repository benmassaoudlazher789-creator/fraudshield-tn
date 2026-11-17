package tn.fraudshield.backend.admin;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.fraudshield.backend.admin.dto.RuleResponse;
import tn.fraudshield.backend.admin.dto.UpdateRuleRequest;
import tn.fraudshield.backend.common.BusinessException;
import tn.fraudshield.backend.rule.BusinessRule;
import tn.fraudshield.backend.rule.BusinessRuleRepository;

import java.math.BigDecimal;
import java.util.List;

/**
 * Gestion des règles métier. Aucun cache : FraudDecisionService relit la règle en base
 * pour chaque transaction, une modification s'applique donc dès le commit.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminRuleService {

    static final String AUTO_BLOCK_SCORE = "AUTO_BLOCK_SCORE";
    static final String VELOCITY_10_MIN = "VELOCITY_10_MIN";
    private static final BigDecimal MIN_AUTO_BLOCK = BigDecimal.valueOf(50);
    private static final BigDecimal MAX_AUTO_BLOCK = BigDecimal.valueOf(100);

    private final BusinessRuleRepository ruleRepository;

    @Transactional(readOnly = true)
    public List<RuleResponse> listRules() {
        return ruleRepository.findAll(Sort.by("id")).stream().map(RuleResponse::from).toList();
    }

    @Transactional
    public RuleResponse updateRule(Long id, UpdateRuleRequest request, String adminEmail) {
        BusinessRule rule = ruleRepository.findById(id)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "Règle introuvable"));

        if (request.threshold() != null) {
            validateThreshold(rule.getCode(), request.threshold());
            rule.setThreshold(request.threshold());
        }
        if (request.enabled() != null) {
            rule.setEnabled(request.enabled());
        }

        log.info("Règle {} modifiée par {} : seuil {}, {}", rule.getCode(), adminEmail,
                rule.getThreshold(), Boolean.TRUE.equals(rule.getEnabled()) ? "activée" : "désactivée");
        return RuleResponse.from(rule);
    }

    /** Bornes propres à certaines règles (le seuil > 0 est déjà vérifié par @Positive). */
    private static void validateThreshold(String code, BigDecimal threshold) {
        switch (code) {
            case AUTO_BLOCK_SCORE -> {
                requireWholeNumber(threshold, "Le score de blocage automatique doit être un nombre entier");
                if (threshold.compareTo(MIN_AUTO_BLOCK) < 0 || threshold.compareTo(MAX_AUTO_BLOCK) > 0) {
                    throw new BusinessException(HttpStatus.BAD_REQUEST,
                            "Le score de blocage automatique doit être compris entre 50 et 100");
                }
            }
            case VELOCITY_10_MIN ->
                    requireWholeNumber(threshold, "Le nombre de transactions doit être un nombre entier");
            default -> {
                // MAX_AMOUNT_NEW_COUNTRY : montant en DT, 3 décimales autorisées
            }
        }
    }

    private static void requireWholeNumber(BigDecimal value, String message) {
        if (value.stripTrailingZeros().scale() > 0) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, message);
        }
    }
}
