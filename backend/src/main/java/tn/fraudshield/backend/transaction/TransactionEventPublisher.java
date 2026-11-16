package tn.fraudshield.backend.transaction;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import tn.fraudshield.backend.transaction.dto.TransactionEvent;
import tools.jackson.databind.json.JsonMapper;

/**
 * Envoie les TransactionEvent dans Kafka.
 * AFTER_COMMIT : l'événement n'est publié que si la transaction est bien enregistrée en base,
 * ainsi le service de scoring ne reçoit jamais un id qui n'existe pas (rollback).
 */
@Slf4j
@Component
public class TransactionEventPublisher {

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final JsonMapper jsonMapper;
    private final String topic;

    public TransactionEventPublisher(KafkaTemplate<String, String> kafkaTemplate,
                                     JsonMapper jsonMapper,
                                     @Value("${app.kafka.topics.transactions}") String topic) {
        this.kafkaTemplate = kafkaTemplate;
        this.jsonMapper = jsonMapper;
        this.topic = topic;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onTransactionCreated(TransactionEvent event) {
        // Sérialisation JSON manuelle avec le mapper Jackson de Spring
        String payload = jsonMapper.writeValueAsString(event);
        // Clé = accountId : toutes les transactions d'un compte vont dans la même partition (ordre garanti)
        String key = String.valueOf(event.accountId());

        kafkaTemplate.send(topic, key, payload).whenComplete((result, ex) -> {
            if (ex != null) {
                log.error("Échec d'envoi Kafka de la transaction {}", event.transactionId(), ex);
            } else {
                log.info("Transaction {} publiée dans '{}' (partition {}, offset {})",
                        event.transactionId(), topic,
                        result.getRecordMetadata().partition(), result.getRecordMetadata().offset());
            }
        });
    }
}
