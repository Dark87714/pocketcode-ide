#  PocketCode IDE

<div align="center">

  <h3>A powerful, lightweight, mobile-first code editor and development environment built for Android & Web.</h3>

  [![Release](https://img.shields.io/badge/Release-v1.0.6-007acc?style=for-the-badge)](https://github.com/Dark87714/pocketcode-ide/releases/latest)
  [![Platform](https://img.shields.io/badge/Platform-Android%20%7C%20Web-brightgreen?style=for-the-badge)](https://github.com/Dark87714/pocketcode-ide)
  [![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

  <br/><br/>

  <a href="https://github.com/Dark87714/pocketcode-ide/releases/download/v1.0.6/PocketCode-IDE-v1.0.6.apk" target="_blank">
    <img src="https://img.shields.io/badge/⬇️_DOWNLOAD_LATEST_APK-v1.0.6-2ea44f?style=for-the-badge&logo=android&logoColor=white&labelColor=238636" alt="Download APK v1.0.6" height="48"/>
  </a>
  &nbsp;&nbsp;
  <a href="https://github.com/Dark87714/pocketcode-ide/releases/latest" target="_blank">
    <img src="https://img.shields.io/badge/📦_GITHUB_RELEASES-v1.0.6-007acc?style=for-the-badge&logo=github&logoColor=white&labelColor=1f6feb" alt="GitHub Releases" height="48"/>
  </a>

</div>

---

## Features

- **Desktop-Grade Code Editor**: Powered by Monaco Editor with syntax highlighting, auto-completion, error linting, code formatting, and multiple tabs.
- **Ultra-Fast Cold Start**: Instant 0ms cache hydration and optimized code-splitting.
- **VS Code-Grade Project Workspace Hub**: Isolated per-project IndexedDB persistence, workspace switching, renaming, duplicating, and `.zip` export/import.
- **Direct Project Terminal**: Interactive terminal with real-time file tree syncing, project runner (`run`, `preview`, `code <file>`), and package management.
- **Compact & Adaptive Mobile Header**: Refined top bar with "More Actions" overflow menu for formatting, search, and split-editor on any screen size.
- **Custom Mobile Keybar**: Rapid access to programming symbols (`{`, `}`, `[`, `]`, `(`, `)`, `;`, `=>`, `"`, `'`, tabs, undo/redo) designed specifically for touch devices.
- **In-Browser & Local Execution**: Run Python code directly on-device using Pyodide (Wasm) and preview HTML/CSS/JS in real-time.
- **Extensions & Themes**: Support for customized themes, snippet packs, and developer tools.
- **Integrated File System & Git**: Full file explorer, project templates, search & replace, and git source control interface.
- **Native Android Integration**: Built using Capacitor for full on-device hardware acceleration and responsive mobile UI.

---

## 📱 Direct APK Download & Installation

### 1. Download Latest APK (v1.0.6)

| Version | Download Link | File Size | Platform |
| :--- | :--- | :--- | :--- |
| **v1.0.6 (Latest - Python Runner & Indentation Fixes)** | [**⬇️ Download `PocketCode-IDE-v1.0.6.apk`**](https://github.com/Dark87714/pocketcode-ide/releases/download/v1.0.6/PocketCode-IDE-v1.0.6.apk) | ~8.2 MB | Android 7.0+ |
| **v1.0.5** | [📦 Download `PocketCode-IDE-v1.0.5.apk`](https://github.com/Dark87714/pocketcode-ide/releases/download/v1.0.5/PocketCode-IDE-v1.0.5.apk) | ~8.2 MB | Android 7.0+ |
| **v1.0.4** | [📦 Download `PocketCode-IDE-v1.0.4.apk`](https://github.com/Dark87714/pocketcode-ide/releases/download/v1.0.4/PocketCode-IDE-v1.0.4.apk) | ~8.2 MB | Android 7.0+ |
| **v1.0.2** | [📦 Download `PocketCode-IDE-v1.0.2.apk`](https://github.com/Dark87714/pocketcode-ide/releases/download/v1.0.2/PocketCode-IDE-v1.0.2.apk) | ~7.2 MB | Android 7.0+ |

> 🔗 *You can also download assets from the [GitHub Releases Page](https://github.com/Dark87714/pocketcode-ide/releases).*

### 2. Install on Android
1. Open the downloaded `PocketCode-IDE-v1.0.6.apk` file on your Android device.
2. If prompted, enable **"Install from unknown sources"** in your browser/file manager settings.
3. Tap **Install** and launch **PocketCode IDE**!

---

##  Development Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or newer)
- [Android Studio](https://developer.android.com/studio) (for native Android builds)

### Installation

```bash
# Clone the repository
git clone https://github.com/Dark87714/pocketcode-ide.git

# Navigate to project folder
cd pocketcode-ide

# Install dependencies
npm install

# Start local web development server
npm run dev
```

### Build Android APK

```bash
# Build web production bundle
npm run build

# Sync assets with Capacitor Android
npx cap sync android

# Open project in Android Studio
npx cap open android
```

---

## License
This project is open source and available under the [MIT License](LICENSE).
