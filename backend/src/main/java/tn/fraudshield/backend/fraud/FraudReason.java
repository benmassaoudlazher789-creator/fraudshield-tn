package tn.fraudshield.backend.fraud;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Raison fusionnée stockée dans Alert.reasons (JSON).
 * source = MODELE (explication SHAP) ou REGLE (règle métier).
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record FraudReason(
        String source,
        String feature,
        String label,
        Object value,
        Double impact,     // impact SHAP (modèle uniquement)
        Integer score      // score attribué par la règle (règles uniquement)
) {
    public static final String MODELE = "MODELE";
    public static final String REGLE = "REGLE";

    public static FraudReason fromModel(ScoredTransactionMessage.Reason r) {
        return new FraudReason(MODELE, r.feature(), r.label(), r.value(), r.impact(), null);
    }

    public static FraudReason fromRule(String code, String label, Object value, Integer score) {
        return new FraudReason(REGLE, code, label, value, null, score);
    }
}
