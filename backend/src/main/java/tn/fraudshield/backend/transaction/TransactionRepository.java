package tn.fraudshield.backend.transaction;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
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

    /** Tableau de bord : nombre de transactions depuis une date. */
    long countByCreatedAtGreaterThanEqual(LocalDateTime from);

    /** Tableau de bord : nombre de transactions par statut depuis une date. */
    @Query("select t.status, count(t) from Transaction t where t.createdAt >= :from group by t.status")
    List<Object[]> countByStatusSince(@Param("from") LocalDateTime from);

    /** Tableau de bord : somme des montants d'un statut depuis une date. */
    @Query("select coalesce(sum(t.amount), 0) from Transaction t where t.status = :status and t.createdAt >= :from")
    BigDecimal sumAmountByStatusSince(@Param("status") TransactionStatus status, @Param("from") LocalDateTime from);

    /** Graphique par minute : date de création et statut des transactions récentes. */
    @Query("select t.createdAt, t.status from Transaction t where t.createdAt >= :from")
    List<Object[]> findCreatedAtAndStatusSince(@Param("from") LocalDateTime from);
}
