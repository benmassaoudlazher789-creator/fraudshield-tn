import { AlertSummary } from '../models/analyst.model';

/**
 * Classe de couleur d'une ligne d'alerte (bordure gauche) :
 * décision de l'analyste si elle existe, sinon décision automatique.
 */
export function alertRowTone(alert: Pick<AlertSummary, 'decision' | 'analystDecision'>): string {
  if (alert.analystDecision === 'FAUX_POSITIF') {
    return 'row--success';
  }
  return alert.analystDecision === 'FRAUDE_CONFIRMEE' || alert.decision === 'BLOQUEE' ? 'row--danger' : 'row--warning';
}
