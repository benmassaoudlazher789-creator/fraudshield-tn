package tn.fraudshield.backend.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import tn.fraudshield.backend.user.Role;

/** Corps de PATCH /api/admin/users/{id}. */
public record UpdateUserRequest(
        @NotBlank(message = "Le nom complet est obligatoire")
        @Size(max = 100, message = "Le nom complet ne doit pas dépasser 100 caractères")
        String fullName,

        @NotNull(message = "Le rôle est obligatoire")
        Role role
) {
}
