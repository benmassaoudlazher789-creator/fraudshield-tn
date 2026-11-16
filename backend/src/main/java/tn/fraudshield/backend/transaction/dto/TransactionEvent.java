package tn.fraudshield.backend.transaction.dto;

import tn.fraudshield.backend.transaction.Transaction;
import tn.fraudshield.backend.transaction.TransactionType;

import java.math.BigDecimal;

/**
 * Message publié dans le topic "transactions" pour le service de scoring.
 * Contient les variables utilisées par le modèle XGBoost (PaySim) + l'heure.
 */
public record TransactionEvent(
        Long transactionId,
        Long accountId,
        TransactionType type,
        BigDecimal amount,
        BigDecimal oldBalanceOrig,
        BigDecimal newBalanceOrig,
        BigDecimal oldBalanceDest,
        BigDecimal newBalanceDest,
        String country,
        int hour,          // 0-23, heure de la transaction
        String timestamp   // ISO-8601, ex : 2026-11-16T14:32:05.123
) {
    public static TransactionEvent from(Transaction t, Long accountId) {
        return new TransactionEvent(t.getId(), accountId, t.getType(), t.getAmount(),
                t.getOldBalanceOrig(), t.getNewBalanceOrig(), t.getOldBalanceDest(), t.getNewBalanceDest(),
                t.getCountry(), t.getCreatedAt().getHour(), t.getCreatedAt().toString());
    }
}
