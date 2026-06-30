import * as fs from 'fs'
import * as path from 'path'
import { shell } from 'electron'
import { FileEntry, FileType, HistoryItem, DuplicateGroup, DuplicateFile, FolderStats, LargeFile, FileTypeBreakdown, SearchResult } from '../shared/types'
import { randomUUID, createHash } from 'crypto'
import log from './logger'

export function getFileType(filePath: string): FileType {
  const ext = path.extname(filePath).toLowerCase().slice(1)
  if (ext === 'pdf') return 'pdf'
  if (['doc', 'docx', 'txt', 'md', 'rtf'].includes(ext)) return 'doc'
  if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) return 'xls'
  if (['ppt', 'pptx', 'key', 'odp'].includes(ext)) return 'ppt'
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'ico'].includes(ext)) return 'img'
  return 'other'
}

export function listDir(dirPath: string, depth = 0, maxDepth = 3, limit?: number, offset = 0): FileEntry[] {
  if (!fs.existsSync(dirPath)) return []
  const entries: FileEntry[] = []
  let items: string[]
  try {
    items = fs.readdirSync(dirPath)
  } catch {
    return []
  }

  for (const name of items) {
    if (name.startsWith('.')) continue
    const fullPath = path.join(dirPath, name)
    let stat: fs.Stats
    try {
      stat = fs.statSync(fullPath)
    } catch {
      continue
    }

    if (stat.isDirectory()) {
      const entry: FileEntry = {
        name,
        path: fullPath,
        type: 'folder',
        isFolder: true,
        children: depth < maxDepth ? listDir(fullPath, depth + 1, maxDepth) : []
      }
      entries.push(entry)
    } else {
      entries.push({
        name,
        path: fullPath,
        type: getFileType(fullPath),
        isFolder: false
      })
    }
  }

  const sorted = entries.sort((a, b) => {
    if (a.isFolder && !b.isFolder) return -1
    if (!a.isFolder && b.isFolder) return 1
    return a.name.localeCompare(b.name)
  })

  if (limit !== undefined) {
    return sorted.slice(offset, offset + limit)
  }

  return sorted
}

export function readFile(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  const textExts = ['.txt', '.md', '.rtf', '.csv', '.json', '.js', '.ts', '.html', '.css']
  if (!textExts.includes(ext)) return `[Binary file: ${path.basename(filePath)}]`
  try {
    return fs.readFileSync(filePath, 'utf-8')
  } catch (err) {
    return `[Fehler beim Lesen: ${(err as Error).message}]`
  }
}

export function createFolder(folderPath: string): HistoryItem {
  fs.mkdirSync(folderPath, { recursive: true })
  return {
    id: randomUUID(),
    type: 'create_folder',
    verb: 'Ordner erstellt',
    target: path.basename(folderPath),
    time: formatTime(new Date()),
    timestamp: Date.now(),
    undone: false,
    path: folderPath
  }
}

export function assertWithinRoot(rootPath: string, targetPath: string): void {
  if (!rootPath) {
    throw new Error('No root folder configured. Select a folder first.')
  }
  const root = path.resolve(rootPath)
  const target = path.resolve(targetPath)
  if (target !== root && !target.startsWith(root + path.sep)) {
    throw new Error(`Access denied: "${target}" is outside the root folder`)
  }
}

export function copyFile(from: string, to: string): HistoryItem {
  fs.copyFileSync(from, to)
  const fromName = path.basename(from)
  const toDir = path.basename(path.dirname(to))
  return {
    id: randomUUID(),
    type: 'move_file',
    verb: 'Kopiert',
    target: `${fromName} → ${toDir}`,
    time: formatTime(new Date()),
    timestamp: Date.now(),
    undone: false,
    from,
    to
  }
}

export function moveFile(from: string, to: string): HistoryItem {
  try {
    fs.renameSync(from, to)
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'EXDEV') {
      fs.copyFileSync(from, to)
      fs.unlinkSync(from)
    } else {
      throw err
    }
  }
  const fromName = path.basename(from)
  const toDir = path.basename(path.dirname(to))
  return {
    id: randomUUID(),
    type: 'move_file',
    verb: 'Verschoben',
    target: `${fromName} → ${toDir}`,
    time: formatTime(new Date()),
    timestamp: Date.now(),
    undone: false,
    from,
    to
  }
}

export function renameFile(filePath: string, newName: string): HistoryItem {
  const dir = path.dirname(filePath)
  const newPath = path.join(dir, newName)
  const oldName = path.basename(filePath)
  fs.renameSync(filePath, newPath)
  return {
    id: randomUUID(),
    type: 'rename_file',
    verb: 'Umbenannt',
    target: `${oldName} → ${newName}`,
    time: formatTime(new Date()),
    timestamp: Date.now(),
    undone: false,
    from: filePath,
    to: newPath
  }
}

export async function deleteFile(filePath: string): Promise<HistoryItem> {
  await shell.trashItem(filePath)
  return {
    id: randomUUID(),
    type: 'delete_file',
    verb: 'Gelöscht',
    target: path.basename(filePath),
    time: formatTime(new Date()),
    timestamp: Date.now(),
    undone: false,
    path: filePath
  }
}

export function undoAction(item: HistoryItem): void {
  try {
    switch (item.type) {
      case 'move_file':
      case 'rename_file':
        if (item.from && item.to) fs.renameSync(item.to, item.from)
        break
      case 'create_folder':
        if (item.path && fs.existsSync(item.path)) {
          const entries = fs.readdirSync(item.path)
          if (entries.length === 0) fs.rmdirSync(item.path)
        }
        break
      case 'create_file':
        if (item.path && fs.existsSync(item.path)) {
          fs.unlinkSync(item.path)
        }
        break
      case 'delete_file':
        if (item.path && item.snapshotBase64) {
          const buf = Buffer.from(item.snapshotBase64, 'base64')
          fs.writeFileSync(item.path, buf)
        }
        break
    }
  } catch (err) {
    log.error('[undoAction]', err)
    throw err
  }
}

export async function searchFiles(rootPath: string, query: string): Promise<FileEntry[]> {
  const results: FileEntry[] = []
  const q = query.toLowerCase()

  async function walk(dir: string, depth: number): Promise<void> {
    if (depth > 3) return
    let items: string[]
    try {
      items = await fs.promises.readdir(dir)
    } catch {
      return
    }
    for (const name of items) {
      if (name.startsWith('.')) continue
      const fullPath = path.join(dir, name)
      let stat: fs.Stats
      try {
        stat = await fs.promises.stat(fullPath)
      } catch {
        continue
      }
      if (name.toLowerCase().includes(q)) {
        results.push({
          name,
          path: fullPath,
          type: stat.isDirectory() ? 'folder' : getFileType(fullPath),
          isFolder: stat.isDirectory()
        })
      }
      if (stat.isDirectory()) await walk(fullPath, depth + 1)
    }
  }

  await walk(rootPath, 0)
  return results.slice(0, 50)
}

export async function findDuplicates(rootFolder: string): Promise<DuplicateGroup[]> {
  const files: { path: string; name: string; size: number }[] = []

  function walk(dir: string, depth: number): void {
    if (depth > 4) return
    let items: string[]
    try { items = fs.readdirSync(dir) } catch { return }
    for (const name of items) {
      if (name.startsWith('.')) continue
      const fullPath = path.join(dir, name)
      let stat: fs.Stats
      try { stat = fs.statSync(fullPath) } catch { continue }
      if (stat.isDirectory()) {
        walk(fullPath, depth + 1)
      } else if (stat.size > 0) {
        files.push({ path: fullPath, name, size: stat.size })
      }
    }
  }

  walk(rootFolder, 0)

  // Pre-filter: only compare files with the same size
  const bySize = new Map<number, typeof files>()
  for (const f of files) {
    const group = bySize.get(f.size) ?? []
    group.push(f)
    bySize.set(f.size, group)
  }

  const duplicates: DuplicateGroup[] = []

  for (const [size, group] of bySize) {
    if (group.length < 2) continue
    const byHash = new Map<string, DuplicateFile[]>()
    for (const f of group) {
      try {
        const buf = fs.readFileSync(f.path)
        const hash = createHash('md5').update(buf).digest('hex')
        const stat = fs.statSync(f.path)
        const arr = byHash.get(hash) ?? []
        arr.push({ path: f.path, name: f.name, modified: stat.mtimeMs })
        byHash.set(hash, arr)
      } catch { continue }
    }
    for (const [hash, dupeFiles] of byHash) {
      if (dupeFiles.length >= 2) {
        duplicates.push({ hash, size, files: dupeFiles })
      }
    }
  }

  return duplicates.sort((a, b) => b.size * b.files.length - a.size * a.files.length)
}

export interface StorageInsight {
  totalSize: number
  oldFiles: number
  downloadsFileCount: number
}

export function analyzeStorage(rootFolder: string, downloadsPath: string): StorageInsight {
  const stats = analyzeFolder(rootFolder)
  let downloadsFileCount = 0
  try {
    const items = fs.readdirSync(downloadsPath)
    downloadsFileCount = items.filter(f => !f.startsWith('.')).length
  } catch {}

  return {
    totalSize: stats.totalSize,
    oldFiles: stats.oldFiles.length,
    downloadsFileCount
  }
}

export function analyzeFolder(rootFolder: string): FolderStats {
  let totalFiles = 0
  let totalFolders = 0
  let totalSize = 0
  const byType = new Map<FileType, { count: number; size: number }>()
  const allFiles: { path: string; name: string; size: number; modified: number }[] = []
  const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000

  function walk(dir: string, depth: number): void {
    if (depth > 4) return
    let items: string[]
    try { items = fs.readdirSync(dir) } catch { return }
    for (const name of items) {
      if (name.startsWith('.')) continue
      const fullPath = path.join(dir, name)
      let stat: fs.Stats
      try { stat = fs.statSync(fullPath) } catch { continue }
      if (stat.isDirectory()) {
        totalFolders++
        walk(fullPath, depth + 1)
      } else {
        totalFiles++
        totalSize += stat.size
        const type = getFileType(fullPath)
        const existing = byType.get(type) ?? { count: 0, size: 0 }
        byType.set(type, { count: existing.count + 1, size: existing.size + stat.size })
        allFiles.push({ path: fullPath, name, size: stat.size, modified: stat.mtimeMs })
      }
    }
  }

  walk(rootFolder, 0)

  const largestFiles: LargeFile[] = [...allFiles]
    .sort((a, b) => b.size - a.size)
    .slice(0, 10)
    .map(f => ({ path: f.path, name: f.name, size: f.size, modified: f.modified }))

  const oldFiles: LargeFile[] = allFiles
    .filter(f => f.modified < oneYearAgo)
    .sort((a, b) => a.modified - b.modified)
    .slice(0, 20)
    .map(f => ({ path: f.path, name: f.name, size: f.size, modified: f.modified }))

  const fileTypes: FileType[] = ['pdf', 'doc', 'xls', 'ppt', 'img', 'other']
  const breakdown: FileTypeBreakdown[] = fileTypes
    .filter(type => byType.has(type))
    .map(type => ({ type, ...byType.get(type)! }))
    .sort((a, b) => b.size - a.size)

  return { totalFiles, totalFolders, totalSize, byType: breakdown, largestFiles, oldFiles }
}

const TEXT_EXTENSIONS = new Set([
  '.txt', '.md', '.json', '.csv', '.xml', '.html', '.htm', '.js', '.ts',
  '.jsx', '.tsx', '.css', '.scss', '.yaml', '.yml', '.toml', '.ini', '.log',
  '.py', '.rb', '.java', '.c', '.cpp', '.h', '.rs', '.go', '.sh', '.bat'
])

export async function searchFullText(rootPath: string, query: string): Promise<SearchResult[]> {
  const q = query.toLowerCase()
  const filePaths: { filePath: string; name: string }[] = []

  function collectFiles(dir: string, depth: number): void {
    if (depth > 4) return
    let items: string[]
    try { items = fs.readdirSync(dir) } catch { return }
    for (const name of items) {
      if (name.startsWith('.')) continue
      const fullPath = path.join(dir, name)
      let stat: fs.Stats
      try { stat = fs.statSync(fullPath) } catch { continue }
      if (stat.isDirectory()) {
        collectFiles(fullPath, depth + 1)
      } else if (TEXT_EXTENSIONS.has(path.extname(name).toLowerCase()) && stat.size < 2 * 1024 * 1024) {
        filePaths.push({ filePath: fullPath, name })
      }
    }
  }

  collectFiles(rootPath, 0)

  const results: SearchResult[] = []

  const processFile = async (filePath: string, name: string): Promise<SearchResult | null> => {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8')
      const lines = content.split('\n')
      let firstMatch = -1
      let matchCount = 0
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes(q)) {
          if (firstMatch === -1) firstMatch = i
          matchCount++
        }
      }
      if (firstMatch === -1) return null
      const preview = lines[firstMatch].trim().slice(0, 120)
      return {
        file: { name, path: filePath, type: getFileType(filePath), isFolder: false },
        lineNumber: firstMatch + 1,
        linePreview: preview,
        matchCount
      }
    } catch {
      return null
    }
  }

  // Process in batches of 20 parallel reads
  for (let i = 0; i < filePaths.length && results.length < 60; i += 20) {
    const batch = filePaths.slice(i, i + 20)
    const batchResults = await Promise.all(batch.map(f => processFile(f.filePath, f.name)))
    for (const r of batchResults) {
      if (r) results.push(r)
      if (results.length >= 60) break
    }
  }

  return results.sort((a, b) => b.matchCount - a.matchCount)
}

export function runMoveByAge(sourceFolder: string, targetFolder: string, ageInDays: number): { moved: number } {
  const cutoff = Date.now() - ageInDays * 24 * 60 * 60 * 1000
  let moved = 0
  let items: string[]
  try { items = fs.readdirSync(sourceFolder) } catch { return { moved } }

  fs.mkdirSync(targetFolder, { recursive: true })

  for (const name of items) {
    if (name.startsWith('.')) continue
    const fullPath = path.join(sourceFolder, name)
    let stat: fs.Stats
    try { stat = fs.statSync(fullPath) } catch { continue }
    if (!stat.isDirectory() && stat.mtimeMs < cutoff) {
      const dest = path.join(targetFolder, name)
      try {
        fs.renameSync(fullPath, dest)
        moved++
      } catch {
        try { fs.copyFileSync(fullPath, dest); fs.unlinkSync(fullPath); moved++ } catch {}
      }
    }
  }
  return { moved }
}

export function runSortByType(sourceFolder: string): { moved: number } {
  const typeToFolder: Record<string, string> = {
    pdf: 'Dokumente', doc: 'Dokumente', xls: 'Tabellen', ppt: 'Präsentationen',
    img: 'Bilder', other: 'Sonstiges'
  }
  let moved = 0
  let items: string[]
  try { items = fs.readdirSync(sourceFolder) } catch { return { moved } }

  for (const name of items) {
    if (name.startsWith('.')) continue
    const fullPath = path.join(sourceFolder, name)
    let stat: fs.Stats
    try { stat = fs.statSync(fullPath) } catch { continue }
    if (stat.isDirectory()) continue
    const type = getFileType(fullPath)
    const folderName = typeToFolder[type] ?? 'Sonstiges'
    const destDir = path.join(sourceFolder, folderName)
    fs.mkdirSync(destDir, { recursive: true })
    const dest = path.join(destDir, name)
    if (dest === fullPath) continue
    try {
      fs.renameSync(fullPath, dest)
      moved++
    } catch {
      try { fs.copyFileSync(fullPath, dest); fs.unlinkSync(fullPath); moved++ } catch {}
    }
  }
  return { moved }
}

export function runDeleteEmptyFolders(rootFolder: string): { deleted: number } {
  let deleted = 0

  function deleteIfEmpty(dir: string): boolean {
    let items: string[]
    try { items = fs.readdirSync(dir) } catch { return false }
    // Process children first (bottom-up)
    for (const name of items) {
      const fullPath = path.join(dir, name)
      let stat: fs.Stats
      try { stat = fs.statSync(fullPath) } catch { continue }
      if (stat.isDirectory()) deleteIfEmpty(fullPath)
    }
    // Re-check after removing children
    let remaining: string[]
    try { remaining = fs.readdirSync(dir) } catch { return false }
    if (remaining.length === 0 && dir !== rootFolder) {
      try { fs.rmdirSync(dir); deleted++; return true } catch {}
    }
    return false
  }

  deleteIfEmpty(rootFolder)
  return { deleted }
}

function formatTime(date: Date): string {
  let h = date.getHours()
  const m = String(date.getMinutes()).padStart(2, '0')
  const ap = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${m} ${ap}`
}
