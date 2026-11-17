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
        LocalDateTime generatedAt
) {
    /** Nombre de transactions créées pendant une minute (flagged = A_VERIFIER ou BLOQUEE). */
    public record MinuteBucket(LocalDateTime minute, long total, long flagged) {
    }
}
