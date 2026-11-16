package tn.fraudshield.backend.account;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

/** Débit d'un compte après validation d'une transaction (moteur anti-fraude ou analyste). */
@Service
@RequiredArgsConstructor
public class AccountDebitService {

    private final AccountRepository accountRepository;

    /**
     * Débite le compte si le solde suffit encore (il a pu baisser depuis la création du paiement).
     * Doit être appelé dans une transaction existante : le compte est verrouillé jusqu'au commit.
     * @return false si le solde est insuffisant (aucun débit)
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public boolean debitIfSufficient(Long accountId, BigDecimal amount) {
        Account account = accountRepository.findLockedById(accountId).orElseThrow();
        if (account.getBalance().compareTo(amount) < 0) {
            return false;
        }
        account.setBalance(account.getBalance().subtract(amount));
        return true;
    }
}
