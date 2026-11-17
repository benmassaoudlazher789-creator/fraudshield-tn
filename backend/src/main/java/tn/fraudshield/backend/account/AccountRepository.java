package tn.fraudshield.backend.account;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface AccountRepository extends JpaRepository<Account, Long> {

    Optional<Account> findFirstByUserId(Long userId);

    /** Administration : comptes des utilisateurs d'une page (une seule requête). */
    @EntityGraph(attributePaths = "user")
    List<Account> findByUserIdIn(Collection<Long> userIds);

    /** Génération d'un numéro de compte unique. */
    boolean existsByAccountRef(String accountRef);

    /** Verrou en écriture avant un débit (pas de double débit concurrent). */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Account> findLockedById(Long id);
}
