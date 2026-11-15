package tn.fraudshield.backend.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import tn.fraudshield.backend.account.Account;
import tn.fraudshield.backend.account.AccountRepository;
import tn.fraudshield.backend.rule.BusinessRule;
import tn.fraudshield.backend.rule.BusinessRuleRepository;
import tn.fraudshield.backend.user.Role;
import tn.fraudshield.backend.user.User;
import tn.fraudshield.backend.user.UserRepository;

import java.math.BigDecimal;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final BusinessRuleRepository businessRuleRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        if (userRepository.count() > 0) {
            log.info("Données de démonstration déjà présentes, initialisation ignorée");
            return;
        }

        userRepository.save(buildUser("Yassine Trabelsi", "admin@fraudshield.tn", "Admin123!", Role.ADMIN));
        userRepository.save(buildUser("Amira Bouazizi", "analyste@fraudshield.tn", "Analyste123!", Role.ANALYSTE));
        User client = userRepository.save(
                buildUser("Karim Ben Salem", "client@fraudshield.tn", "Client123!", Role.CLIENT));

        accountRepository.save(Account.builder()
                .user(client)
                .accountRef("TN5900000000000000004821")
                .bank("Banque Démo")
                .balance(new BigDecimal("28450.000"))
                .build());

        businessRuleRepository.saveAll(List.of(
                buildRule("MAX_AMOUNT_NEW_COUNTRY",
                        "Montant maximal autorisé vers un nouveau pays (TND)", "10000"),
                buildRule("VELOCITY_10_MIN",
                        "Nombre maximal de transactions sur 10 minutes", "5"),
                buildRule("AUTO_BLOCK_SCORE",
                        "Score de risque à partir duquel la transaction est bloquée automatiquement", "80")
        ));

        log.info("Données de démonstration créées");
    }

    private User buildUser(String fullName, String email, String rawPassword, Role role) {
        return User.builder()
                .fullName(fullName)
                .email(email)
                .passwordHash(passwordEncoder.encode(rawPassword))
                .role(role)
                .build();
    }

    private BusinessRule buildRule(String code, String label, String threshold) {
        return BusinessRule.builder()
                .code(code)
                .label(label)
                .threshold(new BigDecimal(threshold))
                .build();
    }
}
