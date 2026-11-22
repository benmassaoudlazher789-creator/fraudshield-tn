package tn.fraudshield.backend.analyst.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/** Indicateurs du jour pour le tableau de bord analyste. */
public record DashboardResponse(
        long transactionsToday,
        long alertsToday,
        BigDecimal blockedAmountToday,
        long pendingReviewCount,                 // alertes A_VERIFIER sans décision d'analyste
        Map<String, Long> decisions,             // ACCEPTEE, A_VERIFIER, BLOQUEE (transactions du jour)
        List<MinuteBucket> perMinute,            // 15 dernières minutes, de la plus ancienne à la plus récente
        Yesterday yesterday,                     // mêmes indicateurs la veille, de 0 h à la même heure
        LocalDateTime generatedAt
) {
    /**
     * Valeurs de la veille sur la même plage horaire (0 h -> heure actuelle moins 24 h),
     * pour afficher une tendance comparable sur une journée en cours.
     */
    public record Yesterday(long transactions, long alerts, BigDecimal blockedAmount) {
    }

    /** Nombre de transactions créées pendant une minute (flagged = A_VERIFIER ou BLOQUEE). */
    public record MinuteBucket(LocalDateTime minute, long total, long flagged) {
    }
}
