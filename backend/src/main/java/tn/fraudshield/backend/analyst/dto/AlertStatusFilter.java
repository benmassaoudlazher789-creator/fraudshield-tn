package tn.fraudshield.backend.analyst.dto;

/** Filtre de la liste des alertes : en attente (par décision) ou déjà traitée. */
public enum AlertStatusFilter {
    A_VERIFIER,
    BLOQUEE,
    TRAITEE
}
