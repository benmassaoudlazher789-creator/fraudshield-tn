package tn.fraudshield.backend.transaction;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    List<Transaction> findTop10ByAccountIdOrderByCreatedAtDesc(Long accountId);

    /** Verrou en écriture : évite qu'un même message Kafka soit traité deux fois en parallèle. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Transaction> findLockedById(Long id);

    /** Règle MAX_AMOUNT_NEW_COUNTRY : le pays a-t-il déjà été utilisé avec ce statut ? */
    boolean existsByAccountIdAndCountryAndStatus(Long accountId, String country, TransactionStatus status);

    /** Règle VELOCITY_10_MIN : nombre de transactions du compte dans une fenêtre de temps. */
    long countByAccountIdAndCreatedAtBetween(Long accountId, LocalDateTime from, LocalDateTime to);

    /** Historique affiché dans le détail d'une alerte (sans la transaction elle-même). */
    List<Transaction> findTop6ByAccountIdAndIdNotOrderByCreatedAtDesc(Long accountId, Long excludedId);
}
