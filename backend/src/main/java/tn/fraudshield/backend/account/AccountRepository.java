package tn.fraudshield.backend.account;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

import java.util.Optional;

public interface AccountRepository extends JpaRepository<Account, Long> {

    Optional<Account> findFirstByUserId(Long userId);

    /** Verrou en écriture avant un débit (pas de double débit concurrent). */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Account> findLockedById(Long id);
}
