package tn.fraudshield.backend.client;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import tn.fraudshield.backend.account.dto.AccountResponse;
import tn.fraudshield.backend.transaction.TransactionService;
import tn.fraudshield.backend.transaction.dto.CreateTransactionRequest;
import tn.fraudshield.backend.transaction.dto.TransactionResponse;

import java.util.List;

/**
 * Espace client (/api/client/** réservé au rôle CLIENT par SecurityConfig).
 * L'utilisateur est identifié par le JWT : principal.getUsername() = email (sujet du token).
 */
@RestController
@RequestMapping("/api/client")
@RequiredArgsConstructor
public class ClientController {

    private final TransactionService transactionService;

    /** Nouveau paiement : 201 Created, statut EN_COURS en attendant le scoring. */
    @PostMapping("/transactions")
    @ResponseStatus(HttpStatus.CREATED)
    public TransactionResponse createTransaction(@AuthenticationPrincipal UserDetails principal,
                                                 @Valid @RequestBody CreateTransactionRequest request) {
        return transactionService.createTransaction(principal.getUsername(), request);
    }

    /** Historique : 10 dernières transactions. */
    @GetMapping("/transactions")
    public List<TransactionResponse> getTransactions(@AuthenticationPrincipal UserDetails principal) {
        return transactionService.getRecentTransactions(principal.getUsername());
    }

    /** Compte bancaire du client. */
    @GetMapping("/account")
    public AccountResponse getAccount(@AuthenticationPrincipal UserDetails principal) {
        return transactionService.getAccount(principal.getUsername());
    }
}
