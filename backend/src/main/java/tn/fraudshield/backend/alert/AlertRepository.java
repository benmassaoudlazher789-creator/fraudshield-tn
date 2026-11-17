package tn.fraudshield.backend.alert;

import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface AlertRepository extends JpaRepository<Alert, Long> {

    List<Alert> findTop50ByOrderByCreatedAtDesc();

    /** Alertes en attente d'un analyste pour une décision donnée (A_VERIFIER ou BLOQUEE). */
    @EntityGraph(attributePaths = {"transaction", "transaction.account", "transaction.account.user"})
    Page<Alert> findByDecisionAndAnalystDecisionIsNull(AlertDecision decision, Pageable pageable);

    /** Alertes déjà traitées par un analyste. */
    @EntityGraph(attributePaths = {"transaction", "transaction.account", "transaction.account.user"})
    Page<Alert> findByAnalystDecisionIsNotNull(Pageable pageable);

    /** Toutes les alertes (sans filtre de statut). */
    @EntityGraph(attributePaths = {"transaction", "transaction.account", "transaction.account.user"})
    Page<Alert> findAllBy(Pageable pageable);

    /** Tableau de bord : alertes créées depuis une date. */
    long countByCreatedAtGreaterThanEqual(LocalDateTime from);

    /** Tableau de bord : alertes d'une décision encore sans décision d'analyste. */
    long countByDecisionAndAnalystDecisionIsNull(AlertDecision decision);

    /** Statistiques : alertes créées dans [from, to[ (comparaison avec la période précédente). */
    long countByCreatedAtGreaterThanEqualAndCreatedAtLessThan(LocalDateTime from, LocalDateTime to);

    /** Statistiques : [décision analyste, nombre] pour les décisions prises depuis une date. */
    @Query("""
            select a.analystDecision, count(a) from Alert a
            where a.analystDecision is not null and a.decidedAt >= :from
            group by a.analystDecision""")
    List<Object[]> countAnalystDecisionsSince(@Param("from") LocalDateTime from);

    /** Statistiques : délai moyen de traitement, [création, décision] des alertes décidées depuis une date. */
    @Query("select a.createdAt, a.decidedAt from Alert a where a.decidedAt is not null and a.decidedAt >= :from")
    List<Object[]> findCreatedAndDecidedSince(@Param("from") LocalDateTime from);

    /** Verrou en écriture : deux analystes ne peuvent pas décider en même temps. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Alert> findLockedById(Long id);
}
