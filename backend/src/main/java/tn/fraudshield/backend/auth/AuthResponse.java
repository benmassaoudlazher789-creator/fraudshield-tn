package tn.fraudshield.backend.auth;

/**
 * Réponse renvoyée après connexion (avec le token) et par /api/auth/me
 * (dans ce cas token = null, le client possède déjà le sien).
 */
public record AuthResponse(
        String token,
        Long userId,
        String fullName,
        String email,
        String role
) {
}
