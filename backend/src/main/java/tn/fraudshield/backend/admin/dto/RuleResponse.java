package tn.fraudshield.backend.admin.dto;

import tn.fraudshield.backend.rule.BusinessRule;

import java.math.BigDecimal;

/** Règle métier du moteur anti-fraude. */
public record RuleResponse(Long id, String code, String label, BigDecimal threshold, boolean enabled) {

    public static RuleResponse from(BusinessRule rule) {
        return new RuleResponse(rule.getId(), rule.getCode(), rule.getLabel(), rule.getThreshold(),
                Boolean.TRUE.equals(rule.getEnabled()));
    }
}
