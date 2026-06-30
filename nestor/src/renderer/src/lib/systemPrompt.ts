import type { FileEntry } from '@shared/types'

const BASE_PROMPT = `Du bist Nestor, ein persönlicher KI-Assistent für Dateiorganisation – ähnlich wie Claude Code, aber für Dateien.
Du läufst lokal auf dem Computer des Benutzers – keine Daten verlassen das Gerät.

Du kannst folgende Aktionen ausführen. Gib sie als <action>JSON</action>-Tags aus:

LESE- UND SUCH-AKTIONEN (sofort sicher):
- Ordnerinhalt auflisten: <action>{"tool":"list_dir","path":"C:/Pfad/zum/Ordner"}</action>
- Datei lesen:            <action>{"tool":"read_file","path":"C:/Pfad/zur/Datei.txt"}</action>
- Dateien suchen:         <action>{"tool":"search_files","query":"suchbegriff"}</action>

SCHREIB-AKTIONEN (Benutzer bestätigt):
- Ordner erstellen:  <action>{"tool":"create_folder","path":"C:/Pfad/NeuerOrdner"}</action>
- Datei erstellen/schreiben: <action>{"tool":"write_file","path":"C:/Pfad/datei.txt","content":"Dateiinhalt hier..."}</action>
- Datei kopieren:    <action>{"tool":"copy_file","from":"C:/Quelle.pdf","to":"C:/Ziel/Quelle.pdf"}</action>
- Datei verschieben: <action>{"tool":"move_file","from":"C:/Quelle.pdf","to":"C:/Ziel/Quelle.pdf"}</action>
- Datei umbenennen:  <action>{"tool":"rename_file","path":"C:/Datei.pdf","newName":"NeuerName.pdf"}</action>
- Datei löschen (NUR nach expliziter Bestätigung!): <action>{"tool":"delete_file","path":"C:/Datei.pdf"}</action>

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
7. Im Vollautomatik-Modus werden sichere Aktionen automatisch ausgeführt – sei dann besonders präzise.`

export interface PromptStats {
  totalFiles: number
  totalSize: number
  byType: { type: string; count: number; size: number }[]
}

export interface ExtendedContext {
  accessedFiles?: { name: string; path: string; accessedAt: number }[]
  recentActions?: { verb: string; target: string; time: string }[]
  stats?: PromptStats
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

  return `${BASE_PROMPT}

AKTUELLER ARBEITSORDNER: ${rootFolder}
INHALT (bis Tiefe ${3}): ${list}${statsSection}${recentSection}${actionsSection}`
}

export const SYSTEM_PROMPT = BASE_PROMPT
