import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Account, ClientTransaction, CreateTransactionRequest } from '../models/client.model';

/** Appels de l'espace client (/api/client/**, JWT ajouté par l'intercepteur). */
@Injectable({ providedIn: 'root' })
export class ClientService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/client`;

  getAccount(): Observable<Account> {
    return this.http.get<Account>(`${this.baseUrl}/account`);
  }

  /** Les 10 dernières transactions, plus récentes d'abord. */
  getTransactions(): Observable<ClientTransaction[]> {
    return this.http.get<ClientTransaction[]>(`${this.baseUrl}/transactions`);
  }

  /** Crée un paiement : renvoyé au statut EN_COURS en attendant le scoring. */
  createTransaction(request: CreateTransactionRequest): Observable<ClientTransaction> {
    return this.http.post<ClientTransaction>(`${this.baseUrl}/transactions`, request);
  }
}
