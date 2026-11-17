package tn.fraudshield.backend.admin.dto;

import jakarta.validation.constraints.NotNull;

/** Corps de PATCH /api/admin/users/{id}/status. */
public record UpdateUserStatusRequest(
        @NotNull(message = "Le statut est obligatoire")
        Boolean enabled
) {
}
