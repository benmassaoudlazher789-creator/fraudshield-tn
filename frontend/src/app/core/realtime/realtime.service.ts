import { Injectable, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RxStomp, RxStompState } from '@stomp/rx-stomp';
import { Observable, defer, map, share } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { AlertSummary, TransactionNotification } from '../models/analyst.model';

/**
 * Connexion STOMP unique (rx-stomp) vers le backend.
 * - activée à la première souscription d'un topic
 * - reconnexion automatique toutes les 3 s
 * - arrêtée proprement à la déconnexion de l'utilisateur
 */
@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private readonly auth = inject(AuthService);
  private readonly rxStomp = new RxStomp();

  /** État de la connexion WebSocket. */
  readonly state = toSignal(this.rxStomp.connectionState$, { initialValue: RxStompState.CLOSED });
  readonly connected = computed(() => this.state() === RxStompState.OPEN);

  /** Nouvelles alertes (A_VERIFIER ou BLOQUEE). */
  readonly alerts$: Observable<AlertSummary> = this.watch<AlertSummary>('/topic/alerts');

  /** Transactions traitées (scoring ou décision d'analyste). */
  readonly transactions$: Observable<TransactionNotification> =
    this.watch<TransactionNotification>('/topic/transactions');

  constructor() {
    this.rxStomp.configure({
      brokerURL: environment.wsUrl,
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
    });

    // Déconnexion de l'utilisateur : fermeture du WebSocket
    effect(() => {
      if (!this.auth.isLoggedIn() && this.rxStomp.active) {
        void this.rxStomp.deactivate();
      }
    });
  }

  /** Observable partagé d'un topic : un seul abonnement STOMP quel que soit le nombre d'abonnés. */
  private watch<T>(destination: string): Observable<T> {
    return defer(() => {
      this.ensureActive();
      return this.rxStomp.watch({ destination });
    }).pipe(
      map((message) => JSON.parse(message.body) as T),
      share(),
    );
  }

  private ensureActive(): void {
    if (!this.rxStomp.active && this.auth.isLoggedIn()) {
      this.rxStomp.activate();
    }
  }
}
