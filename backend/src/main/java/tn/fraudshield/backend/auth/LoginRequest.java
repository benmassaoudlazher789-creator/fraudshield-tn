package tn.fraudshield.backend.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/** Corps de la requête POST /api/auth/login. */
public record LoginRequest(
        @NotBlank @Email String email,
        @NotBlank String password
) {
}
