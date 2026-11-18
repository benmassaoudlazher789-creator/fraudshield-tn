package tn.fraudshield.backend.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import tn.fraudshield.backend.account.Account;
import tn.fraudshield.backend.account.AccountRepository;
import tn.fraudshield.backend.user.Role;
import tn.fraudshield.backend.user.User;
import tn.fraudshield.backend.user.UserRepository;

import java.math.BigDecimal;
import java.util.List;

/**
 * Clients de démonstration supplémentaires utilisés par le générateur de trafic (generator/).
 * Chaque client n'est créé que si son e-mail n'existe pas encore : sans effet aux démarrages suivants,
 * et un client modifié ou désactivé dans l'administration n'est pas recréé.
 *
 * Fait en Java plutôt qu'en migration Flyway : le mot de passe doit être haché avec le
 * PasswordEncoder BCrypt de l'application, et une migration exécutée avant DataInitializer
 * l'aurait empêché de créer les comptes de base (il ne s'exécute que sur une base vide).
 */
@Slf4j
@Component
@Order(2)
@RequiredArgsConstructor
public class DemoClientsInitializer implements CommandLineRunner {

    /** Mot de passe commun aux clients de démo (repris par generator/generator.py). */
    static final String DEMO_PASSWORD = "Demo123!";

    private record DemoClient(String fullName, String email, String accountRef, String balance) {
    }

    private static final List<DemoClient> CLIENTS = List.of(
            new DemoClient("Sana Hammami", "sana.hammami@demo.tn", "TN5900000000000000005101", "42000.000"),
            new DemoClient("Mehdi Jlassi", "mehdi.jlassi@demo.tn", "TN5900000000000000005102", "18500.000"),
            new DemoClient("Ines Gharbi", "ines.gharbi@demo.tn", "TN5900000000000000005103", "9800.000"),
            new DemoClient("Walid Chebbi", "walid.chebbi@demo.tn", "TN5900000000000000005104", "125000.000"),
            new DemoClient("Rania Mejri", "rania.mejri@demo.tn", "TN5900000000000000005105", "27300.000"));

    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        int created = 0;
        for (DemoClient c : CLIENTS) {
            if (userRepository.existsByEmailIgnoreCase(c.email())) {
                continue;
            }
            if (accountRepository.existsByAccountRef(c.accountRef())) {
                log.warn("Client de démo {} ignoré : le compte {} existe déjà", c.email(), c.accountRef());
                continue;
            }
            User user = userRepository.save(User.builder()
                    .fullName(c.fullName())
                    .email(c.email())
                    .passwordHash(passwordEncoder.encode(DEMO_PASSWORD))
                    .role(Role.CLIENT)
                    .build());
            accountRepository.save(Account.builder()
                    .user(user)
                    .accountRef(c.accountRef())
                    .bank("Banque Démo")
                    .balance(new BigDecimal(c.balance()))
                    .build());
            created++;
        }
        if (created > 0) {
            log.info("{} client(s) de démonstration créé(s) pour le générateur de trafic", created);
        }
    }
}
