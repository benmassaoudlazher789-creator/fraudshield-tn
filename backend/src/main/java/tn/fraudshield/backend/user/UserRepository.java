package tn.fraudshield.backend.user;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

/** JpaSpecificationExecutor : recherche multicritère de l'administration (nom/e-mail, rôle, statut). */
public interface UserRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    /** Création par l'administrateur : unicité de l'e-mail sans tenir compte de la casse. */
    boolean existsByEmailIgnoreCase(String email);
}
