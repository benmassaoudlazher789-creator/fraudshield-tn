package tn.fraudshield.backend.analyst;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.fraudshield.backend.alert.AlertRepository;
import tn.fraudshield.backend.alert.AnalystDecision;
import tn.fraudshield.backend.analyst.dto.StatisticsResponse;
import tn.fraudshield.backend.analyst.dto.StatisticsResponse.AnalystDecisions;
import tn.fraudshield.backend.analyst.dto.StatisticsResponse.CountryBucket;
import tn.fraudshield.backend.analyst.dto.StatisticsResponse.DayBucket;
import tn.fraudshield.backend.analyst.dto.StatisticsResponse.Summary;
import tn.fraudshield.backend.analyst.dto.StatisticsResponse.TypeBucket;
import tn.fraudshield.backend.common.BusinessException;
import tn.fraudshield.backend.transaction.TransactionRepository;
import tn.fraudshield.backend.transaction.TransactionStatus;
import tn.fraudshield.backend.transaction.TransactionType;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Statistiques de la page analyste sur 7 ou 30 jours (aujourd'hui inclus, heure du serveur). */
@Service
@RequiredArgsConstructor
public class StatisticsService {

    private static final Set<Integer> ALLOWED_DAYS = Set.of(7, 30);
    private static final Set<TransactionStatus> SUSPICIOUS =
            Set.of(TransactionStatus.BLOQUEE, TransactionStatus.A_VERIFIER);
    private static final int TOP_COUNTRIES = 5;

    private final TransactionRepository transactionRepository;
    private final AlertRepository alertRepository;
    private final ModelMetricsProvider modelMetricsProvider;

    @Transactional(readOnly = true)
    public StatisticsResponse getStatistics(int days) {
        if (!ALLOWED_DAYS.contains(days)) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Période invalide : days doit valoir 7 ou 30");
        }
        LocalDate today = LocalDate.now();
        LocalDate firstDay = today.minusDays(days - 1L);
        LocalDateTime from = firstDay.atStartOfDay();

        return new StatisticsResponse(
                days,
                firstDay,
                today,
                summary(from, days),
                fraudsPerDay(firstDay, days),
                fraudsByType(from),
                topCountries(from),
                analystDecisions(from),
                modelMetricsProvider.load(),
                LocalDateTime.now());
    }

    private Summary summary(LocalDateTime from, int days) {
        long alerts = alertRepository.countByCreatedAtGreaterThanEqual(from);
        long previous = alertRepository.countByCreatedAtGreaterThanEqualAndCreatedAtLessThan(from.minusDays(days), from);
        BigDecimal blocked = transactionRepository.sumAmountByStatusSince(TransactionStatus.BLOQUEE, from);

        // Délai moyen entre la création de l'alerte et la décision de l'analyste
        List<Object[]> decided = alertRepository.findCreatedAndDecidedSince(from);
        Long avgSeconds = null;
        if (!decided.isEmpty()) {
            long totalSeconds = 0;
            for (Object[] row : decided) {
                totalSeconds += Math.max(0, Duration.between((LocalDateTime) row[0], (LocalDateTime) row[1]).toSeconds());
            }
            avgSeconds = totalSeconds / decided.size();
        }
        return new Summary(alerts, previous, blocked, avgSeconds);
    }

    /** Une case par jour (jours sans fraude à zéro) pour une courbe continue. */
    private List<DayBucket> fraudsPerDay(LocalDate firstDay, int days) {
        long[] blocked = new long[days];
        long[] review = new long[days];
        for (Object[] row : transactionRepository.findCreatedAtAndStatusByStatusInSince(
                SUSPICIOUS, firstDay.atStartOfDay())) {
            int index = (int) ChronoUnit.DAYS.between(firstDay, ((LocalDateTime) row[0]).toLocalDate());
            if (index < 0 || index >= days) {
                continue;
            }
            if (row[1] == TransactionStatus.BLOQUEE) {
                blocked[index]++;
            } else {
                review[index]++;
            }
        }
        List<DayBucket> buckets = new ArrayList<>(days);
        for (int i = 0; i < days; i++) {
            buckets.add(new DayBucket(firstDay.plusDays(i), blocked[i], review[i], blocked[i] + review[i]));
        }
        return buckets;
    }

    private List<TypeBucket> fraudsByType(LocalDateTime from) {
        Map<TransactionType, TypeBucket> byType = new EnumMap<>(TransactionType.class);
        for (TransactionType type : TransactionType.values()) {
            byType.put(type, new TypeBucket(type, 0, BigDecimal.ZERO));
        }
        for (Object[] row : transactionRepository.countAndSumByTypeSince(SUSPICIOUS, from)) {
            TransactionType type = (TransactionType) row[0];
            byType.put(type, new TypeBucket(type, (Long) row[1], (BigDecimal) row[2]));
        }
        return List.copyOf(byType.values());
    }

    private List<CountryBucket> topCountries(LocalDateTime from) {
        return transactionRepository
                .countAndSumByCountrySince(TransactionStatus.BLOQUEE, from, PageRequest.of(0, TOP_COUNTRIES))
                .stream()
                .map(row -> new CountryBucket((String) row[0], (Long) row[1], (BigDecimal) row[2]))
                .toList();
    }

    private AnalystDecisions analystDecisions(LocalDateTime from) {
        long confirmed = 0;
        long falsePositive = 0;
        for (Object[] row : alertRepository.countAnalystDecisionsSince(from)) {
            if (row[0] == AnalystDecision.FRAUDE_CONFIRMEE) {
                confirmed = (Long) row[1];
            } else if (row[0] == AnalystDecision.FAUX_POSITIF) {
                falsePositive = (Long) row[1];
            }
        }
        return new AnalystDecisions(confirmed, falsePositive);
    }
}
