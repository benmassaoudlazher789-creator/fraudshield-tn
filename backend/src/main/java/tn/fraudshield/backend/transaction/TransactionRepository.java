package tn.fraudshield.backend.transaction;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    List<Transaction> findTop10ByAccountIdOrderByCreatedAtDesc(Long accountId);
}
