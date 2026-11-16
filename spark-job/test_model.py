"""
Test hors ligne du scoring (sans Spark ni Kafka).
Usage depuis la racine du projet :
    ml\\.venv\\Scripts\\python.exe spark-job\\test_model.py
"""
import json
import os
import sys

import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from scoring import BLOCK_SCORE, REVIEW_SCORE, FraudScorer  # noqa: E402

MODEL_DIR = os.getenv("MODEL_DIR",
                      os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "ml", "models"))

EXAMPLES = [
    # a) Paiement normal : hors domaine d'entraînement -> score 0
    {"name": "a) PAYMENT normal", "transactionId": 1, "accountId": 1, "type": "PAYMENT",
     "amount": 85.2, "oldBalanceOrig": 28450.0, "newBalanceOrig": 28364.8,
     "oldBalanceDest": 0.0, "newBalanceDest": 85.2, "country": "TN", "hour": 14},
    # b) Virement normal de 200 DT, soldes cohérents des deux côtés
    {"name": "b) TRANSFER normal 200 DT", "transactionId": 2, "accountId": 1, "type": "TRANSFER",
     "amount": 200.0, "oldBalanceOrig": 5000.0, "newBalanceOrig": 4800.0,
     "oldBalanceDest": 1000.0, "newBalanceDest": 1200.0, "country": "TN", "hour": 14},
    # c) Fraude typique PaySim : compte vidé, bénéficiaire à 0 avant ET après
    {"name": "c) TRANSFER type fraude PaySim", "transactionId": 3, "accountId": 1, "type": "TRANSFER",
     "amount": 181.0, "oldBalanceOrig": 181.0, "newBalanceOrig": 0.0,
     "oldBalanceDest": 0.0, "newBalanceDest": 0.0, "country": "TN", "hour": 1},
]


def main():
    scorer = FraudScorer(MODEL_DIR)
    print(f"Modèle : {scorer.model_version} | A_VERIFIER >= {REVIEW_SCORE} | BLOQUEE >= {BLOCK_SCORE}\n")

    # Vérification des seuils de décision (bornes 49/50 et 79/80)
    for p in (0.494, 0.495, 0.794, 0.795):
        print(f"   proba {p:.3f} -> {scorer.decide(p)}")
    print()

    events = pd.DataFrame([{k: v for k, v in e.items() if k != "name"} for e in EXAMPLES])
    for example, alert in zip(EXAMPLES, scorer.score(events)):
        print(f"=== {example['name']} ===")
        print(f"score = {alert['score']}  ->  décision = {alert['decision']}")
        for r in alert["reasons"]:
            sign = "+" if r["impact"] > 0 else ""
            print(f"   - {r['label']:<38} valeur = {r['value']:>10}  impact = {sign}{r['impact']}")
        print("JSON :", json.dumps(alert, ensure_ascii=False))
        print()


if __name__ == "__main__":
    main()
