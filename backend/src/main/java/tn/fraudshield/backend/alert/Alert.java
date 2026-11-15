package tn.fraudshield.backend.alert;

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
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import tn.fraudshield.backend.transaction.Transaction;
import tn.fraudshield.backend.user.User;

import java.time.LocalDateTime;

@Entity
@Table(name = "alerts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Alert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "transaction_id", nullable = false, unique = true)
    private Transaction transaction;

    @Column(name = "score", nullable = false)
    private Integer score;

    @Enumerated(EnumType.STRING)
    @Column(name = "decision", nullable = false, length = 20)
    private AlertDecision decision;

    /** Explications SHAP au format JSON. */
    @Column(name = "reasons", columnDefinition = "text")
    private String reasons;

    @Enumerated(EnumType.STRING)
    @Column(name = "analyst_decision", length = 20)
    private AnalystDecision analystDecision;

    @Column(name = "analyst_comment", columnDefinition = "text")
    private String analystComment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "analyst_id")
    private User analyst;

    @Column(name = "decided_at")
    private LocalDateTime decidedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
