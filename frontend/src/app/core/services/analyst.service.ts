import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AlertDetail,
  AlertStatus,
  AlertSummary,
  Dashboard,
  DecisionRequest,
  Page,
  Statistics,
  StatisticsDays,
} from '../models/analyst.model';

/** Appels de l'espace analyste (/api/analyst/**, rôles ANALYSTE et ADMIN). */
@Injectable({ providedIn: 'root' })
export class AnalystService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/analyst`;

  getDashboard(): Observable<Dashboard> {
    return this.http.get<Dashboard>(`${this.baseUrl}/dashboard`);
  }

  /** Statistiques sur 7 ou 30 jours (fraudes, pays, décisions, métriques du modèle). */
  getStatistics(days: StatisticsDays): Observable<Statistics> {
    return this.http.get<Statistics>(`${this.baseUrl}/statistics`, { params: { days } });
  }

  /** Liste paginée, plus récentes d'abord ; sans statut = toutes les alertes. */
  getAlerts(page: number, size: number, status?: AlertStatus | null): Observable<Page<AlertSummary>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<Page<AlertSummary>>(`${this.baseUrl}/alerts`, { params });
  }

  getAlert(id: number): Observable<AlertDetail> {
    return this.http.get<AlertDetail>(`${this.baseUrl}/alerts/${id}`);
  }

  /** 409 si une décision a déjà été prise. */
  decide(id: number, request: DecisionRequest): Observable<AlertDetail> {
    return this.http.post<AlertDetail>(`${this.baseUrl}/alerts/${id}/decision`, request);
  }
}
