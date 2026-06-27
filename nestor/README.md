<div align="center">

<img src="resources/icon.svg" alt="Nestor Logo" width="80" />

# Nestor

**AI-powered file manager for Windows**

[![Version](https://img.shields.io/badge/version-1.0.0-blue?style=flat-square)](https://github.com/Liveplay01/Nestor/releases)
[![Platform](https://img.shields.io/badge/platform-Windows-0078D4?style=flat-square&logo=windows)](https://github.com/Liveplay01/Nestor/releases)
[![Electron](https://img.shields.io/badge/Electron-28-47848F?style=flat-square&logo=electron)](https://www.electronjs.org/)
[![License](https://img.shields.io/badge/license-private-lightgrey?style=flat-square)]()

Nestor is a desktop application that lets you manage and organize your files through a natural language AI chat interface. It runs fully locally using Ollama, keeping your data on your device — or connects to any OpenAI-compatible API if you prefer a cloud model.

[Download](#installation) · [Features](#features) · [Development](#development)

</div>

---

## Overview

Most file managers require you to know exactly where things are and what you want to do. Nestor flips this around: you describe what you need in plain language, and Nestor handles the rest. It understands your folder structure, suggests organization strategies, moves and renames files after your approval, and learns the context of your work session as the conversation grows.

The AI never acts without your confirmation. Every file operation — move, rename, delete — is shown as a reviewable action card before anything is executed.

---

## Features

### Natural Language File Operations

Ask Nestor to organize your desktop, find all invoices from 2024, sort photos by date, or clean up your Downloads folder. Nestor analyzes your file structure, explains its plan, and presents a list of proposed actions for you to approve before executing them.

### Privacy-First Local AI

Nestor runs entirely offline using [Ollama](https://ollama.com) with `llama3.2:3b` as the default model. No files, filenames, or folder paths are sent to any external server. Alternatively, you can connect any OpenAI-compatible API (OpenAI, Groq, local LM Studio, etc.) via a custom base URL and API key.

### File Tree and Explorer

A collapsible file tree panel shows the contents of your chosen root folder in real time. Files are color-coded by type and can be dragged directly into the chat window to add them as context. Right-click any file or folder for a context menu with rename, delete, copy, reveal in Explorer, and more.

### Context-Aware Chat

You can attach files to a message in two ways: drag them from the file tree into the chat, or type `@filename` to trigger an autocomplete menu. Attached files are read and included in the AI prompt so Nestor can reason about their contents.

### Action Review Panel

When the AI proposes file operations, they appear in a structured action panel above the input field. Each action is labeled and color-coded (create folder, move, rename, delete). You can approve all actions at once or dismiss them entirely. Nothing on disk changes until you confirm.

### Activity Log and Undo

Every executed action is logged in the Activity Log panel with a timestamp and description. The log persists across sessions and provides a clear audit trail of what Nestor has done.

### Anchor Points

You can bookmark any AI message as an anchor point — useful for saving a suggested folder structure or a specific piece of advice you want to refer back to later.

### Markdown Editor

Nestor includes a lightweight Markdown editor for `.md` files found in your folder tree. Open, edit, and save notes without leaving the application.

### Theming and Appearance

Nestor supports light and dark themes and offers six accent color presets (blue, violet, emerald, red, amber, pink). All color variables update live across the interface.

### Auto-Updater

Nestor checks for new releases on GitHub automatically and installs updates in the background via `electron-updater`.

---

## Screenshots

> Screenshots will be added here once the first public release is available.

| Chat Interface | File Explorer | Settings |
|---|---|---|
| _coming soon_ | _coming soon_ | _coming soon_ |

---

## Installation

Download the latest installer from the [Releases](https://github.com/Liveplay01/Nestor/releases) page.

```
Nestor Setup 1.0.0.exe
```

Run the installer, choose an installation directory, and launch Nestor. On first launch, the onboarding wizard guides you through choosing a local or API-based AI mode and selecting a root folder to work with.

**System Requirements**

| Component | Minimum |
|---|---|
| OS | Windows 10 / 11 (64-bit) |
| RAM | 4 GB (8 GB recommended for local AI) |
| Disk | 300 MB for the app + ~2 GB for the Ollama model |
| Ollama | Required for local AI mode — [ollama.com](https://ollama.com) |

---

## AI Setup

### Local Mode (Recommended)

Install [Ollama](https://ollama.com), then pull the default model:

```bash
ollama pull llama3.2:3b
```

Start Ollama and launch Nestor. The status indicator in the chat header will turn green when the connection is established.

### API Mode

In Settings, switch AI Mode to "External API", paste your API key, and optionally change the Base URL if you are using a provider other than OpenAI. Any OpenAI-compatible endpoint works (Groq, Together, LM Studio, etc.).

---

## Development

### Prerequisites

- [Node.js](https://nodejs.org) 20 or later
- [npm](https://www.npmjs.com) 10 or later

### Setup

```bash
git clone https://github.com/Liveplay01/Nestor.git
cd Nestor
npm install
```

### Run in Development Mode

```bash
npm run dev
```

This starts the Electron app with hot module reload via `electron-vite`. The main process and renderer both reload on file changes.

### Build

```bash
npm run dist:win
```

The installer and unpacked build are written to `dist/`.

### Project Structure

```
src/
  main/           Electron main process
    index.ts      App entry, window setup, IPC handlers
    ollama.ts     Ollama / external API streaming
    fs-manager.ts File system operations (move, rename, delete, read)
    ipc.ts        IPC bridge registration
    updater.ts    Auto-update via electron-updater
    onboarding.ts Onboarding step logic
  renderer/
    src/
      components/ All React UI components
      store/      Zustand global state
      lib/        Utilities, system prompt builder, file colors
  shared/
    types.ts      Shared TypeScript types
resources/
  icon.ico / icon.svg
```

---

## Technology Stack

| Layer | Technology |
|---|---|
| Framework | [Electron](https://electronjs.org) 28 |
| Bundler | [electron-vite](https://electron-vite.org) |
| UI | [React](https://react.dev) 18 + [TypeScript](https://www.typescriptlang.org) |
| Styling | [Tailwind CSS](https://tailwindcss.com) 3 |
| Animations | [Framer Motion](https://www.framer.com/motion) |
| State | [Zustand](https://zustand-demo.pmnd.rs) |
| Local AI | [Ollama](https://ollama.com) (`llama3.2:3b`) |
| API AI | OpenAI-compatible REST (streaming SSE) |
| Persistence | [electron-store](https://github.com/sindresorhus/electron-store) |
| File watching | [chokidar](https://github.com/paulmillr/chokidar) |
| Updates | [electron-updater](https://www.electron.build/auto-update) |
| Logging | [electron-log](https://github.com/megahertz/electron-log) |

---

## How It Works

Nestor's AI integration follows a simple but effective pattern. When you send a message, the renderer reads the current file tree and the selected root folder path, then calls `buildSystemPrompt()` to inject this context into the system prompt alongside Nestor's behavior rules. The message history (up to the last 100 messages) is passed as the conversation array.

The main process streams responses token by token from Ollama or the external API and forwards each token via IPC to the renderer. To avoid unnecessary React re-renders during streaming, tokens are written directly to the DOM using a `requestAnimationFrame` loop. Only when streaming completes does the final text enter the Zustand store in a single update.

File actions are embedded in AI responses as structured `<action>` JSON tags. The renderer parses these out of the response text, presents them in the Action Review Panel, and executes them only after user confirmation through the IPC file-system bridge.

---

## Release Notes

### v1.0.0 — Initial Release

This is the first public release of Nestor.

**Included in this release:**

- AI chat with full file operation support (create folder, move, rename, delete, read)
- Local AI via Ollama with `llama3.2:3b`
- External API support (OpenAI-compatible)
- File tree with real-time folder watching
- Drag-and-drop file context in chat
- `@filename` mention autocomplete
- Action Review Panel with one-click approval
- Activity Log with full history
- Anchor points for bookmarking AI responses
- Markdown editor
- Light / dark theme and six accent color presets
- Guided onboarding wizard
- Auto-updater via GitHub Releases

---

<div align="center">

Built with Electron, React, and Ollama.

</div>
