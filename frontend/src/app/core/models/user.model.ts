/** Rôles définis côté backend (enum Role). */
export type Role = 'CLIENT' | 'ANALYSTE' | 'ADMIN';

/** Libellés français des rôles pour l'affichage. */
export const ROLE_LABELS: Record<Role, string> = {
  CLIENT: 'Client',
  ANALYSTE: 'Analyste fraude',
  ADMIN: 'Administrateur',
};

/** Utilisateur connecté (sans le token). */
export interface User {
  userId: number;
  fullName: string;
  email: string;
  role: Role;
}

/** Réponse de POST /api/auth/login (token null pour /api/auth/me). */
export interface AuthResponse extends User {
  token: string | null;
}

/** Corps de POST /api/auth/login. */
export interface LoginRequest {
  email: string;
  password: string;
}
