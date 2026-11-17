package tn.fraudshield.backend.admin.dto;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

/**
 * Corps de PATCH /api/admin/rules/{id}. Un champ absent (null) n'est pas modifié.
 * Les bornes propres à chaque règle (AUTO_BLOCK_SCORE entre 50 et 100...) sont vérifiées par AdminRuleService.
 */
public record UpdateRuleRequest(
        @Positive(message = "Le seuil doit être strictement positif")
        @Digits(integer = 12, fraction = 3, message = "Le seuil accepte au plus 3 décimales")
        BigDecimal threshold,

        Boolean enabled
) {
}
