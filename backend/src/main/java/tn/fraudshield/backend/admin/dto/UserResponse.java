package tn.fraudshield.backend.admin.dto;

import tn.fraudshield.backend.user.Role;
import tn.fraudshield.backend.user.User;

import java.time.LocalDateTime;

/** Utilisateur vu par l'administrateur (jamais le mot de passe). */
public record UserResponse(
        Long id,
        String fullName,
        String email,
        Role role,
        boolean enabled,
        LocalDateTime createdAt,
        String accountRef          // compte bancaire du client, null pour les autres rôles
) {
    public static UserResponse from(User user, String accountRef) {
        return new UserResponse(user.getId(), user.getFullName(), user.getEmail(), user.getRole(),
                Boolean.TRUE.equals(user.getEnabled()), user.getCreatedAt(), accountRef);
    }
}
