package tn.fraudshield.backend.fraud;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

/** Message JSON produit par le job Spark dans le topic "alerts" (une transaction scorée). */
@JsonIgnoreProperties(ignoreUnknown = true)
public record ScoredTransactionMessage(
        Long transactionId,
        Long accountId,
        Integer score,
        String decision,
        List<Reason> reasons,
        String modelVersion,
        String scoredAt
) {

    /** Explication SHAP d'une variable du modèle. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Reason(String feature, String label, Double value, Double impact) {
    }

    /** Contrôle minimal : identifiant et score présents, score entre 0 et 100. */
    public boolean isValid() {
        return transactionId != null && score != null && score >= 0 && score <= 100;
    }
}
