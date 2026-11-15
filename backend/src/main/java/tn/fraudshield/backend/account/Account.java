package tn.fraudshield.backend.account;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import tn.fraudshield.backend.user.User;

import java.math.BigDecimal;

@Entity
@Table(name = "accounts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Account {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "account_ref", nullable = false, unique = true, length = 34)
    private String accountRef;

    @Column(name = "bank", nullable = false, length = 50)
    private String bank;

    @Builder.Default
    @Column(name = "balance", nullable = false, precision = 15, scale = 3)
    private BigDecimal balance = BigDecimal.ZERO;
}
