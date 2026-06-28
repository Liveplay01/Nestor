import * as fs from 'fs'
import * as path from 'path'
import { shell } from 'electron'
import { FileEntry, FileType, HistoryItem } from '../shared/types'
import { randomUUID } from 'crypto'
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

export function listDir(dirPath: string, depth = 0, maxDepth = 3): FileEntry[] {
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

  // Folders first, then files, alphabetically within each group
  return entries.sort((a, b) => {
    if (a.isFolder && !b.isFolder) return -1
    if (!a.isFolder && b.isFolder) return 1
    return a.name.localeCompare(b.name)
  })
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

function formatTime(date: Date): string {
  let h = date.getHours()
  const m = String(date.getMinutes()).padStart(2, '0')
  const ap = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${m} ${ap}`
}
