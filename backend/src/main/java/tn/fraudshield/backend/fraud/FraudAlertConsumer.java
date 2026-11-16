package tn.fraudshield.backend.fraud;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;

/**
 * Consomme les transactions scorées par Spark (topic app.kafka.topics.alerts).
 * Aucune exception ne remonte : un message défectueux ne doit pas bloquer la partition.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class FraudAlertConsumer {

    private final JsonMapper jsonMapper;
    private final FraudDecisionService fraudDecisionService;

    @KafkaListener(topics = "${app.kafka.topics.alerts}")
    public void onMessage(String payload) {
        ScoredTransactionMessage message;
        try {
            // Désérialisation JSON manuelle (symétrique du producteur)
            message = jsonMapper.readValue(payload, ScoredTransactionMessage.class);
        } catch (JacksonException e) {
            log.warn("Message Kafka ignoré (JSON invalide) : {}", abbreviate(payload));
            return;
        }

        if (message == null || !message.isValid()) {
            log.warn("Message Kafka ignoré (champs manquants ou score hors 0-100) : {}", abbreviate(payload));
            return;
        }

        try {
            fraudDecisionService.process(message);
        } catch (RuntimeException e) {
            // Erreur inattendue (base indisponible...) : on journalise et on passe au suivant
            log.error("Échec du traitement de la transaction {}", message.transactionId(), e);
        }
    }

    private static String abbreviate(String s) {
        if (s == null) {
            return "null";
        }
        return s.length() > 200 ? s.substring(0, 200) + "..." : s;
    }
}
