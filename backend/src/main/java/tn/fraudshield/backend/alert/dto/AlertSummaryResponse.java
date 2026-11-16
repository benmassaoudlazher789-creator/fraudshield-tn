package tn.fraudshield.backend.alert.dto;

import tn.fraudshield.backend.account.Account;
import tn.fraudshield.backend.alert.Alert;
import tn.fraudshield.backend.alert.AlertDecision;
import tn.fraudshield.backend.alert.AnalystDecision;
import tn.fraudshield.backend.common.AccountRefMasker;
import tn.fraudshield.backend.transaction.Transaction;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Ligne de la liste des alertes (API analyste et message WebSocket /topic/alerts). */
public record AlertSummaryResponse(
        Long id,
        Long transactionId,
        LocalDateTime createdAt,
        String clientName,
        String accountRef,
        BigDecimal amount,
        String country,
        Integer score,
        AlertDecision decision,
        String status,                 // A_VERIFIER, BLOQUEE ou TRAITEE
        AnalystDecision analystDecision
) {
    public static AlertSummaryResponse from(Alert alert) {
        Transaction t = alert.getTransaction();
        Account account = t.getAccount();
        String status = alert.getAnalystDecision() != null ? "TRAITEE" : alert.getDecision().name();
        return new AlertSummaryResponse(alert.getId(), t.getId(), alert.getCreatedAt(),
                account.getUser().getFullName(), AccountRefMasker.mask(account.getAccountRef()),
                t.getAmount(), t.getCountry(), alert.getScore(), alert.getDecision(),
                status, alert.getAnalystDecision());
    }
}
