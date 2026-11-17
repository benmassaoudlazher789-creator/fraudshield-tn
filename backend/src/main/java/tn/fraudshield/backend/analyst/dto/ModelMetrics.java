package tn.fraudshield.backend.analyst.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

/**
 * Métriques du modèle sur le jeu de test, lues depuis ml/models/model_metrics.json
 * (écrit par la dernière cellule du notebook ml/02_entrainement.ipynb).
 * Le fichier est en snake_case (auc_pr...) : @JsonAlias le lit, l'API renvoie du camelCase.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record ModelMetrics(
        String model,
        String dataset,
        Double precision,
        Double recall,
        Double f1,
        @JsonAlias("auc_pr") Double aucPr,
        Double threshold,
        @JsonAlias("test_size") Long testSize,
        @JsonAlias("confusion_matrix") ConfusionMatrix confusionMatrix,
        List<ModelComparison> models,
        @JsonAlias("evaluated_at") String evaluatedAt
) {
    /** Matrice de confusion au seuil retenu : vrais/faux négatifs et positifs. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ConfusionMatrix(long tn, long fp, long fn, long tp) {
    }

    /** Ligne du comparatif des modèles (seuil 0,5). */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ModelComparison(
            String name,
            Double precision,
            Double recall,
            Double f1,
            @JsonAlias("auc_pr") Double aucPr
    ) {
    }
}
