import { TransactionStatus, TransactionType } from './client.model';

/** Décision automatique d'une alerte. */
export type AlertDecision = 'A_VERIFIER' | 'BLOQUEE';

/** Statut d'une alerte côté analyste (filtre de liste). */
export type AlertStatus = 'A_VERIFIER' | 'BLOQUEE' | 'TRAITEE';

/** Décision posée par l'analyste. */
export type AnalystDecision = 'FRAUDE_CONFIRMEE' | 'FAUX_POSITIF';

/** Ligne de liste d'alertes (API et message WebSocket /topic/alerts). */
export interface AlertSummary {
  id: number;
  transactionId: number;
  createdAt: string;
  clientName: string;
  accountRef: string; // déjà masqué par le backend
  amount: number;
  country: string;
  score: number;
  decision: AlertDecision;
  status: AlertStatus;
  analystDecision: AnalystDecision | null;
}

/** Page renvoyée par GET /api/analyst/alerts. */
export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/** Raison fusionnée : explication SHAP (MODELE) ou règle métier (REGLE). */
export interface AlertReason {
  source: 'MODELE' | 'REGLE';
  feature: string;
  label: string;
  value?: number | string | null;
  impact?: number | null; // SHAP, > 0 augmente le risque
  score?: number | null; // score attribué par la règle
}

export interface TransactionInfo {
  id: number;
  beneficiary: string;
  amount: number;
  type: TransactionType;
  country: string;
  status: TransactionStatus;
  riskScore: number | null;
  createdAt: string;
}

/** GET /api/analyst/alerts/{id} */
export interface AlertDetail {
  id: number;
  score: number;
  decision: AlertDecision;
  status: AlertStatus;
  createdAt: string;
  reasons: AlertReason[];
  transaction: TransactionInfo;
  client: { id: number; fullName: string; email: string };
  accountRef: string;
  bank: string;
  analystDecision: AnalystDecision | null;
  analystComment: string | null;
  analystName: string | null;
  decidedAt: string | null;
  recentTransactions: TransactionInfo[];
}

export interface DecisionRequest {
  decision: AnalystDecision;
  comment: string;
}

/** Transactions créées pendant une minute (flagged = à vérifier ou bloquées). */
export interface MinuteBucket {
  minute: string;
  total: number;
  flagged: number;
}

/** GET /api/analyst/dashboard */
export interface Dashboard {
  transactionsToday: number;
  alertsToday: number;
  blockedAmountToday: number;
  pendingReviewCount: number;
  decisions: Record<'ACCEPTEE' | 'A_VERIFIER' | 'BLOQUEE', number>;
  perMinute: MinuteBucket[];
  generatedAt: string;
}

/** Période de la page Statistiques. */
export type StatisticsDays = 7 | 30;

/** Transactions suspectes créées un jour donné (statut actuel). */
export interface DayBucket {
  date: string; // AAAA-MM-JJ
  blocked: number;
  review: number;
  total: number;
}

export interface TypeBucket {
  type: TransactionType;
  count: number;
  amount: number;
}

export interface CountryBucket {
  country: string;
  count: number;
  amount: number;
}

/** Métriques du modèle sur le jeu de test (ml/models/model_metrics.json). */
export interface ModelMetrics {
  model: string | null;
  dataset: string | null;
  precision: number | null;
  recall: number | null;
  f1: number | null;
  aucPr: number | null;
  threshold: number | null;
  testSize: number | null;
  confusionMatrix: { tn: number; fp: number; fn: number; tp: number } | null;
  models: { name: string; precision: number; recall: number; f1: number; aucPr: number }[] | null;
  evaluatedAt: string | null;
}

/** GET /api/analyst/statistics?days=7|30 */
export interface Statistics {
  days: StatisticsDays;
  from: string;
  to: string;
  summary: {
    alerts: number;
    previousAlerts: number;
    blockedAmount: number;
    avgDecisionSeconds: number | null;
  };
  fraudsPerDay: DayBucket[];
  fraudsByType: TypeBucket[];
  topCountries: CountryBucket[];
  analystDecisions: { fraudConfirmed: number; falsePositive: number };
  modelMetrics: ModelMetrics | null;
  generatedAt: string;
}

/** Message WebSocket /topic/transactions. */
export interface TransactionNotification {
  id: number;
  amount: number;
  status: TransactionStatus;
  riskScore: number | null;
  createdAt: string;
  processedAt: string;
}
