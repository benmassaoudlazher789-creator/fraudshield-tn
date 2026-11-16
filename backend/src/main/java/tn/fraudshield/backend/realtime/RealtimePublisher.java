package tn.fraudshield.backend.realtime;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Pousse les mises à jour vers le dashboard via STOMP.
 * AFTER_COMMIT : on n'annonce jamais un état qui serait ensuite annulé par un rollback.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RealtimePublisher {

    public static final String TOPIC_ALERTS = "/topic/alerts";
    public static final String TOPIC_TRANSACTIONS = "/topic/transactions";

    private final SimpMessagingTemplate messagingTemplate;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onRealtimeEvent(RealtimeEvent event) {
        try {
            if (event.transaction() != null) {
                messagingTemplate.convertAndSend(TOPIC_TRANSACTIONS, event.transaction());
            }
            if (event.alert() != null) {
                messagingTemplate.convertAndSend(TOPIC_ALERTS, event.alert());
            }
        } catch (RuntimeException e) {
            // Le WebSocket est "best effort" : la base est déjà à jour
            log.warn("Échec de diffusion WebSocket : {}", e.getMessage());
        }
    }
}
