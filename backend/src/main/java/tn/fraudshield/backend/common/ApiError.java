package tn.fraudshield.backend.common;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;
import java.util.Map;

/** Format JSON commun des erreurs renvoyées par l'API. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiError(
        String timestamp,
        int status,
        String error,
        String message,
        String path,
        Map<String, String> fieldErrors   // détail par champ pour les erreurs de validation
) {
    public static ApiError of(int status, String error, String message, String path, Map<String, String> fieldErrors) {
        return new ApiError(Instant.now().toString(), status, error, message, path, fieldErrors);
    }
}
