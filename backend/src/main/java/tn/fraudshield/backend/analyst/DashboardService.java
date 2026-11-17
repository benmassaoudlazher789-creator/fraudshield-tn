package tn.fraudshield.backend.analyst;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.fraudshield.backend.alert.AlertDecision;
import tn.fraudshield.backend.alert.AlertRepository;
import tn.fraudshield.backend.analyst.dto.DashboardResponse;
import tn.fraudshield.backend.analyst.dto.DashboardResponse.MinuteBucket;
import tn.fraudshield.backend.transaction.TransactionRepository;
import tn.fraudshield.backend.transaction.TransactionStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Calcul des indicateurs du tableau de bord (journée en cours, heure du serveur). */
@Service
@RequiredArgsConstructor
public class DashboardService {

    private static final int CHART_MINUTES = 15;

    private final TransactionRepository transactionRepository;
    private final AlertRepository alertRepository;

    @Transactional(readOnly = true)
    public DashboardResponse getDashboard() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();

        // Répartition des décisions : les transactions EN_COURS ne sont pas encore décidées
        Map<String, Long> decisions = new LinkedHashMap<>();
        decisions.put(TransactionStatus.ACCEPTEE.name(), 0L);
        decisions.put(TransactionStatus.A_VERIFIER.name(), 0L);
        decisions.put(TransactionStatus.BLOQUEE.name(), 0L);
        for (Object[] row : transactionRepository.countByStatusSince(startOfDay)) {
            String status = ((TransactionStatus) row[0]).name();
            if (decisions.containsKey(status)) {
                decisions.put(status, (Long) row[1]);
            }
        }

        return new DashboardResponse(
                transactionRepository.countByCreatedAtGreaterThanEqual(startOfDay),
                alertRepository.countByCreatedAtGreaterThanEqual(startOfDay),
                transactionRepository.sumAmountByStatusSince(TransactionStatus.BLOQUEE, startOfDay),
                alertRepository.countByDecisionAndAnalystDecisionIsNull(AlertDecision.A_VERIFIER),
                decisions,
                perMinute(now),
                now);
    }

    /** Transactions par minute sur les 15 dernières minutes (minute courante incluse). */
    private List<MinuteBucket> perMinute(LocalDateTime now) {
        LocalDateTime currentMinute = now.truncatedTo(ChronoUnit.MINUTES);
        LocalDateTime firstMinute = currentMinute.minusMinutes(CHART_MINUTES - 1);
        long[] totals = new long[CHART_MINUTES];
        long[] flagged = new long[CHART_MINUTES];

        for (Object[] row : transactionRepository.findCreatedAtAndStatusSince(firstMinute)) {
            LocalDateTime createdAt = (LocalDateTime) row[0];
            int index = (int) ChronoUnit.MINUTES.between(firstMinute, createdAt.truncatedTo(ChronoUnit.MINUTES));
            if (index < 0 || index >= CHART_MINUTES) {
                continue;
            }
            totals[index]++;
            TransactionStatus status = (TransactionStatus) row[1];
            if (status == TransactionStatus.A_VERIFIER || status == TransactionStatus.BLOQUEE) {
                flagged[index]++;
            }
        }

        List<MinuteBucket> buckets = new ArrayList<>(CHART_MINUTES);
        for (int i = 0; i < CHART_MINUTES; i++) {
            buckets.add(new MinuteBucket(firstMinute.plusMinutes(i), totals[i], flagged[i]));
        }
        return buckets;
    }
}
