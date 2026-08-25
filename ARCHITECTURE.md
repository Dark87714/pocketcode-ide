# PocketCode IDE — Architectural Model & Capability Matrix

## 1. System Philosophy

PocketCode IDE is designed as an offline-first mobile and desktop-grade development environment for Android and Web. To maintain reliability, trust, and predictability, all subsystems have strictly separated responsibilities.

```
+-----------------------------------------------------------------------+
|                            PocketCode IDE                             |
+-----------------------------------------------------------------------+
                                   |
    +------------------------------+-------------------------------+
    |                              |                               |
[ProjectStore]            [Runtime / Execution]           [Build & Packaging]
  - Single Source of Truth  - Local JS / Web Worker         - Web Bundler
  - Canonical Filesystem    - Local Pyodide (WASM)          - Compose Visual Preview
  - IndexedDB Persistence   - SQLite (WASM engine)          - Android Gradle Toolchain
  - Save Queue & Mutex      - Remote Compilers (Piston)     - Native APK Signer / SDK
  - Crash Snapshots                |
                                   |
                             [Git Engine]
                               - isomorphic-git
                               - VirtualGitFS
                               - Real Stash & Branches
```

---

## 2. Capabilities & Boundaries Matrix

| Capability | Real Engine / Technology | Boundary & Reality |
| :--- | :--- | :--- |
| **Web IDE & Editor** | Monaco Editor + React 18 | Fully local, offline-capable in-browser editor with intellisense and formatting. |
| **File Persistence** | IndexedDB (Primary) + Local Backups | Transactional save queue with auto-recovery snapshots. |
| **Compose UI** | `ComposeTranspilerService` (Visual Preview) | **Visual Approximation**: Transpiles subset of Composable annotations to responsive HTML/CSS for instant UI prototyping. Real compilation requires Gradle. |
| **Android APK** | Native Gradle Toolchain / Android SDK | **Production APK**: Builds real Android APKs through standard Gradle/AAPT2/D8 toolchain. |
| **Git Engine** | `realGitService` (`isomorphic-git`) | Real Git repository model backing commit trees, diffs, branches, stashes, and remotes. |
| **JavaScript / TS** | Web Worker Sandbox | Local evaluation with memory/time watchdogs and capability boundaries. |
| **Python** | Pyodide (WebAssembly) | Local Python 3.11 execution in browser memory with standard library and scientific packages. |
| **SQLite** | SQLite WASM (`oo1.DB`) | Real SQLite engine in browser memory with statement tokenization and persistent export. |
| **Native Languages** | `compilerService` (Piston Remote API) | Remote compilation for C++, Java, Rust, Go with explicit network indication. |
| **AI Assistant** | Gemini API (`aiService`) | Multi-turn coding assistance with token management and context bounding. |

---

## 3. Core Subsystems

### `ProjectStore` (`src/services/projectStore.ts`)
The single source of truth for the active project, file tree, open tabs, and dirty state. Eliminates state divergence between UI components and background engines.

### `PersistenceService` (`src/services/persistenceService.ts`)
Primary storage using IndexedDB tables (`projects`, `files`, `recovery_snapshots`, `git_stashes`). Provides atomic transactional saving and save queues with retry locks.

### `PathUtils` (`src/utils/pathUtils.ts`)
Ensures canonical path normalization across all operating systems and UI actions. Rejects path traversal (`..`), empty names, duplicate sibling entries, and illegal characters.

### `RealGitService` (`src/services/realGitService.ts`)
Direct Git engine utilizing `isomorphic-git`. Supports staging, committing, branching, merge/checkout, real working tree stashing, and remote push/pull.
