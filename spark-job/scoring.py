"""
Logique de scoring partagée par le job Spark (fraud_stream.py) et le test hors ligne (test_model.py).
Aucune dépendance à Spark ici : uniquement pandas, xgboost et shap.
"""
import hashlib
import json
import math
import os
from datetime import datetime, timezone

import numpy as np
import pandas as pd
import shap
from xgboost import XGBClassifier

# Seuils de décision (score sur 100) : >= 80 bloquée, >= 50 à vérifier par un analyste
BLOCK_SCORE = int(os.getenv("BLOCK_SCORE", "80"))
REVIEW_SCORE = int(os.getenv("REVIEW_SCORE", "50"))
# Types vus à l'entraînement (PaySim : TRANSFER et CASH_OUT uniquement)
SCORED_TYPES = {"TRANSFER", "CASH_OUT"}
TOP_REASONS = 3

# Libellés français affichés à l'analyste
FEATURE_LABELS = {
    "is_transfer": "Type d'opération (virement)",
    "amount": "Montant de la transaction",
    "old_balance_orig": "Solde émetteur avant l'opération",
    "new_balance_orig": "Solde émetteur après l'opération",
    "old_balance_dest": "Solde bénéficiaire avant l'opération",
    "new_balance_dest": "Solde bénéficiaire après l'opération",
    "error_balance_orig": "Écart sur le solde émetteur",
    "error_balance_dest": "Écart sur le solde bénéficiaire",
    "hour": "Heure de la transaction",
}


def build_features(events: pd.DataFrame) -> pd.DataFrame:
    """Reprend exactement build_features() du notebook 02_entrainement,
    à partir des noms de champs du TransactionEvent Spring Boot."""
    d = events
    X = pd.DataFrame(index=d.index)
    X["is_transfer"] = (d["type"] == "TRANSFER").astype(int)
    X["amount"] = d["amount"].astype(float)
    X["old_balance_orig"] = d["oldBalanceOrig"].astype(float)
    X["new_balance_orig"] = d["newBalanceOrig"].astype(float)
    X["old_balance_dest"] = d["oldBalanceDest"].astype(float)
    X["new_balance_dest"] = d["newBalanceDest"].astype(float)
    # Écart entre le solde attendu et le solde réel
    X["error_balance_orig"] = X["new_balance_orig"] + X["amount"] - X["old_balance_orig"]
    X["error_balance_dest"] = X["old_balance_dest"] + X["amount"] - X["new_balance_dest"]
    # Notebook : step % 24 ; ici l'heure (0-23) est fournie directement par le backend
    X["hour"] = d["hour"].astype(int) % 24
    return X


class FraudScorer:
    """Modèle XGBoost + explainer SHAP, chargés une seule fois."""

    def __init__(self, model_dir: str):
        model_path = os.path.join(model_dir, "xgb_fraud.json")
        with open(os.path.join(model_dir, "model_meta.json"), encoding="utf-8") as f:
            meta = json.load(f)
        self.features = meta["features"]
        self.threshold = float(meta["threshold"])

        self.model = XGBClassifier()
        self.model.load_model(model_path)
        self.explainer = shap.TreeExplainer(self.model)

        # Version = empreinte du fichier modèle : on sait quel modèle a produit chaque score
        with open(model_path, "rb") as f:
            self.model_version = "xgb_fraud@" + hashlib.sha256(f.read()).hexdigest()[:12]

    def decide(self, proba: float) -> tuple[int, str]:
        """Score 0-100 et décision : >= 80 BLOQUEE, >= 50 A_VERIFIER, sinon ACCEPTEE.
        (Le seuil F1 de model_meta.json, 0.984, est conservé pour information seulement :
        supérieur à 0.80, il rendait A_VERIFIER inatteignable.)"""
        score = int(math.floor(proba * 100 + 0.5))   # arrondi classique (pas l'arrondi bancaire)
        score = max(0, min(100, score))
        if score >= BLOCK_SCORE:
            return score, "BLOQUEE"
        if score >= REVIEW_SCORE:
            return score, "A_VERIFIER"
        return score, "ACCEPTEE"

    def score(self, events: pd.DataFrame) -> list[dict]:
        """Score un lot d'événements et renvoie un message d'alerte par transaction."""
        scored_at = datetime.now(timezone.utc).isoformat(timespec="milliseconds")
        results = {}

        # PAYMENT (ou type inconnu) : hors domaine d'entraînement -> accepté, score 0
        in_domain = events["type"].isin(SCORED_TYPES)
        for idx in events.index[~in_domain]:
            results[idx] = (0, "ACCEPTEE", [])

        if in_domain.any():
            sub = events[in_domain]
            X = build_features(sub)[self.features]
            probas = self.model.predict_proba(X)[:, 1]
            shap_values = np.asarray(self.explainer.shap_values(X))

            for i, idx in enumerate(sub.index):
                score, decision = self.decide(float(probas[i]))
                # 3 variables avec le plus fort impact absolu (en log-odds)
                top = np.argsort(-np.abs(shap_values[i]))[:TOP_REASONS]
                reasons = [{
                    "feature": self.features[j],
                    "label": FEATURE_LABELS.get(self.features[j], self.features[j]),
                    "value": round(float(X.iloc[i, j]), 3),
                    "impact": round(float(shap_values[i, j]), 4),   # > 0 : augmente le risque
                } for j in top]
                results[idx] = (score, decision, reasons)

        alerts = []
        for idx, row in events.iterrows():
            score, decision, reasons = results[idx]
            alerts.append({
                "transactionId": int(row["transactionId"]),
                "accountId": int(row["accountId"]) if pd.notna(row["accountId"]) else None,
                "score": score,
                "decision": decision,
                "reasons": reasons,
                "modelVersion": self.model_version,
                "scoredAt": scored_at,
            })
        return alerts
