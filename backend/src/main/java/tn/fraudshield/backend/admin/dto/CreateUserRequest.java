package tn.fraudshield.backend.admin.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import tn.fraudshield.backend.user.Role;

/** Corps de POST /api/admin/users. */
public record CreateUserRequest(
        @NotBlank(message = "Le nom complet est obligatoire")
        @Size(max = 100, message = "Le nom complet ne doit pas dépasser 100 caractères")
        String fullName,

        @NotBlank(message = "L'e-mail est obligatoire")
        @Email(message = "L'e-mail n'est pas valide")
        @Size(max = 150, message = "L'e-mail ne doit pas dépasser 150 caractères")
        String email,

        // BCrypt ignore tout ce qui dépasse 72 octets
        @NotBlank(message = "Le mot de passe est obligatoire")
        @Size(min = 8, max = 72, message = "Le mot de passe doit contenir entre 8 et 72 caractères")
        String password,

        @NotNull(message = "Le rôle est obligatoire")
        Role role
) {
}
