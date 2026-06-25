import { create } from 'zustand'
import type {
  Message,
  HistoryItem,
  AnchorPoint,
  AccessedFile,
  NavSection,
  Settings,
  FileEntry
} from '@shared/types'

interface NestorStore {
  // Settings
  settings: Settings | null
  setSettings: (s: Settings) => void
  patchSettings: (p: Partial<Settings>) => void

  // Navigation
  activeNav: NavSection
  setActiveNav: (nav: NavSection) => void

  // File tree
  fileTree: FileEntry[]
  setFileTree: (tree: FileEntry[]) => void
  openFolders: Set<string>
  toggleFolder: (path: string) => void

  // Chat
  messages: Message[]
  addMessage: (m: Message) => void
  appendToken: (id: string, token: string) => void
  finalizeMessage: (id: string) => void
  clearMessages: () => void
  isTyping: boolean
  setTyping: (v: boolean) => void
  chatTitle: string
  setChatTitle: (t: string) => void
  filesInContext: number
  setFilesInContext: (n: number) => void
  chatStartTime: string | null
  setChatStartTime: (t: string) => void

  // Activity log
  history: HistoryItem[]
  setHistory: (h: HistoryItem[]) => void
  addHistoryItem: (item: HistoryItem) => void
  markUndone: (id: string) => void

  anchors: AnchorPoint[]
  addAnchor: (a: AnchorPoint) => void

  accessedFiles: AccessedFile[]
  addAccessedFile: (f: AccessedFile) => void

  // Onboarding
  onboardingComplete: boolean
  setOnboardingComplete: (v: boolean) => void
}

export const useStore = create<NestorStore>((set) => ({
  settings: null,
  setSettings: (s) => set({ settings: s }),
  patchSettings: (p) =>
    set((state) => ({
      settings: state.settings ? { ...state.settings, ...p } : (p as Settings)
    })),

  activeNav: 'chat',
  setActiveNav: (nav) => set({ activeNav: nav }),

  fileTree: [],
  setFileTree: (tree) => set({ fileTree: tree }),
  openFolders: new Set(),
  toggleFolder: (path) =>
    set((state) => {
      const next = new Set(state.openFolders)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return { openFolders: next }
    }),

  messages: [],
  addMessage: (m) => set((state) => ({ messages: [...state.messages, m] })),
  appendToken: (id, token) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, text: m.text + token } : m
      )
    })),
  finalizeMessage: (id) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, isStreaming: false } : m
      )
    })),
  clearMessages: () =>
    set({ messages: [], chatTitle: 'Neuer Chat', chatStartTime: null, filesInContext: 0 }),
  isTyping: false,
  setTyping: (v) => set({ isTyping: v }),
  chatTitle: 'Wie kann ich helfen?',
  setChatTitle: (t) => set({ chatTitle: t }),
  filesInContext: 0,
  setFilesInContext: (n) => set({ filesInContext: n }),
  chatStartTime: null,
  setChatStartTime: (t) => set({ chatStartTime: t }),

  history: [],
  setHistory: (h) => set({ history: h }),
  addHistoryItem: (item) => set((state) => ({ history: [item, ...state.history] })),
  markUndone: (id) =>
    set((state) => ({
      history: state.history.map((h) => (h.id === id ? { ...h, undone: true } : h))
    })),

  anchors: [],
  addAnchor: (a) => set((state) => ({ anchors: [a, ...state.anchors] })),

  accessedFiles: [],
  addAccessedFile: (f) =>
    set((state) => {
      const exists = state.accessedFiles.some((x) => x.path === f.path)
      if (exists) return state
      return { accessedFiles: [f, ...state.accessedFiles].slice(0, 20) }
    }),

  onboardingComplete: false,
  setOnboardingComplete: (v) => set({ onboardingComplete: v })
}))
