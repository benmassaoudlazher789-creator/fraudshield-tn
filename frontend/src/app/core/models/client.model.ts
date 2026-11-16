/** Types d'opération (enum TransactionType du backend). */
export type TransactionType = 'PAYMENT' | 'TRANSFER' | 'CASH_OUT';

/** Statuts d'une transaction (enum TransactionStatus du backend). */
export type TransactionStatus = 'EN_COURS' | 'ACCEPTEE' | 'A_VERIFIER' | 'BLOQUEE';

/** GET /api/client/account */
export interface Account {
  accountRef: string;
  bank: string;
  balance: number;
}

/** Transaction vue par le client (jamais de score ni de motif). */
export interface ClientTransaction {
  id: number;
  beneficiary: string;
  amount: number;
  type: TransactionType;
  country: string;
  status: TransactionStatus;
  createdAt: string;
}

/** Corps de POST /api/client/transactions */
export interface CreateTransactionRequest {
  beneficiary: string;
  amount: number;
  type: TransactionType;
  country: string;
}

/** Format commun des erreurs du backend (ApiError). */
export interface ApiError {
  status: number;
  error: string;
  message: string;
  path?: string;
  fieldErrors?: Record<string, string>;
}

export const TYPE_LABELS: Record<TransactionType, string> = {
  PAYMENT: 'Paiement',
  TRANSFER: 'Transfert',
  CASH_OUT: 'Retrait',
};

export const STATUS_LABELS: Record<TransactionStatus, string> = {
  EN_COURS: 'En cours',
  ACCEPTEE: 'Acceptée',
  A_VERIFIER: 'En vérification',
  BLOQUEE: 'Bloquée',
};

export interface Country {
  code: string;
  name: string;
}

/** Pays proposés dans le formulaire de paiement. */
export const COUNTRIES: Country[] = [
  ['TN', 'Tunisie'],
  ['FR', 'France'],
  ['DZ', 'Algérie'],
  ['LY', 'Libye'],
  ['MA', 'Maroc'],
  ['IT', 'Italie'],
  ['DE', 'Allemagne'],
  ['TR', 'Turquie'],
  ['AE', 'Émirats arabes unis'],
  ['NG', 'Nigéria'],
].map(([code, name]) => ({ code, name }));

/** Nom du pays à partir de son code ISO (le code lui-même si inconnu). */
export function countryName(code: string): string {
  return COUNTRIES.find((c) => c.code === code)?.name ?? code;
}
