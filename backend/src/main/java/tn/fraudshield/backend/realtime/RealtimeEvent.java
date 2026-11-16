package tn.fraudshield.backend.realtime;

import tn.fraudshield.backend.alert.dto.AlertSummaryResponse;
import tn.fraudshield.backend.transaction.dto.TransactionNotification;

/**
 * Événement Spring interne : messages à pousser en WebSocket après le commit.
 * Les DTO sont construits dans la transaction (relations LAZY encore accessibles).
 * alert est null quand aucune alerte n'est concernée.
 */
public record RealtimeEvent(TransactionNotification transaction, AlertSummaryResponse alert) {
}
