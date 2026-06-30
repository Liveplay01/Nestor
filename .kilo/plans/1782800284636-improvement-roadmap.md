# Nestor Verbesserungs-Roadmap

**Ziel:** Nestor zum besten lokalen KI-Dateimanager für Windows machen. Jede Änderung muss den Kundennutzen erhöhen — sei es durch Zeitersparnis, Sicherheit, Komfort oder einzigartige Features, die es anderswo nicht gibt.

---

## Phase 0 — Sofort-Fixes (vor jedem Release)

Diese Punkte sind Sichtbarkeits- und Qualitätsmängel, die Kunden sofort negativ auffallen.

| # | Fix | Kundennutzen | Aufwand |
|---|-----|--------------|---------|
| 0.1 | **Markdown-Rendering im Chat** — KI-Antworten mit `react-markdown` rendern (bereits importiert, aber Streaming-Bubble nutzt `whitespace-pre-wrap`) | Antworten sind lesbar, Listen und Formatierung funktionieren | Minimal |
| 0.2 | **"Nicht verbunden"-Status entschärfen** — im Ruhezustand neutrales Grau statt Alarm-Rot; nur bei aktivem Fehlschlag rot | Weniger Stress bei neuen Nutzern, kein "etwas ist kaputt"-Gefühl | Minimal |
| 0.3 | **FAQ/Help-Button Position** — aus dem Sidebar-Bereich rausnehmen oder als Menüpunkt integrieren | Sauberes Layout, kein visueller Bug | Minimal |
| 0.4 | **Toggle-Farbe auf Akzentfarbe umstellen** — `var(--color-accent)` statt hardcoded `#2563EB` | Konsistentes Design bei allen Akzentfarben | Minimal |
| 0.5 | **Tageszeit-angepasste Begrüßung** — "Guten Morgen / Tag / Abend" | Persönlicherer Eindruck | Minimal |
| 0.6 | **Sidebar-Labels vergrößern** — von ~9.5px auf mindestens 11px | Bessere Lesbarkeit für alle Nutzer | Minimal |
| 0.7 | **Home-Screen Leer-Zustand verbessern** — statt leeren Placeholder-Bereichen: Tipps, Shortcuts oder "Was Nestor kann"-Cards | Professioneller erster Eindruck | Gering |
| 0.8 | **Chat-Nachrichten nach jeder Antwort persistieren** — nicht nur bei `onBeforeQuit` | Nach Absturz oder Stromausfall keine Gespräche verloren | Gering |

---

## Phase 1 — Kern-Features für täglichen Nutzen

Features die Kunden wirklich wollen und die direkt die Produktivität steigern.

| # | Feature | Kundennutzen | Aufwand |
|---|---------|--------------|---------|
| 1.1 | **Chat-Verlauf-Browser** — Gesprächstitel (auto-generiert), Datum, Vorschau in Sidebar oder separatem Panel | Nutzer finden vergangene Gespräche wieder, nicht nur den letzten | Mittel |
| 1.2 | **Mehrere Root-Ordner / Arbeitsbereiche** — mehrere Ordner pinnen, zwischen ihnen wechseln | Nutzer mit Desktop+Downloads+Dokumente müssen nicht ständig wechseln | Mittel |
| 1.3 | **Datei-Metadata im Explorer** — Größe, Änderungsdatum als optionale Spalten oder Tooltip | Sofort sehen, welche Datei die richtige ist | Gering |
| 1.4 | **Copy-Button auf AI-Antworten** — bei Hover neben dem Anker-Icon | Standard-Erwartung in jedem Chat | Minimal |
| 1.5 | **Breadcrumb im Explorer** — nicht nur in der TitleBar, sondern direkt über der Dateiliste + Zurück-Pfeil | Intuitivere Navigation | Gering |
| 1.6 | **Mehrfachauswahl im Explorer** — Shift+Klick / Ctrl+Klick + Aktionsleiste | Batch-Operationen direkt möglich | Mittel |
| 1.7 | **Drag & Drop zwischen Ordnern** — Dateien im Explorer von einem Ordner in einen anderen ziehen | Kernfunktion eines Dateimanagers | Mittel |
| 1.8 | **Vollständiger Verzeichnisbaum im KI-Kontext** — rekursives JSON statt nur 50 Dateinamen der ersten Ebene | KI versteht die gesamte Struktur, nicht nur einen Ausschnitt | Mittel |

---

## Phase 2 — Differenzierung & "Wow"-Effekt

Features die Nestor einzigartig machen und von der Konkurrenz abheben.

| # | Feature | Kundennutzen | Aufwand |
|---|---------|--------------|---------|
| 2.1 | **Proaktive Vorschläge** — Toasts beim Start: "Downloads-Ordner ist 3 GB groß, zuletzt vor 6 Monaten aufgeräumt" | Nutzer müssen nicht selbst darauf kommen; Nestor wird zum aktiven Helfer | Hoch |
| 2.2 | **Batch-Umbenennung mit Pattern-Preview** — Muster wie `Foto_001.jpg`, Live-Vorschau aller Änderungen vor Ausführung | Häufigster Use-Case für Fotos/Downloads, extrem zeitsparend | Mittel |
| 2.3 | **Duplikate-Finder mit eigener UI** — visuelle Tabelle mit Gruppen, Größe, Pfad; "Alle ältesten löschen"-Button | Einfach Speicherplatz freigeben, kein manuelles Suchen | Hoch |
| 2.4 | **Schnellaktionen für Ordner** — Rechtsklick auf Ordner: "Als Arbeitsbereich pinnen", "Größe berechnen", "Inhalt analysieren" | Schnellerer Zugriff auf häufige Aufgaben | Gering |
| 2.5 | **300+ direkte Aktionen auf Explorer-Objekte** — Tastenkombinationen, Kontextmenü, Drag-Rails | Power-User fühlen sich zu Hause | Mittel |
| 2.6 | **Smart Preview (Quick Look)** — Leertaste auf Datei für Vorschau (Bild, PDF, Video, Audio) ohne separates Fenster | Schnellere Entscheidung: ist das die richtige Datei? | Mittel |
| 2.7 | **Tastatur-Navigation im Dateibaum** — Pfeiltasten, Enter zum Öffnen, Suche mit `/` | Schnellere Bedienung ohne Maus | Gering |
| 2.8 | **Chat als permanentes Fenster** — unterstützt Overlay-Modus, Splitscreen, Immer-im-Vordergrund | Multitasking-freundlich | Hoch |

---

## Phase 3 — Skalierung & Langfristiger Nutzen

Features die Nestor für langfristige Nutzer und spezielle Anwendungsfälle attraktiv machen.

| # | Feature | Kundennutzen | Aufwand |
|---|---------|--------------|---------|
| 3.1 | **Echte i18n** — Englisch als zweite Sprache, vorbereitet für weitere | App wird international verkaufbar | Hoch |
| 3.2 | **Organisations-Templates** — 1-Klick-Anwendung von Standard-Strukturen (Jahresordner, Projekte, Medien) | Sofortige Ordnung ohne KI-Abfrage | Mittel |
| 3.3 | **API-Modus Provider-Picker** — OpenAI / Anthropic / Groq / Custom mit Auto-Fill, Modell-Vorschlägen | Keine technischen Kenntnisse nötig für externe KI | Gering |
| 3.4 | **Datei-Tags / Favoriten** — Dateien markieren, nach Tags filtern | Eigene Klassifikation zusätzlich zur KI-Ordnung | Mittel |
| 3.5 | **Ordner-Vorlagen** — Standard-Strukturen anlegen und speichern | Konsistente Projektordner | Gering |
| 3.6 | **Globale Suche (Ctrl+F)** — Volltextsuche in Dateiinhalten (txt, md, pdf, docx) | Richtige Datei finden, auch wenn Name nicht aussagekräftig | Hoch |
| 3.7 | **Scheduled Cleanup** — wiederkehrende Aufgaben ("Downloads jeden Sonntag aufräumen", "Monatlich archivieren") | Automatische Wartung ohne Zutun | Hoch |
| 3.8 | **Chat-Export** — als PDF, Markdown oder Text exportieren | Gespräche dokumentieren, teilen | Gering |
| 3.9 | **Mini-Dashboard auf der Home-Page** — Statistiken: Ordnergröße, Dateianzahl, letzte Aktivität, "diese Woche organisiert" | Überblick auf einen Blick | Mittel |
| 3.10 | **DSGVO-konforme Datenschutzerklärung** — sichtbar in der App und beim Download | Rechtssicherheit für den Markt | Gering |

---

## Technische Qualität (Parallel zu allen Phasen)

| # | Verbesserung | Kundennutzen |
|---|--------------|--------------|
| T1 | **React Error Boundary** — App stürzt nicht mehr mit weißem Screen bei Fehlern | Stabilität, Vertrauen |
| T2 | **Lazy-Loading / Pagination für große Ordner** — Warnung bei 10.000+ Dateien, schrittweises Laden | App bleibt flüssig, keine Blockaden |
| T3 | **API-Einstellungen dokumentieren** — Speicherort von `electron-store` im Hilfemenü sichtbar | Transparenz für fortgeschrittene Nutzer |
| T4 | **Ollama-Fehlerbehandlung verbessern** — Fallback-Link zu ollama.ai + Anleitung bei fehlgeschlagener Auto-Installation | Keine Sackgasse bei Problemen |

---

## Empfohlene Reihenfolge

```
Phase 0 (Sofort-Fixes)
    ↓
Phase 1 (Kern-Features)
    ↓
Phase 2 (Differenzierung)
    ↓
Phase 3 (Skalierung)
```

**Kundenwert maximalieren, wenn wir zuerst Phase 0 + 1.1 + 1.2 + 1.3 umsetzen:**
- Keine störenden Bugs mehr
- Nutzer finden ihre Gespräche wieder
- Mehrere Ordner möglich (der größte Pain-Point laut Feedback)
- Metadata sichtbar (sofortiger Nutzen)

Dann Phase 2 für das Alleinstellungsmerkmal (proaktive Vorschläge, Batch-Rename, Duplikate-Finder).
