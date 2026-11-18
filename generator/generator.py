"""
FraudShield TN - générateur de trafic de démonstration.

Se connecte à l'API avec les clients de démo et envoie en continu des paiements via
POST /api/client/transactions : surtout des paiements courants en Tunisie, plus une part
de transactions suspectes (gros transfert vers un nouveau pays, rafale, schéma PaySim).
La décision anti-fraude étant asynchrone (Kafka -> Spark -> backend), le statut final
de chaque transaction est relu régulièrement via GET /api/client/transactions.

Exemples :
    python generator.py                          # 2 tx/s max, 5 % de suspectes, jusqu'à Ctrl+C
    python generator.py --duration 300 --fraud-ratio 0.3
"""
from __future__ import annotations

import argparse
import os
import random
import sys
import time
from collections import Counter, deque
from dataclasses import dataclass, field
from datetime import datetime
from decimal import ROUND_DOWN, Decimal

import requests

# --------------------------------------------------------------------------------------
# Configuration
# --------------------------------------------------------------------------------------

DEFAULT_API = os.getenv("FRAUDSHIELD_API", "http://localhost:8081")

# Clients créés par DemoClientsInitializer (backend) : mot de passe commun Demo123!
DEMO_CLIENTS = [
    ("sana.hammami@demo.tn", "Demo123!"),
    ("mehdi.jlassi@demo.tn", "Demo123!"),
    ("ines.gharbi@demo.tn", "Demo123!"),
    ("walid.chebbi@demo.tn", "Demo123!"),
    ("rania.mejri@demo.tn", "Demo123!"),
]
# Client principal de la démo manuelle : exclu par défaut pour ne pas consommer son budget
MAIN_CLIENT = ("client@fraudshield.tn", "Client123!")

# Règle VELOCITY_10_MIN : la 6e transaction d'un compte en 10 minutes est signalée.
VELOCITY_WINDOW_S = 10 * 60
VELOCITY_MARGIN_S = 30          # marge (horloges, latence) avant de réutiliser le budget
NEW_COUNTRY_THRESHOLD = 10_000  # règle MAX_AMOUNT_NEW_COUNTRY (DT)

POLL_INTERVAL_S = 2.0           # relecture des statuts
STATS_INTERVAL_S = 15.0         # résumé périodique
DECISION_TIMEOUT_S = 120.0      # au-delà : transaction considérée sans décision (EN_COURS)

# Paiements courants : (bénéficiaire, type, montant min, montant max, pays)
NORMAL_PAYMENTS = [
    ("STEG - Facture électricité", "PAYMENT", 35, 220, "TN"),
    ("SONEDE - Facture eau", "PAYMENT", 15, 90, "TN"),
    ("Monoprix", "PAYMENT", 12, 260, "TN"),
    ("Carrefour La Marsa", "PAYMENT", 25, 420, "TN"),
    ("Géant Tunis City", "PAYMENT", 30, 380, "TN"),
    ("Magasin Général", "PAYMENT", 10, 150, "TN"),
    ("Aziza", "PAYMENT", 5, 60, "TN"),
    ("Ooredoo - Recharge", "PAYMENT", 5, 50, "TN"),
    ("Tunisie Telecom - Facture", "PAYMENT", 20, 95, "TN"),
    ("Orange Tunisie - Internet", "PAYMENT", 39, 89, "TN"),
    ("Pharmacie Centrale", "PAYMENT", 8, 140, "TN"),
    ("Station Shell", "PAYMENT", 30, 120, "TN"),
    ("Jumia Tunisie", "PAYMENT", 25, 600, "TN"),
    ("Loyer appartement", "TRANSFER", 450, 1200, "TN"),
    ("Virement famille", "TRANSFER", 100, 800, "TN"),
    ("Retrait DAB", "CASH_OUT", 50, 400, "TN"),
]
# Pays jamais utilisés par le trafic normal : un gros montant y est toujours "nouveau pays"
SUSPICIOUS_COUNTRIES = ["TR", "AE", "NG", "LY"]

SCENARIO_LABELS = {
    "normal": "Paiement courant",
    "new_country": "Gros transfert vers un nouveau pays",
    "burst": "Rafale de transactions",
    "paysim": "Schéma PaySim (totalité du solde)",
}
# Répartition des scénarios suspects
SUSPICIOUS_WEIGHTS = {"new_country": 0.4, "burst": 0.3, "paysim": 0.3}

FINAL_STATUSES = {"ACCEPTEE", "A_VERIFIER", "BLOQUEE"}


# --------------------------------------------------------------------------------------
# Affichage console
# --------------------------------------------------------------------------------------

class Console:
    COLORS = {"green": "32", "yellow": "33", "red": "31", "cyan": "36", "grey": "90", "bold": "1"}

    def __init__(self, color: bool, quiet: bool):
        self.color = color
        self.quiet = quiet
        if color and os.name == "nt":
            os.system("")   # active les séquences ANSI dans la console Windows

    def c(self, text: str, color: str) -> str:
        return f"\033[{self.COLORS[color]}m{text}\033[0m" if self.color else text

    def line(self, text: str, force: bool = False) -> None:
        if force or not self.quiet:
            print(f"{self.c(datetime.now().strftime('%H:%M:%S'), 'grey')}  {text}", flush=True)

    def status(self, status: str) -> str:
        return {
            "ACCEPTEE": self.c("ACCEPTÉE  ", "green"),
            "A_VERIFIER": self.c("À VÉRIFIER", "yellow"),
            "BLOQUEE": self.c("BLOQUÉE   ", "red"),
        }.get(status, status)


def fmt_amount(amount: Decimal) -> str:
    return f"{amount:,.3f}".replace(",", " ").replace(".", ",") + " DT"


# --------------------------------------------------------------------------------------
# Client API
# --------------------------------------------------------------------------------------

class ApiError(Exception):
    def __init__(self, status: int | None, message: str):
        super().__init__(message)
        self.status = status
        self.message = message


@dataclass
class DemoClient:
    email: str
    password: str
    session: requests.Session = field(default_factory=requests.Session)
    name: str = ""
    balance: Decimal = Decimal("0")
    sent_at: deque = field(default_factory=deque)   # dates d'envoi (budget VELOCITY_10_MIN)

    @property
    def short(self) -> str:
        return self.name or self.email


class Api:
    def __init__(self, base_url: str, timeout: float = 10.0):
        self.base = base_url.rstrip("/")
        self.timeout = timeout

    def _request(self, client: DemoClient, method: str, path: str, retry: bool = True, **kwargs):
        try:
            r = client.session.request(method, self.base + path, timeout=self.timeout, **kwargs)
        except requests.RequestException as e:
            raise ApiError(None, f"API injoignable ({e.__class__.__name__})") from e
        if r.status_code == 401 and retry:
            self.login(client)                          # token expiré : nouvelle connexion
            return self._request(client, method, path, retry=False, **kwargs)
        if r.status_code >= 400:
            try:
                message = r.json().get("message") or r.reason
            except ValueError:
                message = r.reason
            raise ApiError(r.status_code, f"HTTP {r.status_code} : {message}")
        return r.json() if r.content else None

    def login(self, client: DemoClient) -> None:
        client.session.headers.pop("Authorization", None)
        try:
            r = client.session.post(self.base + "/api/auth/login", timeout=self.timeout,
                                    json={"email": client.email, "password": client.password})
        except requests.RequestException as e:
            raise ApiError(None, f"API injoignable ({e.__class__.__name__})") from e
        if r.status_code != 200:
            raise ApiError(r.status_code, f"connexion refusée (HTTP {r.status_code})")
        body = r.json()
        if body.get("role") != "CLIENT":
            raise ApiError(403, f"{client.email} n'est pas un client (rôle {body.get('role')})")
        client.session.headers["Authorization"] = f"Bearer {body['token']}"
        client.name = body.get("fullName") or client.email

    def refresh_balance(self, client: DemoClient) -> Decimal:
        account = self._request(client, "GET", "/api/client/account")
        client.balance = Decimal(str(account["balance"]))
        return client.balance

    def pay(self, client: DemoClient, beneficiary: str, amount: Decimal, tx_type: str, country: str) -> dict:
        return self._request(client, "POST", "/api/client/transactions", json={
            "beneficiary": beneficiary,
            "amount": str(amount),
            "type": tx_type,
            "country": country,
        })

    def recent(self, client: DemoClient) -> list[dict]:
        return self._request(client, "GET", "/api/client/transactions")


# --------------------------------------------------------------------------------------
# Générateur
# --------------------------------------------------------------------------------------

@dataclass
class Pending:
    client: DemoClient
    scenario: str
    beneficiary: str
    amount: Decimal
    country: str
    sent: float


class Generator:
    def __init__(self, args: argparse.Namespace, console: Console):
        self.args = args
        self.out = console
        self.api = Api(args.api_url)
        self.rng = random.Random(args.seed)
        self.clients: list[DemoClient] = []
        self.pending: dict[int, Pending] = {}
        self.counts = Counter()                      # envoyées, statuts, erreurs...
        self.by_scenario: dict[str, Counter] = {s: Counter() for s in SCENARIO_LABELS}
        self.throttled_ticks = 0
        self.started = time.monotonic()
        self.next_poll = self.started

    # ---------- connexion ----------

    def connect(self) -> None:
        accounts = DEMO_CLIENTS + ([MAIN_CLIENT] if self.args.include_main_client else [])
        for email, password in accounts:
            client = DemoClient(email, password)
            try:
                self.api.login(client)
                self.api.refresh_balance(client)
            except ApiError as e:
                if e.status is None:
                    sys.exit(f"Erreur : {e.message} sur {self.args.api_url}. Le backend est-il démarré ?")
                self.out.line(self.out.c(f"Client ignoré {email} : {e.message}", "yellow"), force=True)
                continue
            self.clients.append(client)
            self.out.line(f"Connecté : {client.short:<18} {email:<24} solde {fmt_amount(client.balance)}",
                          force=True)
        if not self.clients:
            sys.exit("Erreur : aucun client de démo n'a pu se connecter "
                     "(redémarrez le backend pour créer les clients de DemoClientsInitializer).")

    # ---------- budget VELOCITY_10_MIN ----------

    def _recent_count(self, client: DemoClient, now: float) -> int:
        window = VELOCITY_WINDOW_S + VELOCITY_MARGIN_S
        while client.sent_at and now - client.sent_at[0] > window:
            client.sent_at.popleft()
        return len(client.sent_at)

    def _clients_with_budget(self, now: float) -> list[DemoClient]:
        return [c for c in self.clients if self._recent_count(c, now) < self.args.velocity_limit]

    # ---------- envoi ----------

    def _send(self, client: DemoClient, scenario: str, beneficiary: str, amount: Decimal,
              tx_type: str, country: str) -> bool:
        amount = amount.quantize(Decimal("0.001"), rounding=ROUND_DOWN)
        stats = self.by_scenario[scenario]
        client.sent_at.append(time.monotonic())
        try:
            tx = self.api.pay(client, beneficiary, amount, tx_type, country)
        except ApiError as e:
            client.sent_at.pop()                        # refusée : aucune transaction créée en base
            self.counts["erreurs"] += 1
            stats["erreurs"] += 1
            self.out.line(f"{self.out.c('ERREUR    ', 'red')} {client.short:<18} {beneficiary} "
                          f"{fmt_amount(amount)} -> {e.message}", force=True)
            if e.status == 400 and "Solde" in e.message:
                self._safe_refresh(client)
            return False

        self.counts["envoyées"] += 1
        stats["envoyées"] += 1
        self.pending[tx["id"]] = Pending(client, scenario, beneficiary, amount, country, time.monotonic())
        tag = "" if scenario == "normal" else self.out.c(f"  [{SCENARIO_LABELS[scenario]}]", "cyan")
        self.out.line(f"envoyée #{tx['id']:<6} {client.short:<18} {tx_type:<8} {fmt_amount(amount):>16}  "
                      f"{country}  {beneficiary}{tag}")
        return True

    def _safe_refresh(self, client: DemoClient) -> None:
        try:
            self.api.refresh_balance(client)
        except ApiError:
            pass

    def send_normal(self, candidates: list[DemoClient]) -> None:
        client = self.rng.choice(candidates)
        beneficiary, tx_type, lo, hi, country = self.rng.choice(NORMAL_PAYMENTS)
        amount = Decimal(str(round(self.rng.uniform(lo, hi), self.rng.choice([0, 1, 3]))))
        # Jamais la totalité du solde : ce serait le schéma PaySim
        if amount >= client.balance * Decimal("0.5"):
            self._safe_refresh(client)
            if amount >= client.balance * Decimal("0.5"):
                self.throttled_ticks += 1
                return
        if self._send(client, "normal", beneficiary, amount, tx_type, country):
            # Estimation locale : le débit réel n'a lieu qu'après la décision
            client.balance -= amount

    def send_new_country(self) -> None:
        # Montant > seuil mais loin du solde (sinon c'est le schéma PaySim qui serait testé)
        eligible = [c for c in self.clients if c.balance > Decimal(NEW_COUNTRY_THRESHOLD) * Decimal("1.6")]
        if not eligible:
            return self.send_paysim()
        client = self.rng.choice(eligible)
        top = min(float(client.balance) * 0.7, 45_000.0)
        amount = Decimal(str(round(self.rng.uniform(NEW_COUNTRY_THRESHOLD * 1.05, top), -2)))
        country = self.rng.choice(SUSPICIOUS_COUNTRIES)
        beneficiary = self.rng.choice(["Virement international", "Société import-export",
                                       "Bénéficiaire inconnu", "Investissement crypto"])
        self._send(client, "new_country", beneficiary, amount, "TRANSFER", country)

    def send_burst(self) -> None:
        client = self.rng.choice(self.clients)
        size = self.args.velocity_limit + 3
        self.out.line(self.out.c(f"Rafale : {size} paiements en quelques secondes pour {client.short}", "cyan"))
        merchant = self.rng.choice(["Paiement en ligne", "Boutique web", "Recharge carte cadeau"])
        for i in range(size):
            amount = Decimal(str(round(self.rng.uniform(15, 95), 3)))
            if not self._send(client, "burst", f"{merchant} #{self.rng.randint(1000, 9999)}",
                              amount, "PAYMENT", "TN"):
                break
            time.sleep(0.25)
            if time.monotonic() >= self.next_poll:
                self.poll()                              # l'historique ne renvoie que les 10 dernières

    def send_paysim(self) -> None:
        # Fraude type PaySim : le compte est vidé en un seul TRANSFER ou CASH_OUT
        client = self.rng.choice(self.clients)
        try:
            balance = self.api.refresh_balance(client)
        except ApiError as e:
            self.counts["erreurs"] += 1
            self.out.line(f"{self.out.c('ERREUR    ', 'red')} solde de {client.short} : {e.message}", force=True)
            return
        if balance < 100:
            return
        tx_type = self.rng.choice(["TRANSFER", "CASH_OUT"])
        beneficiary = "Compte externe " + str(self.rng.randint(1000, 9999)) if tx_type == "TRANSFER" \
            else "Retrait agence"
        self._send(client, "paysim", beneficiary, balance, tx_type, "TN")

    def send_suspicious(self) -> None:
        scenario = self.rng.choices(list(SUSPICIOUS_WEIGHTS), weights=list(SUSPICIOUS_WEIGHTS.values()))[0]
        {"new_country": self.send_new_country, "burst": self.send_burst, "paysim": self.send_paysim}[scenario]()

    # ---------- suivi des décisions ----------

    def poll(self) -> None:
        self.next_poll = time.monotonic() + POLL_INTERVAL_S
        clients = {id(p.client): p.client for p in self.pending.values()}
        for client in clients.values():
            try:
                recent = self.api.recent(client)
            except ApiError:
                continue                                 # nouvel essai au prochain passage
            for tx in recent:
                pending = self.pending.get(tx["id"])
                if pending and tx["status"] in FINAL_STATUSES:
                    self._resolve(tx["id"], tx["status"])
            # GET /api/client/transactions ne renvoie que les 10 dernières : une transaction plus
            # ancienne encore en attente n'est plus visible, sa décision est inconnue
            if len(recent) >= 10:
                oldest = min(tx["id"] for tx in recent)
                for tx_id, p in list(self.pending.items()):
                    if p.client is client and tx_id < oldest:
                        self.pending.pop(tx_id)
                        self.counts["non suivies"] += 1
                        self.by_scenario[p.scenario]["non suivies"] += 1

        now = time.monotonic()
        for tx_id, p in list(self.pending.items()):
            if now - p.sent > DECISION_TIMEOUT_S:
                self.pending.pop(tx_id)
                self.counts["sans décision"] += 1
                self.by_scenario[p.scenario]["sans décision"] += 1
                self.out.line(f"{self.out.c('SANS RÉP. ', 'grey')} #{tx_id:<6} {p.client.short:<18} "
                              f"toujours EN_COURS après {DECISION_TIMEOUT_S:.0f} s (job Spark arrêté ?)",
                              force=True)

    def _resolve(self, tx_id: int, status: str) -> None:
        p = self.pending.pop(tx_id)
        self.counts[status] += 1
        self.by_scenario[p.scenario][status] += 1
        if status != "ACCEPTEE" or p.scenario != "normal":
            # Anomalies signalées et fraudes simulées : toujours affichées
            self.out.line(f"{self.out.status(status)} #{tx_id:<6} {p.client.short:<18} "
                          f"{fmt_amount(p.amount):>16}  {p.country}  {SCENARIO_LABELS[p.scenario]}",
                          force=status != "ACCEPTEE")
        if status == "ACCEPTEE" and p.scenario == "paysim":
            self._safe_refresh(p.client)                 # compte vidé : solde à jour

    # ---------- résumé ----------

    def summary_line(self) -> str:
        c = self.counts
        elapsed = time.monotonic() - self.started
        rate = c["envoyées"] / elapsed if elapsed > 0 else 0
        parts = [
            self.out.c(f"envoyées {c['envoyées']}", "bold"),
            self.out.c(f"acceptées {c['ACCEPTEE']}", "green"),
            self.out.c(f"à vérifier {c['A_VERIFIER']}", "yellow"),
            self.out.c(f"bloquées {c['BLOQUEE']}", "red"),
            f"en cours {len(self.pending)}",
            self.out.c(f"erreurs {c['erreurs']}", "red" if c["erreurs"] else "grey"),
        ]
        if c["sans décision"]:
            parts.append(f"sans décision {c['sans décision']}")
        if c["non suivies"]:
            parts.append(f"non suivies {c['non suivies']}")
        return " | ".join(parts) + self.out.c(f"   ({rate:.2f} tx/s effectives)", "grey")

    def print_final(self) -> None:
        print()
        print(self.out.c("=== Bilan ===", "bold"))
        print(self.summary_line())
        print()
        print(f"{'Scénario':<38}{'envoyées':>9}{'acceptées':>11}{'à vérifier':>12}{'bloquées':>10}"
              f"{'erreurs':>9}{'en cours':>10}")
        for scenario, label in SCENARIO_LABELS.items():
            s = self.by_scenario[scenario]
            if not s:
                continue
            resolved = s["ACCEPTEE"] + s["A_VERIFIER"] + s["BLOQUEE"] + s["sans décision"] + s["non suivies"]
            print(f"{label:<38}{s['envoyées']:>9}{s['ACCEPTEE']:>11}{s['A_VERIFIER']:>12}{s['BLOQUEE']:>10}"
                  f"{s['erreurs']:>9}{s['envoyées'] - resolved:>10}")
        if self.throttled_ticks:
            print(self.out.c(f"\n{self.throttled_ticks} créneau(x) d'envoi sauté(s) : tous les clients avaient "
                             f"atteint le budget VELOCITY_10_MIN ({self.args.velocity_limit} / 10 min).", "grey"))

    # ---------- boucle principale ----------

    def run(self) -> None:
        args = self.args
        capacity = len(self.clients) * args.velocity_limit
        # Envois étalés sur la fenêtre de 10 minutes plutôt que tout le budget d'un coup
        interval = max(1.0 / args.rate, (VELOCITY_WINDOW_S + VELOCITY_MARGIN_S) / capacity)
        self.out.line(
            f"Démarrage : {args.rate:g} tx/s demandées, {args.fraud_ratio * 100:g} % de scénarios suspects, "
            + (f"durée {args.duration:g} s" if args.duration else "jusqu'à Ctrl+C"), force=True)
        if interval > 1.0 / args.rate:
            self.out.line(self.out.c(
                f"Budget VELOCITY_10_MIN ({args.velocity_limit} transactions / 10 min par compte, "
                f"{len(self.clients)} client(s)) : un envoi toutes les {interval:.1f} s "
                f"(≈ {1 / interval:.2f} tx/s).", "yellow"), force=True)
        end = self.started + args.duration if args.duration else None
        next_tick = time.monotonic()
        next_stats = next_tick + STATS_INTERVAL_S
        interrupted = False
        try:
            while end is None or time.monotonic() < end:
                now = time.monotonic()
                if now >= next_tick:
                    next_tick = max(next_tick + interval, now)
                    candidates = self._clients_with_budget(now)
                    if not candidates:
                        self.throttled_ticks += 1        # aucun client sous le seuil : on attend
                    elif self.rng.random() < args.fraud_ratio:
                        self.send_suspicious()
                    else:
                        self.send_normal(candidates)
                if self.pending and time.monotonic() >= self.next_poll:
                    self.poll()
                if now >= next_stats:
                    self.out.line(self.summary_line(), force=True)
                    for client in self.clients:          # le débit réel suit la décision : resynchronise
                        self._safe_refresh(client)
                    next_stats = time.monotonic() + STATS_INTERVAL_S
                wake = min(next_tick, next_stats, self.next_poll if self.pending else next_stats)
                if end is not None:
                    wake = min(wake, end)
                time.sleep(max(0.01, wake - time.monotonic()))
        except KeyboardInterrupt:
            interrupted = True
            self.out.line("Arrêt demandé (Ctrl+C).", force=True)

        # Attente des dernières décisions (Ctrl+C à nouveau pour quitter tout de suite)
        if self.pending and not interrupted:
            self.out.line(f"Attente des décisions restantes ({len(self.pending)}), {args.drain:g} s max...",
                          force=True)
        try:
            deadline = time.monotonic() + (args.drain if not interrupted else min(args.drain, 5))
            while self.pending and time.monotonic() < deadline:
                self.poll()
                time.sleep(POLL_INTERVAL_S)
        except KeyboardInterrupt:
            pass
        self.print_final()


# --------------------------------------------------------------------------------------
# Ligne de commande
# --------------------------------------------------------------------------------------

def positive_float(value: str) -> float:
    f = float(value)
    if f <= 0:
        raise argparse.ArgumentTypeError("doit être strictement positif")
    return f


def ratio(value: str) -> float:
    f = float(value)
    if not 0 <= f <= 1:
        raise argparse.ArgumentTypeError("doit être compris entre 0 et 1")
    return f


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Générateur de trafic FraudShield TN (paiements de démonstration).")
    p.add_argument("--rate", type=positive_float, default=2.0,
                   help="transactions par seconde au plus (défaut 2) ; plafonné par le budget VELOCITY_10_MIN")
    p.add_argument("--duration", type=positive_float, default=None,
                   help="durée en secondes (défaut : jusqu'à Ctrl+C)")
    p.add_argument("--fraud-ratio", type=ratio, default=0.05,
                   help="part de scénarios suspects parmi les envois, entre 0 et 1 (défaut 0.05)")
    p.add_argument("--api-url", default=DEFAULT_API,
                   help=f"URL du backend (défaut {DEFAULT_API}, variable FRAUDSHIELD_API)")
    p.add_argument("--velocity-limit", type=int, default=5,
                   help="seuil de la règle VELOCITY_10_MIN à respecter pour le trafic normal (défaut 5)")
    p.add_argument("--include-main-client", action="store_true",
                   help="utiliser aussi client@fraudshield.tn (exclu par défaut, réservé à la démo manuelle)")
    p.add_argument("--drain", type=positive_float, default=15.0,
                   help="secondes d'attente des décisions restantes à la fin (défaut 15)")
    p.add_argument("--seed", type=int, default=None, help="graine aléatoire (trafic reproductible)")
    p.add_argument("--quiet", action="store_true",
                   help="n'afficher que les anomalies, les erreurs et les résumés")
    p.add_argument("--no-color", action="store_true", help="désactiver les couleurs")
    args = p.parse_args(argv)
    if args.velocity_limit < 1:
        p.error("--velocity-limit doit être au moins 1")
    return args


def main() -> None:
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")         # accents dans la console Windows
    args = parse_args()
    console = Console(color=sys.stdout.isatty() and not args.no_color, quiet=args.quiet)
    generator = Generator(args, console)
    try:
        generator.connect()
    except KeyboardInterrupt:
        sys.exit(1)
    generator.run()


if __name__ == "__main__":
    main()
