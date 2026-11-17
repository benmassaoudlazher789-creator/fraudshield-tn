import { Role } from './user.model';

/** Utilisateur vu par l'administrateur (GET /api/admin/users). */
export interface AdminUser {
  id: number;
  fullName: string;
  email: string;
  role: Role;
  enabled: boolean;
  createdAt: string;
  accountRef: string | null; // compte bancaire des clients
}

/** POST /api/admin/users */
export interface CreateUserRequest {
  fullName: string;
  email: string;
  password: string;
  role: Role;
}

/** PATCH /api/admin/users/{id} */
export interface UpdateUserRequest {
  fullName: string;
  role: Role;
}

/** Filtres de la liste des utilisateurs (null = pas de filtre). */
export interface UserFilters {
  search: string;
  role: Role | null;
  enabled: boolean | null;
}

/** Règle métier (GET /api/admin/rules). */
export interface BusinessRule {
  id: number;
  code: string;
  label: string;
  threshold: number;
  enabled: boolean;
}

/** PATCH /api/admin/rules/{id} */
export interface UpdateRuleRequest {
  threshold: number;
  enabled: boolean;
}
