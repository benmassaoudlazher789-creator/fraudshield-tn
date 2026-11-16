package tn.fraudshield.backend.analyst.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import tn.fraudshield.backend.alert.AnalystDecision;

/** Corps de POST /api/analyst/alerts/{id}/decision. */
public record AnalystDecisionRequest(
        @NotNull AnalystDecision decision,
        @Size(max = 2000) String comment
) {
}
