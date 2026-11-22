package tn.fraudshield.backend.transaction;

import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collection;
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

    /** Tableau de bord (tendance vs la veille) : nombre de transactions créées dans [from, to[. */
    long countByCreatedAtGreaterThanEqualAndCreatedAtLessThan(LocalDateTime from, LocalDateTime to);

    /** Tableau de bord (tendance vs la veille) : somme des montants d'un statut dans [from, to[. */
    @Query("""
            select coalesce(sum(t.amount), 0) from Transaction t
            where t.status = :status and t.createdAt >= :from and t.createdAt < :to""")
    BigDecimal sumAmountByStatusBetween(@Param("status") TransactionStatus status,
                                        @Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    /** Graphique par minute : date de création et statut des transactions récentes. */
    @Query("select t.createdAt, t.status from Transaction t where t.createdAt >= :from")
    List<Object[]> findCreatedAtAndStatusSince(@Param("from") LocalDateTime from);

    /** Statistiques : date de création et statut des transactions de ces statuts depuis une date. */
    @Query("select t.createdAt, t.status from Transaction t where t.status in :statuses and t.createdAt >= :from")
    List<Object[]> findCreatedAtAndStatusByStatusInSince(@Param("statuses") Collection<TransactionStatus> statuses,
                                                         @Param("from") LocalDateTime from);

    /** Statistiques : [type, nombre, somme des montants] par type de transaction. */
    @Query("""
            select t.type, count(t), coalesce(sum(t.amount), 0) from Transaction t
            where t.status in :statuses and t.createdAt >= :from
            group by t.type""")
    List<Object[]> countAndSumByTypeSince(@Param("statuses") Collection<TransactionStatus> statuses,
                                         @Param("from") LocalDateTime from);

    /** Statistiques : [pays, nombre, somme des montants], du pays le plus fréquent au moins fréquent. */
    @Query("""
            select t.country, count(t), coalesce(sum(t.amount), 0) from Transaction t
            where t.status = :status and t.createdAt >= :from
            group by t.country
            order by count(t) desc, t.country""")
    List<Object[]> countAndSumByCountrySince(@Param("status") TransactionStatus status,
                                             @Param("from") LocalDateTime from, Pageable pageable);
}
