package tn.fraudshield.backend.transaction.dto;

import tn.fraudshield.backend.transaction.Transaction;
import tn.fraudshield.backend.transaction.TransactionStatus;
import tn.fraudshield.backend.transaction.TransactionType;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Vue client d'une transaction : le riskScore est volontairement absent. */
public record TransactionResponse(
        Long id,
        String beneficiary,
        BigDecimal amount,
        TransactionType type,
        String country,
        TransactionStatus status,
        LocalDateTime createdAt
) {
    public static TransactionResponse from(Transaction t) {
        return new TransactionResponse(t.getId(), t.getBeneficiary(), t.getAmount(), t.getType(),
                t.getCountry(), t.getStatus(), t.getCreatedAt());
    }
}
