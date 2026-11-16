package tn.fraudshield.backend.account.dto;

import tn.fraudshield.backend.account.Account;

import java.math.BigDecimal;

/** Informations du compte affichées au client. */
public record AccountResponse(String accountRef, String bank, BigDecimal balance) {

    public static AccountResponse from(Account a) {
        return new AccountResponse(a.getAccountRef(), a.getBank(), a.getBalance());
    }
}
