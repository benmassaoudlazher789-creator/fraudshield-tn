package tn.fraudshield.backend.common;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/** Erreur métier portant son code HTTP (traduite en JSON par GlobalExceptionHandler). */
@Getter
public class BusinessException extends RuntimeException {

    private final HttpStatus status;

    public BusinessException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    /** Montant demandé supérieur au solde du compte. */
    public static BusinessException insufficientBalance() {
        return new BusinessException(HttpStatus.BAD_REQUEST, "Solde insuffisant pour effectuer ce paiement");
    }

    /** Aucun compte bancaire rattaché à l'utilisateur connecté. */
    public static BusinessException accountNotFound() {
        return new BusinessException(HttpStatus.NOT_FOUND, "Aucun compte bancaire associé à cet utilisateur");
    }
}
