package tn.fraudshield.backend.transaction;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import tn.fraudshield.backend.account.Account;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "transactions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    @Column(name = "beneficiary", nullable = false, length = 100)
    private String beneficiary;

    @Column(name = "amount", nullable = false, precision = 15, scale = 3)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 20)
    private TransactionType type;

    @Column(name = "country", nullable = false, length = 2)
    private String country;

    @Column(name = "old_balance_orig", nullable = false, precision = 15, scale = 3)
    private BigDecimal oldBalanceOrig;

    @Column(name = "new_balance_orig", nullable = false, precision = 15, scale = 3)
    private BigDecimal newBalanceOrig;

    @Column(name = "old_balance_dest", nullable = false, precision = 15, scale = 3)
    private BigDecimal oldBalanceDest;

    @Column(name = "new_balance_dest", nullable = false, precision = 15, scale = 3)
    private BigDecimal newBalanceDest;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private TransactionStatus status = TransactionStatus.EN_COURS;

    @Column(name = "risk_score")
    private Integer riskScore;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
