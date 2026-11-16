package tn.fraudshield.backend.common;

/** Masque un RIB/IBAN pour l'affichage : TN5900000000000000004821 -> "TN59 •••• 4821". */
public final class AccountRefMasker {

    private AccountRefMasker() {
    }

    public static String mask(String accountRef) {
        if (accountRef == null || accountRef.length() < 8) {
            return "••••";
        }
        return accountRef.substring(0, 4) + " •••• " + accountRef.substring(accountRef.length() - 4);
    }
}
