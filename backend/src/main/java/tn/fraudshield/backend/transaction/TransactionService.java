package tn.fraudshield.backend.transaction;

import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.fraudshield.backend.account.Account;
import tn.fraudshield.backend.account.AccountRepository;
import tn.fraudshield.backend.account.dto.AccountResponse;
import tn.fraudshield.backend.common.BusinessException;
import tn.fraudshield.backend.transaction.dto.CreateTransactionRequest;
import tn.fraudshield.backend.transaction.dto.TransactionEvent;
import tn.fraudshield.backend.transaction.dto.TransactionResponse;
import tn.fraudshield.backend.user.UserRepository;

import java.math.BigDecimal;
import java.util.List;

/** Logique métier côté client : paiements, historique et consultation du compte. */
@Service
@RequiredArgsConstructor
public class TransactionService {

    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;
    private final ApplicationEventPublisher eventPublisher;

    /**
     * Crée un paiement au statut EN_COURS puis déclenche sa publication Kafka
     * (effectuée après le commit par TransactionEventPublisher).
     * Le compte n'est pas débité ici : il le sera après la décision anti-fraude.
     */
    @Transactional
    public TransactionResponse createTransaction(String email, CreateTransactionRequest request) {
        Account account = findAccount(email);
        BigDecimal balance = account.getBalance();

        if (request.amount().compareTo(balance) > 0) {
            throw BusinessException.insufficientBalance();
        }

        Transaction transaction = transactionRepository.save(Transaction.builder()
                .account(account)
                .beneficiary(request.beneficiary().trim())
                .amount(request.amount())
                .type(request.type())
                .country(request.country())
                // Variables PaySim : émetteur = solde avant / après paiement
                .oldBalanceOrig(balance)
                .newBalanceOrig(balance.subtract(request.amount()))
                // Bénéficiaire externe simulé : solde 0 avant, montant reçu après
                .oldBalanceDest(BigDecimal.ZERO)
                .newBalanceDest(request.amount())
                .status(TransactionStatus.EN_COURS)
                .build());

        // Événement Spring : il ne partira dans Kafka qu'après le commit
        eventPublisher.publishEvent(TransactionEvent.from(transaction, account.getId()));

        return TransactionResponse.from(transaction);
    }

    /** Les 10 dernières transactions du client connecté. */
    @Transactional(readOnly = true)
    public List<TransactionResponse> getRecentTransactions(String email) {
        Account account = findAccount(email);
        return transactionRepository.findTop10ByAccountIdOrderByCreatedAtDesc(account.getId()).stream()
                .map(TransactionResponse::from)
                .toList();
    }

    /** Référence, banque et solde du compte du client connecté. */
    @Transactional(readOnly = true)
    public AccountResponse getAccount(String email) {
        return AccountResponse.from(findAccount(email));
    }

    /** Email (sujet du JWT) -> userId -> compte bancaire. */
    private Account findAccount(String email) {
        Long userId = userRepository.findByEmail(email)
                .orElseThrow(BusinessException::accountNotFound)
                .getId();
        return accountRepository.findFirstByUserId(userId)
                .orElseThrow(BusinessException::accountNotFound);
    }
}
