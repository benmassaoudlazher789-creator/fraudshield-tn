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

/** Message WebSocket /topic/transactions. */
export interface TransactionNotification {
  id: number;
  amount: number;
  status: TransactionStatus;
  riskScore: number | null;
  createdAt: string;
  processedAt: string;
}
