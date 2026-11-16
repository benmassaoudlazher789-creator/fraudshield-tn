package tn.fraudshield.backend.transaction.dto;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import tn.fraudshield.backend.transaction.TransactionType;

import java.math.BigDecimal;

/** Corps de POST /api/client/transactions. */
public record CreateTransactionRequest(
        @NotBlank @Size(max = 100) String beneficiary,
        // NUMERIC(15,3) en base : 12 chiffres avant la virgule, 3 après (millimes)
        @NotNull @Positive @Digits(integer = 12, fraction = 3) BigDecimal amount,
        @NotNull TransactionType type,
        @NotBlank @Pattern(regexp = "^[A-Z]{2}$", message = "doit être un code pays ISO à 2 lettres majuscules (ex : TN)")
        String country
) {
}
