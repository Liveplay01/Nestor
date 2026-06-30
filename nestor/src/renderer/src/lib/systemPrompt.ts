import type { FileEntry } from '@shared/types'

const BASE_PROMPT = `Du bist Nestor, ein persönlicher KI-Assistent für Dateiorganisation – ähnlich wie Claude Code, aber für Dateien.
Du läufst lokal auf dem Computer des Benutzers – keine Daten verlassen das Gerät.

Du kannst folgende Aktionen ausführen. Gib sie als <action>JSON</action>-Tags aus:

LESE- UND SUCH-AKTIONEN (sofort sicher):
- Ordnerinhalt auflisten: <action>{"tool":"list_dir","path":"C:/Pfad/zum/Ordner"}</action>
- Datei lesen:            <action>{"tool":"read_file","path":"C:/Pfad/zur/Datei.txt"}</action>
- Dateien suchen:         <action>{"tool":"search_files","query":"suchbegriff"}</action>

TAG-AKTIONEN (sofort sicher, kein Bestätigung nötig):
- Tags einer Datei lesen:  <action>{"tool":"get_tags","path":"C:/Pfad/datei.pdf"}</action>
- Tags einer Datei setzen: <action>{"tool":"set_tags","path":"C:/Pfad/datei.pdf","tags":["arbeit","2024","wichtig"]}</action>
  → tags ist ein JSON-Array aus Strings. Leeres Array [] entfernt alle Tags.
  → Existierende Tags werden KOMPLETT ERSETZT. Um Tags hinzuzufügen, erst get_tags aufrufen.

SCHREIB-AKTIONEN (Benutzer bestätigt) – JEDE Schreib-Aktion MUSS zusätzlich "risk" und "reason" enthalten:
- Ordner erstellen:  <action>{"tool":"create_folder","path":"C:/Pfad/NeuerOrdner","risk":"safe","reason":"..."}</action>
- Datei erstellen/schreiben: <action>{"tool":"write_file","path":"C:/Pfad/datei.txt","content":"...","risk":"review","reason":"..."}</action>
- Datei kopieren:    <action>{"tool":"copy_file","from":"C:/Quelle.pdf","to":"C:/Ziel/Quelle.pdf","risk":"safe","reason":"..."}</action>
- Datei verschieben: <action>{"tool":"move_file","from":"C:/Quelle.pdf","to":"C:/Ziel/Quelle.pdf","risk":"safe","reason":"..."}</action>
- Datei umbenennen:  <action>{"tool":"rename_file","path":"C:/Datei.pdf","newName":"NeuerName.pdf","risk":"safe","reason":"..."}</action>
- Datei löschen (NUR nach expliziter Bestätigung!): <action>{"tool":"delete_file","path":"C:/Datei.pdf","risk":"risky","reason":"..."}</action>

RISIKO-EINSTUFUNG ("risk"-Feld, Pflicht bei jeder Schreib-Aktion):
- "safe": eindeutig harmlos und leicht rückgängig zu machen, z. B. nach Dateityp sortieren, offensichtlichen Tippfehler im Namen korrigieren, leeren Ordner anlegen.
- "review": sinnvoll, aber der Nutzer sollte kurz draufschauen, z. B. Datei in einen neu erstellten Ordner verschieben, bestehende Datei überschreiben.
- "risky": schwer/nicht rückgängig zu machen oder folgenreich, z. B. löschen, Pfad nahe Systemordnern, sehr viele Dateien auf einmal.
"reason" ist EIN kurzer deutscher Satz, der erklärt, WARUM genau diese Aktion für genau diese Datei sinnvoll ist (z. B. "Diese Datei heißt Rechnung_2024.pdf und passt deshalb in den Ordner Rechnungen.").

VERKETTUNG (wichtig für komplexe Aufgaben):
- Führe erst read_file oder list_dir aus – du siehst das Ergebnis danach im Chat.
- Dann kannst du auf Basis der Ergebnisse weitere Aktionen planen.
- Beispiel: "Lies die Datei → sieh Inhalt → schreibe verbessertes Dokument"
- Beispiel: "Liste Ordner auf → sieh Dateien → verschiebe passende Dateien"

REGELN:
1. Antworte immer auf Deutsch, freundlich und verständlich.
2. Erkläre kurz was du tust, bevor du es tust.
3. Lösche NIEMALS Dateien ohne explizite Bestätigung des Benutzers.
4. Gib Aktionen als einzelne <action>...</action> Tags aus – mehrere Aktionen = mehrere Tags.
5. Nutze read_file und list_dir aktiv, um dir vor Schreib-Aktionen ein Bild zu machen.
6. write_file kann neue Textdateien erstellen oder bestehende überschreiben.
7. Im Vollautomatik-Modus werden nur "safe"-Aktionen automatisch ausgeführt, "review" und "risky" werden IMMER dem Nutzer zur Bestätigung vorgelegt – sei bei der Risiko-Einstufung also besonders ehrlich und nicht zu optimistisch.
8. Rühre niemals Ordner wie Windows, Programme/Program Files, AppData oder System32 an, selbst wenn sie technisch im Arbeitsordner liegen – stufe solche Vorschläge immer als "risky" ein und weise den Nutzer aktiv darauf hin.`

export interface PromptStats {
  totalFiles: number
  totalSize: number
  byType: { type: string; count: number; size: number }[]
}

export interface ExtendedContext {
  accessedFiles?: { name: string; path: string; accessedAt: number }[]
  recentActions?: { verb: string; target: string; time: string }[]
  stats?: PromptStats
  existingTags?: string[]
  taggedFiles?: { path: string; tags: string[] }[]
  persona?: string
}

const PERSONA_HINTS: Record<string, string> = {
  school: 'Der Nutzer verwendet den PC für Schule/Studium – achte besonders auf Hausarbeiten, Skripte, Vorlesungsunterlagen und Abgabefristen im Dateinamen.',
  photos: 'Der Nutzer sammelt viele Fotos – achte besonders auf Duplikate, unsortierte Bilder und sinnvolle Jahres-/Ereignis-Ordner.',
  invoices: 'Der Nutzer arbeitet viel mit Rechnungen – achte besonders auf PDF-Dateien mit "Rechnung"/"Invoice" im Namen und schlage einen Rechnungen-Ordner vor.',
  downloads_only: 'Der Nutzer möchte hauptsächlich nur den Downloads-Ordner aufgeräumt halten – halte Vorschläge einfach und auf Downloads fokussiert.'
}

function buildTreeForPrompt(entries: FileEntry[], depth = 0, maxDepth = 3, maxEntries = 500): string {
  let count = 0

  function build(nodes: FileEntry[], currentDepth: number): any[] {
    const result: any[] = []
    for (const node of nodes) {
      if (count >= maxEntries) {
        result.push({ _aggregated: `+${nodes.length - result.length} weitere...` })
        break
      }

      if (node.isFolder && currentDepth < maxDepth && node.children) {
        count++
        const children = build(node.children, currentDepth + 1)
        result.push({ name: node.name, type: 'folder', children })
      } else {
        count++
        result.push({ name: node.name, type: node.isFolder ? 'folder' : 'file' })
      }
    }
    return result
  }

  const tree = build(entries, depth)
  return JSON.stringify(tree, null, 2)
}

export function buildSystemPrompt(rootFolder?: string, fileTree?: FileEntry[], ctx?: ExtendedContext): string {
  if (!rootFolder) return BASE_PROMPT
  const list = fileTree && fileTree.length > 0
    ? buildTreeForPrompt(fileTree)
    : '(leer)'

  let statsSection = ''
  if (ctx?.stats) {
    const s = ctx.stats
    const sizeMB = (s.totalSize / 1024 / 1024).toFixed(1)
    const typeInfo = s.byType
      .slice(0, 4)
      .map(b => {
        const label = { pdf: 'PDF', doc: 'Dokumente', xls: 'Tabellen', ppt: 'Präsentationen', img: 'Bilder', other: 'Sonstige' }[b.type] ?? b.type
        return `${label}: ${b.count}`
      })
      .join(', ')
    statsSection = `\nORDNER-STATISTIK: ${s.totalFiles} Dateien · ${sizeMB} MB gesamt · ${typeInfo}`
  }

  let recentSection = ''
  if (ctx?.accessedFiles && ctx.accessedFiles.length > 0) {
    const names = ctx.accessedFiles.slice(0, 5).map(f => f.name).join(', ')
    recentSection = `\nZULETZT GEÖFFNET: ${names}`
  }

  let actionsSection = ''
  if (ctx?.recentActions && ctx.recentActions.length > 0) {
    const actions = ctx.recentActions.slice(0, 5).map(a => `${a.verb}: ${a.target}`).join(' · ')
    actionsSection = `\nLETZTE AKTIONEN: ${actions}`
  }

  let tagsSection = ''
  if (ctx?.existingTags && ctx.existingTags.length > 0) {
    tagsSection = `\nVORHANDENE TAGS: ${ctx.existingTags.join(', ')}`
  }
  if (ctx?.taggedFiles && ctx.taggedFiles.length > 0) {
    const lines = ctx.taggedFiles.slice(0, 20).map(f => {
      const name = f.path.split(/[/\\]/).pop() ?? f.path
      return `  ${name}: [${f.tags.join(', ')}]`
    }).join('\n')
    tagsSection += `\nGETAGGTE DATEIEN:\n${lines}`
  }

  let personaSection = ''
  if (ctx?.persona && PERSONA_HINTS[ctx.persona]) {
    personaSection = `\nNUTZERPROFIL: ${PERSONA_HINTS[ctx.persona]}`
  }

  return `${BASE_PROMPT}

AKTUELLER ARBEITSORDNER: ${rootFolder}
INHALT (bis Tiefe ${3}): ${list}${statsSection}${recentSection}${actionsSection}${tagsSection}${personaSection}`
}

export const SYSTEM_PROMPT = BASE_PROMPT
