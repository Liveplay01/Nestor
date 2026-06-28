export type FileType = 'folder' | 'pdf' | 'doc' | 'xls' | 'ppt' | 'img' | 'other'

export interface FileEntry {
  name: string
  path: string
  type: FileType
  isFolder: boolean
  children?: FileEntry[]
  isRecentlyCreated?: boolean
}

export type MessageRole = 'user' | 'ai'

export interface FileChip {
  name: string
  path: string
  color: string
}

export interface Message {
  id: string
  role: MessageRole
  text: string
  text2?: string
  chips?: FileChip[]
  time?: string
  isStreaming?: boolean
  errorAction?: { label: string; nav: NavSection }
}

export type HistoryActionType = 'create_folder' | 'create_file' | 'move_file' | 'rename_file' | 'delete_file'

export interface HistoryItem {
  id: string
  type: HistoryActionType
  verb: string
  target: string
  time: string
  timestamp: number
  undone: boolean
  from?: string
  to?: string
  path?: string
  snapshotBase64?: string
}

export interface AnchorPoint {
  id: string
  text: string
  time: string
  messageId: string
}

export interface AccessedFile {
  name: string
  path: string
  color: string
  accessedAt: number
}

export type NavSection = 'home' | 'files' | 'chat' | 'settings' | 'help'

export type Theme = 'light' | 'dark'

export interface OpenMarkdownFile {
  path: string
  name: string
}

export type AiMode = 'local' | 'api' | null

export type OnboardingStep =
  | 'check'
  | 'choose-ai-mode'
  | 'install-ollama'
  | 'pull-model'
  | 'choose-folder'
  | 'done'

export interface OnboardingProgress {
  step: OnboardingStep
  title: string
  description: string
  percent: number
  statusText: string
  speedText?: string
}

export interface Settings {
  rootFolder: string
  model: string
  language: string
  accentColor: string
  onboardingComplete: boolean
  aiMode: AiMode
  apiKey?: string
  apiBaseUrl?: string
  theme: Theme
  notifications: boolean
}

export interface OllamaStatus {
  installed: boolean
  running: boolean
  hasModel: boolean
}

export interface OllamaChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface FsResult<T = void> {
  ok: boolean
  data?: T
  error?: string
}

export interface ToastItem {
  id: string
  type: 'success' | 'error' | 'info'
  message: string
  duration?: number
}
