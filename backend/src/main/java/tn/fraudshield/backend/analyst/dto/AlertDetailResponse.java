package tn.fraudshield.backend.analyst.dto;

import tn.fraudshield.backend.alert.AlertDecision;
import tn.fraudshield.backend.alert.AnalystDecision;
import tn.fraudshield.backend.transaction.TransactionStatus;
import tn.fraudshield.backend.transaction.TransactionType;
import tools.jackson.databind.JsonNode;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/** Détail d'une alerte pour l'écran d'investigation de l'analyste. */
public record AlertDetailResponse(
        Long id,
        Integer score,
        AlertDecision decision,
        String status,
        LocalDateTime createdAt,
        JsonNode reasons,                 // raisons fusionnées MODELE + REGLE
        TransactionInfo transaction,
        ClientInfo client,
        String accountRef,                // masqué
        String bank,
        AnalystDecision analystDecision,
        String analystComment,
        String analystName,
        LocalDateTime decidedAt,
        List<TransactionInfo> recentTransactions
) {

    public record TransactionInfo(Long id, String beneficiary, BigDecimal amount, TransactionType type,
                                  String country, TransactionStatus status, Integer riskScore,
                                  LocalDateTime createdAt) {
    }

    public record ClientInfo(Long id, String fullName, String email) {
    }
}
