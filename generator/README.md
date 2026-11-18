# Générateur de trafic — FraudShield TN

Ce script simule l'activité de plusieurs clients de la banque. Il se connecte à l'API avec les
clients de démonstration et envoie des paiements en continu via `POST /api/client/transactions`.
Les paiements suivent le même chemin que ceux saisis dans l'interface :
Kafka → Spark (XGBoost + SHAP) → règles métier → tableau de bord analyste en temps réel.

## Prérequis

- Le backend doit tourner sur `http://localhost:8081`, avec Kafka et le job Spark démarrés (voir le
  [README principal](../README.md)).
- Python 3.10 ou plus récent, avec `requests`. Le paquet est déjà présent dans `ml/.venv` :

```powershell
# Depuis la racine du projet, avec l'environnement du notebook
ml\.venv\Scripts\python.exe generator\generator.py

# Ou dans un environnement dédié
python -m venv generator\.venv
generator\.venv\Scripts\pip install -r generator\requirements.txt
generator\.venv\Scripts\python generator\generator.py
```

## Clients utilisés

Au démarrage, le backend crée 5 clients supplémentaires (classe `DemoClientsInitializer`). Chacun
n'est créé que si son e-mail n'existe pas encore. Leur mot de passe commun est `Demo123!`.

| Client        | E-mail                 | Solde initial |
|---------------|------------------------|--------------:|
| Sana Hammami  | sana.hammami@demo.tn   | 42 000 DT     |
| Mehdi Jlassi  | mehdi.jlassi@demo.tn   | 18 500 DT     |
| Ines Gharbi   | ines.gharbi@demo.tn    | 9 800 DT      |
| Walid Chebbi  | walid.chebbi@demo.tn   | 125 000 DT    |
| Rania Mejri   | rania.mejri@demo.tn    | 27 300 DT     |

`client@fraudshield.tn` est exclu par défaut, pour garder ce compte libre pendant la démonstration
manuelle. L'option `--include-main-client` l'ajoute aux clients utilisés.

## Options

| Option                  | Défaut                  | Rôle |
|-------------------------|-------------------------|------|
| `--rate`                | `2`                     | Transactions par seconde **au plus** (voir le budget ci-dessous) |
| `--duration`            | jusqu'à Ctrl+C          | Durée de la génération, en secondes |
| `--fraud-ratio`         | `0.05`                  | Part de scénarios suspects, entre 0 et 1 |
| `--api-url`             | `http://localhost:8081` | URL du backend (aussi lue dans la variable `FRAUDSHIELD_API`) |
| `--velocity-limit`      | `5`                     | Seuil de la règle `VELOCITY_10_MIN` à respecter |
| `--include-main-client` | non                     | Utilise aussi `client@fraudshield.tn` |
| `--drain`               | `15`                    | Secondes d'attente des dernières décisions à la fin |
| `--seed`                | aléatoire               | Graine, pour rejouer exactement le même trafic |
| `--quiet`               | non                     | N'affiche que les anomalies, les erreurs et les résumés |
| `--no-color`            | non                     | Désactive les couleurs |

## Transactions générées

**Paiements courants**, tous vers la Tunisie :
- STEG, SONEDE, Ooredoo, Tunisie Telecom et Orange ;
- Monoprix, Carrefour, Géant, Magasin Général, Aziza, Jumia, pharmacie et carburant ;
- loyer et virement à la famille (`TRANSFER`), retraits au DAB (`CASH_OUT`).

Leur montant ne dépasse jamais la moitié du solde.

**Scénarios suspects**, choisis au hasard pour la part donnée par `--fraud-ratio` :

| Scénario | Ce qui est envoyé | Ce qui le détecte | Résultat attendu |
|----------|-------------------|-------------------|------------------|
| Gros transfert vers un nouveau pays (40 %) | `TRANSFER` de plus de 10 000 DT vers TR, AE, NG ou LY, pays jamais utilisés par le trafic normal | Règle `MAX_AMOUNT_NEW_COUNTRY` (score 85) | Bloquée |
| Rafale (30 %) | `velocity-limit + 3` petits paiements en ligne en 2 à 3 secondes, sur le même compte | Règle `VELOCITY_10_MIN` (score 60) | Les premiers acceptés, les suivants à vérifier |
| Schéma PaySim (30 %) | `TRANSFER` ou `CASH_OUT` de la **totalité du solde**, comme les fraudes du jeu PaySim | Modèle XGBoost | Bloquée |

## Budget `VELOCITY_10_MIN`

La règle `VELOCITY_10_MIN` signale toute transaction au-delà de 5 sur un même compte en 10 minutes.
Le générateur ne dépasse jamais ce seuil pour le trafic normal : sinon, presque tous les paiements
courants partiraient en « À vérifier ». Les envois sont étalés sur la fenêtre de 10 minutes, et
`--rate` devient donc un plafond :

> 5 clients × 5 transactions / 10 min ≈ un envoi toutes les 25 s (≈ 0,04 tx/s).

Le générateur affiche ce débit effectif au démarrage. Pour une démonstration plus animée :

1. Dans **Administration → Règles métier**, passer le seuil de `VELOCITY_10_MIN` à 30, par exemple.
2. Lancer `generator.py --velocity-limit 30 --fraud-ratio 0.3`. Le débit atteint alors environ
   un envoi toutes les 4 s, et les rafales comptent 33 paiements.

## Affichage

```
14:02:11  envoyée #412    Sana Hammami       PAYMENT         87,400 DT  TN  Monoprix
14:02:13  envoyée #413    Walid Chebbi       TRANSFER    23 400,000 DT  AE  Investissement crypto  [Gros transfert vers un nouveau pays]
14:02:16  BLOQUÉE    #413 Walid Chebbi       23 400,000 DT  AE  Gros transfert vers un nouveau pays
14:02:26  envoyées 38 | acceptées 31 | à vérifier 3 | bloquées 3 | en cours 1 | erreurs 0   (0.04 tx/s effectives)
```

La décision anti-fraude est asynchrone. Le générateur relit donc toutes les 2 s l'historique de
chaque client (`GET /api/client/transactions`) pour connaître le statut final.

**Bilan final.** À la fin, ou sur Ctrl+C, un tableau par scénario donne les envois et leurs
résultats : acceptées, à vérifier, bloquées, erreurs, et transactions encore en cours.

**Compteurs particuliers :**
- **sans décision** : transaction restée `EN_COURS` plus de 120 s. Le job Spark est probablement
  arrêté.
- **non suivies** : transaction sortie des 10 dernières renvoyées par l'API avant que sa décision
  soit lue. Cela n'arrive qu'avec de très grosses rafales.
- **erreurs** : refus de l'API, par exemple `HTTP 400 : Solde insuffisant`. Un compte vidé par un
  transfert PaySim accepté à tort ne peut plus payer.

Pour remettre les soldes des clients de démo à leur valeur initiale :

```sql
UPDATE accounts SET balance = 42000  WHERE account_ref = 'TN5900000000000000005101';
UPDATE accounts SET balance = 18500  WHERE account_ref = 'TN5900000000000000005102';
UPDATE accounts SET balance = 9800   WHERE account_ref = 'TN5900000000000000005103';
UPDATE accounts SET balance = 125000 WHERE account_ref = 'TN5900000000000000005104';
UPDATE accounts SET balance = 27300  WHERE account_ref = 'TN5900000000000000005105';
```

Ces requêtes s'exécutent avec
`docker exec -it postgres psql -U fraudshield -d fraudshield`.
