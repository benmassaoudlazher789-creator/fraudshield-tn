package tn.fraudshield.backend.admin;

import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.fraudshield.backend.account.Account;
import tn.fraudshield.backend.account.AccountRepository;
import tn.fraudshield.backend.admin.dto.CreateUserRequest;
import tn.fraudshield.backend.admin.dto.UpdateUserRequest;
import tn.fraudshield.backend.admin.dto.UserResponse;
import tn.fraudshield.backend.analyst.dto.PageResponse;
import tn.fraudshield.backend.common.BusinessException;
import tn.fraudshield.backend.user.Role;
import tn.fraudshield.backend.user.User;
import tn.fraudshield.backend.user.UserRepository;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/** Gestion des comptes utilisateurs par l'administrateur. */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminUserService {

    private static final int MAX_PAGE_SIZE = 100;
    private static final BigDecimal INITIAL_BALANCE = new BigDecimal("10000.000");
    private static final String DEFAULT_BANK = "Banque Démo";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final AccountRepository accountRepository;
    private final PasswordEncoder passwordEncoder;

    /** Liste paginée, plus récents d'abord ; search porte sur le nom et l'e-mail. */
    @Transactional(readOnly = true)
    public PageResponse<UserResponse> listUsers(String search, Role role, Boolean enabled, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(1, Math.min(size, MAX_PAGE_SIZE)),
                Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id")));
        Page<User> users = userRepository.findAll(filter(search, role, enabled), pageable);

        // Comptes bancaires des clients de la page en une seule requête
        List<Long> ids = users.getContent().stream().map(u -> u.getId()).toList();
        Map<Long, String> accountRefs = ids.isEmpty() ? Map.of()
                : accountRepository.findByUserIdIn(ids).stream()
                .collect(Collectors.toMap(a -> a.getUser().getId(), a -> a.getAccountRef(), (a, b) -> a));

        return PageResponse.from(users.map(u -> UserResponse.from(u, accountRefs.get(u.getId()))));
    }

    /** 409 si l'e-mail existe déjà ; un CLIENT reçoit un compte bancaire crédité de 10 000 DT. */
    @Transactional
    public UserResponse createUser(CreateUserRequest request, String adminEmail) {
        String email = normalizeEmail(request.email());
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw emailTaken();
        }

        User user;
        try {
            user = userRepository.saveAndFlush(User.builder()
                    .fullName(request.fullName().trim())
                    .email(email)
                    .passwordHash(passwordEncoder.encode(request.password()))
                    .role(request.role())
                    .build());
        } catch (DataIntegrityViolationException e) {
            // Deux créations simultanées avec le même e-mail : la contrainte UNIQUE tranche
            throw emailTaken();
        }

        String accountRef = request.role() == Role.CLIENT ? createAccount(user).getAccountRef() : null;
        log.info("Utilisateur {} ({}) créé par {}", user.getEmail(), user.getRole(), adminEmail);
        return UserResponse.from(user, accountRef);
    }

    /** Nom et rôle. Un administrateur ne peut pas retirer son propre rôle ADMIN (400). */
    @Transactional
    public UserResponse updateUser(Long id, UpdateUserRequest request, String adminEmail) {
        User user = findUser(id);
        if (isSelf(user, adminEmail) && request.role() != Role.ADMIN) {
            throw new BusinessException(HttpStatus.BAD_REQUEST,
                    "Vous ne pouvez pas retirer votre propre rôle d'administrateur");
        }
        user.setFullName(request.fullName().trim());
        user.setRole(request.role());

        // Devenu client sans compte bancaire : on lui en ouvre un (un ancien compte est conservé)
        Optional<Account> account = accountRepository.findFirstByUserId(user.getId());
        if (account.isEmpty() && request.role() == Role.CLIENT) {
            account = Optional.of(createAccount(user));
        }
        String accountRef = account.map(a -> a.getAccountRef()).orElse(null);

        log.info("Utilisateur {} modifié par {} : rôle {}", user.getEmail(), adminEmail, user.getRole());
        return UserResponse.from(user, accountRef);
    }

    /** Activation / désactivation. Un administrateur ne peut pas se désactiver lui-même (400). */
    @Transactional
    public UserResponse updateStatus(Long id, boolean enabled, String adminEmail) {
        User user = findUser(id);
        if (!enabled && isSelf(user, adminEmail)) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Vous ne pouvez pas désactiver votre propre compte");
        }
        user.setEnabled(enabled);
        log.info("Utilisateur {} {} par {}", user.getEmail(), enabled ? "activé" : "désactivé", adminEmail);
        return UserResponse.from(user,
                accountRepository.findFirstByUserId(user.getId()).map(a -> a.getAccountRef()).orElse(null));
    }

    private Account createAccount(User user) {
        return accountRepository.save(Account.builder()
                .user(user)
                .accountRef(generateAccountRef())
                .bank(DEFAULT_BANK)
                .balance(INITIAL_BALANCE)
                .build());
    }

    /** RIB/IBAN tunisien de démonstration : "TN59" + 20 chiffres, unique en base. */
    private String generateAccountRef() {
        for (int attempt = 0; attempt < 10; attempt++) {
            StringBuilder ref = new StringBuilder("TN59");
            for (int i = 0; i < 20; i++) {
                ref.append(RANDOM.nextInt(10));
            }
            if (!accountRepository.existsByAccountRef(ref.toString())) {
                return ref.toString();
            }
        }
        throw new IllegalStateException("Impossible de générer un numéro de compte unique");
    }

    private static Specification<User> filter(String search, Role role, Boolean enabled) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (search != null && !search.isBlank()) {
                String pattern = "%" + escapeLike(search.trim().toLowerCase(Locale.ROOT)) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("fullName")), pattern, '\\'),
                        cb.like(cb.lower(root.get("email")), pattern, '\\')));
            }
            if (role != null) {
                predicates.add(cb.equal(root.get("role"), role));
            }
            if (enabled != null) {
                predicates.add(cb.equal(root.get("enabled"), enabled));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }

    /** "%" et "_" tapés par l'utilisateur sont cherchés tels quels. */
    private static String escapeLike(String value) {
        return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }

    /** La connexion compare l'e-mail tel quel : on l'enregistre en minuscules, sans espaces. */
    private static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static boolean isSelf(User user, String adminEmail) {
        return user.getEmail().equalsIgnoreCase(adminEmail);
    }

    private User findUser(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "Utilisateur introuvable"));
    }

    private static BusinessException emailTaken() {
        return new BusinessException(HttpStatus.CONFLICT, "Un utilisateur utilise déjà cet e-mail");
    }
}
