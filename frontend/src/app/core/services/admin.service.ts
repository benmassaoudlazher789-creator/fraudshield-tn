import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AdminUser,
  BusinessRule,
  CreateUserRequest,
  UpdateRuleRequest,
  UpdateUserRequest,
  UserFilters,
} from '../models/admin.model';
import { Page } from '../models/analyst.model';

/** Appels de l'espace administrateur (/api/admin/**, rôle ADMIN). */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/admin`;

  getUsers(filters: UserFilters, page: number, size: number): Observable<Page<AdminUser>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (filters.search.trim()) {
      params = params.set('search', filters.search.trim());
    }
    if (filters.role) {
      params = params.set('role', filters.role);
    }
    if (filters.enabled !== null) {
      params = params.set('enabled', filters.enabled);
    }
    return this.http.get<Page<AdminUser>>(`${this.baseUrl}/users`, { params });
  }

  /** 409 si l'e-mail est déjà utilisé. */
  createUser(request: CreateUserRequest): Observable<AdminUser> {
    return this.http.post<AdminUser>(`${this.baseUrl}/users`, request);
  }

  updateUser(id: number, request: UpdateUserRequest): Observable<AdminUser> {
    return this.http.patch<AdminUser>(`${this.baseUrl}/users/${id}`, request);
  }

  /** 400 si l'administrateur tente de se désactiver lui-même. */
  setUserEnabled(id: number, enabled: boolean): Observable<AdminUser> {
    return this.http.patch<AdminUser>(`${this.baseUrl}/users/${id}/status`, { enabled });
  }

  getRules(): Observable<BusinessRule[]> {
    return this.http.get<BusinessRule[]>(`${this.baseUrl}/rules`);
  }

  /** Appliqué immédiatement par le moteur anti-fraude (aucun cache côté backend). */
  updateRule(id: number, request: UpdateRuleRequest): Observable<BusinessRule> {
    return this.http.patch<BusinessRule>(`${this.baseUrl}/rules/${id}`, request);
  }
}
