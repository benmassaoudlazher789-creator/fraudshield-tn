package tn.fraudshield.backend.analyst;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;
import tn.fraudshield.backend.analyst.dto.ModelMetrics;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;

/**
 * Lit les métriques du modèle dans le premier emplacement existant de app.ml.metrics-locations
 * (fichier du dossier ml/ monté, ou copie dans les ressources). Le fichier est relu à chaque appel :
 * après un nouvel entraînement, les statistiques sont à jour sans redémarrer le backend.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ModelMetricsProvider {

    private final ResourceLoader resourceLoader;
    private final JsonMapper jsonMapper;

    @Value("${app.ml.metrics-locations}")
    private List<String> locations;

    /** Métriques du modèle, ou null si aucun fichier n'est trouvé ou s'il est illisible. */
    public ModelMetrics load() {
        for (String location : locations) {
            Resource resource = resourceLoader.getResource(location.trim());
            if (!resource.exists()) {
                continue;
            }
            try (InputStream in = resource.getInputStream()) {
                return jsonMapper.readValue(in, ModelMetrics.class);
            } catch (IOException | JacksonException e) {
                log.warn("Métriques du modèle illisibles ({}) : {}", location, e.getMessage());
                return null;
            }
        }
        return null;
    }
}
