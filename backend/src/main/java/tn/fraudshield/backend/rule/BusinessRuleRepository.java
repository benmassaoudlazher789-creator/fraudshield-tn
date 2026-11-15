package tn.fraudshield.backend.rule;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface BusinessRuleRepository extends JpaRepository<BusinessRule, Long> {

    Optional<BusinessRule> findByCode(String code);
}
