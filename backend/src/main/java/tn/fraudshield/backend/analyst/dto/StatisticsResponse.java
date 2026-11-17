package tn.fraudshield.backend.analyst.dto;

import tn.fraudshield.backend.transaction.TransactionType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/** GET /api/analyst/statistics?days=7|30 : statistiques calculées sur la base. */
public record StatisticsResponse(
        int days,
        LocalDate from,                       // premier jour inclus
        LocalDate to,                         // aujourd'hui (inclus)
        Summary summary,
        List<DayBucket> fraudsPerDay,         // un élément par jour, du plus ancien au plus récent
        List<TypeBucket> fraudsByType,        // PAYMENT, TRANSFER, CASH_OUT (toujours les 3)
        List<CountryBucket> topCountries,     // top 5 des pays des transactions BLOQUEE
        AnalystDecisions analystDecisions,
        ModelMetrics modelMetrics,            // null si ml/models/model_metrics.json est absent
        LocalDateTime generatedAt
) {
    /** Indicateurs de la période (alertes comparées à la période précédente de même durée). */
    public record Summary(
            long alerts,
            long previousAlerts,
            BigDecimal blockedAmount,
            Long avgDecisionSeconds           // null si aucune alerte décidée sur la période
    ) {
    }

    /** Transactions suspectes créées un jour donné (statut actuel BLOQUEE ou A_VERIFIER). */
    public record DayBucket(LocalDate date, long blocked, long review, long total) {
    }

    /** Transactions suspectes d'un type (BLOQUEE ou A_VERIFIER). */
    public record TypeBucket(TransactionType type, long count, BigDecimal amount) {
    }

    /** Transactions bloquées vers un pays de destination. */
    public record CountryBucket(String country, long count, BigDecimal amount) {
    }

    /** Décisions prises par les analystes sur la période. */
    public record AnalystDecisions(long fraudConfirmed, long falsePositive) {
    }
}
