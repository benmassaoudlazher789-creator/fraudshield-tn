package tn.fraudshield.backend.transaction.dto;

import tn.fraudshield.backend.transaction.Transaction;
import tn.fraudshield.backend.transaction.TransactionStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Résumé envoyé sur /topic/transactions pour le graphique temps réel du dashboard. */
public record TransactionNotification(
        Long id,
        BigDecimal amount,
        TransactionStatus status,
        Integer riskScore,
        LocalDateTime createdAt,
        LocalDateTime processedAt
) {
    public static TransactionNotification from(Transaction t) {
        return new TransactionNotification(t.getId(), t.getAmount(), t.getStatus(), t.getRiskScore(),
                t.getCreatedAt(), LocalDateTime.now());
    }
}
