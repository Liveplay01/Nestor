// Central label definitions — keeps UX language consistent across the app.
// These are the terms users see; change here to update everywhere that imports them.

export const LABELS = {
  rootFolder: 'Hauptordner',
  aiMode: 'KI-Modus',
  apiKey: 'API-Schlüssel',
  apiMode: 'Online-KI',
  localMode: 'Lokale KI',
  model: 'KI-Version',
  executeActions: 'Änderungen starten',
  pendingPanel: 'Geplante Änderungen',
  riskLevels: {
    safe: 'Sehr sicher',
    review: 'Bitte prüfen',
    risky: 'Riskant'
  }
} as const
