# Verbleibende Verbesserungen (nicht in Prioritätenliste abgedeckt)

**Ziel:** Behebe UX-Qualitätsmängel und technische Lücken, die Kunden direkt auffallen — ohne funktionale Überladung. Jeder Punkt hat klare affected files und Erfolgskriterien.

---

## Task-Runliste (priorisiert)

### P0-1 · Streaming-Bubble mit Markdown rendern
**Betroffene Dateien:** `src/renderer/src/components/Chat.tsx` (StreamingBubble)
**Problem:** Während des Token-Streams schreibt der Code direkt `textContent` auf das DOM. Dadurch erscheinen Markdown-Symbole (`*`, `*`, `#`) als Rohtext — die Antwort sieht unprofessionell aus.
**Umsetzung:** 
- Importiere `ReactMarkdown` + `remarkGfm` (bereits vorhanden im Projekt)
- Ersetze `whitespace-pre-wrap` + `textContent` durch ein schlankes Markdown-Rendering während des Streams
- Nutze denselben `mdComponents`-Style wie `MessageBubble`, aber mit „sanfterem" Rendering während der Token ankommen
**Validierung:** KI-Antwort mit Liste/Bold/Kursiv ist während des Streams bereits formatiert sichtbar.

---

### P0-2 · Copy-Button auf AI-Antworten
**Betroffene Dateien:** `src/renderer/src/components/Chat.tsx` (MessageBubble-Kopfbereich)
**Problem:** Nutzer können AI-Antworten nicht mit einem Klick kopieren — Standard-Erwartung in jedem Chat-Interface.
**Umsetzung:**
- Kopier-Icon neben dem Anchor-Icon einfügen, sichtbar bei `group-hover`
- Bei Klick: `navigator.clipboard.writeText(msg.text)` + kurzer Toast „Kopiert"
**Validierung:** Hover über AI-Nachricht → Copy-Button erscheint → Klick kopiert gesamten Text.

---

### P0-3 · Vollständiger Verzeichnisbaum im KI-Kontext
**Betroffene Dateien:** `src/renderer/src/lib/systemPrompt.ts`, `src/renderer/src/components/Chat.tsx`
**Problem:** `buildSystemPrompt()` übergibt nur `fileNames.slice(0, 50)` der ersten Ebene. Bei 200+ Einträgen kennt die KI nur einen Bruchteil.
**Umsetzung:**
- `listDir` aufrufen mit `maxDepth=3` und rekursiv alle Pfade sammeln (komprimiert, max. ~500 Einträge)
- Als strukturiertes JSON im System-Prompt übergeben, nicht als kommagetrennte Liste
- Bei großen Ordnern: aggregieren („+ 47 weitere Dateien")
**Validierung:** KI kennt verschachtelte Ordner und kann z. B. „Finde alle Rechnungen im Unterordner 2024" beantworten.

---

### P0-4 · Sidebar-Labels auf lesbare Größe
**Betroffene Dateien:** `src/renderer/src/components/Sidebar.tsx`
**Problem:** Labels unter Icons sind 9.5px. Das liegt unter der WCAG-Empfehlung (mindestens 12px).
**Umsetzung:**
- `text-[9.5px]` → `text-[11px]` (Kompromiss: lesbar ohne Layout-Sprung)
- Layout-Padding ggf. um 1-2px anpassen, damit Text nicht abgeschnitten wird
**Validierung:** Labels sind auf 1080p-Display ohne Anstrengung lesbar.

---

### P0-5 · Hardcoded Blau in Selectoren ersetzen
**Betroffene Dateien:** `src/renderer/src/components/SettingsPage.tsx`
**Problem:** KI-Modus- und Theme-Selector nutzen `#2563EB` statt `var(--color-accent)`. Bei Akzentfarbe-Wechsel (z. B. Grün) bleiben Buttons blau — inkonsistent.
**Umsetzung:**
- Alle `#2563EB` in SettingsPage durch `var(--color-accent)` ersetzen
- Prüfe auch `style={{ background: '#2563EB' }}` in Toggle- und Selector-Buttons
**Validierung:** Wechsel Akzentfarbe → alle Selector-Buttons folgen der neuen Farbe.

---

### P1-6 · Drag & Drop zwischen Ordnern im Explorer
**Betroffene Dateien:** `src/renderer/src/components/Explorer.tsx`
**Problem:** Clipboard/Kopieren funktioniert, aber Drag-in-Explorer (Datei von A nach B ziehen) fehlt — Kernfunktion eines Dateimanagers.
**Umsetzung:**
- `onDragStart` auf Listeneinträge: Dateinamen + Pfad als `nestor/file` setzen
- `onDragOver`/`onDrop` auf Ordnereinträge: bei Drop auf Ordner → `moveFile(from, to)` via IPC
- Visuelles Drop-Indikator (blauer Hintergrund) während des Drag-Over
- Constraint: `assertWithinRoot` prüft beide Pfade
**Validierung:** Datei im Explorer auf Ordner ziehen → Datei wird verschoben → Toast-Bestätigung.

---

### P1-7 · Proaktive Insights-Toasts
**Betroffene Dateien:** `src/renderer/src/components/HomePage.tsx`, `src/main/fs-manager.ts` (neue `analyzeStorage()`-Funktion)
**Problem:** Nutzer wissen nicht, dass ihr Downloads-Ordner 3 GB groß ist, bis sie danach fragen.
**Umsetzung:**
- Beim App-Start (nach Onboarding): einmalige Analyse des Root-Ordners
- Prüfe: Ordner > 2 GB, älteste Datei > 6 Monate, > 50 Dateien in Downloads
- Zeige einzelnen, nicht-blockierenden Toast mit Handlungsvorschlag
- Nicht bei jedem Start wiederholen (localStorage-Flag)
**Validierung:** Großer Downloads-Ordner → Toast erscheint nach Start → Klick öffnet Chat mit vorausgefüllter Analyse-Anfrage.

---

### P2-8 · Lazy-Loading / Pagination für große Ordner
**Betroffene Dateien:** `src/main/fs-manager.ts` (`listDir`), `src/renderer/src/components/FileTree.tsx`, `src/renderer/src/components/Explorer.tsx`
**Problem:** `listDir` lädt den gesamten Baum synchron. Bei 10.000+ Dateien blockiert es den Main-Thread und macht die App unbenutzbar.
**Umsetzung:**
- `listDir` erhält optionalen `limit` + `offset` Parameter
- FileTree und Explorer laden ersten Batches (z. B. 200 Einträge), dann „Mehr laden"-Button am Ende
- Alternativ: Virtualisierung (react-window) für die Liste — nur sichtbare Einträge rendern
- Warnung: „Ordner enthält X Dateien — zeige erste 200"
**Validierung:** Ordner mit 5.000 Dateien lädt in <200ms, UI bleibt responsiv.

---

## Nicht mehr im Scope dieser Iteration

- **Volltextsuche in Dateiinhalten** → separater Plan (erfordert Parsing-Logik für PDF/DOCX/XLSX)
- **Batch-Umbenennung** → separater Plan (neuer Dialog, Pattern-Logik)
- **Chat-Verlauf-Browser** → separate Planung (Storage-Änderung auf SQLite/better-sqlite3)
- **Multi-Workspace** → separater Plan (mehrere Root-Ordner, Watcher-Änderung)
- **System Tray** → separater Plan (Hintergrundmodus)
- **Scheduler/Automationen** → separater Plan (node-cron, Cron-UI)
- **i18n** → separater Plan (i18next, String-Extraktion)

Diese Punkte sind zu umfangreich für einen einzelnen Plan-Lauf und erfordern jeweils eigene Architekturentscheidungen.

---

## Erfolgskriterien für den gesamten Lauf

1. KI-Antworten sind während des Streams formatiert lesbar (kein Markdown-Rohtext)
2. Copy-Button funktioniert auf jeder AI-Nachricht
3. KI kennt verschachtelte Ordnerstruktur (nicht nur 50 Dateinamen)
4. Alle Buttons folgen der gewählten Akzentfarbe (kein hartcodiertes Blau)
5. Drag & Drop im Explorer funktioniert für Dateien und Ordner
6. Proaktive Toasts erscheinen einmalig bei großen/ungenutzten Ordnern
7. Große Ordner (>5.000 Dateien) laden ohne UI-Freeze
