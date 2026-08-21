#  PocketCode IDE

<div align="center">

  <h3>A powerful, lightweight, mobile-first code editor and development environment built for Android & Web.</h3>

  [![Release](https://img.shields.io/github/v/release/Dark87714/pocketcode-ide?style=for-the-badge&color=007acc)](https://github.com/Dark87714/pocketcode-ide/releases/latest)
  [![Platform](https://img.shields.io/badge/Platform-Android%20%7C%20Web-brightgreen?style=for-the-badge)](https://github.com/Dark87714/pocketcode-ide)
  [![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

  <br/><br/>

  <a href="https://github.com/Dark87714/pocketcode-ide/raw/main/PocketCode-IDE-v1.0.0.apk">
    <img src="https://img.shields.io/badge/Download%20APK-v1.0.0-success?style=for-the-badge&logo=android&logoColor=white" alt="Download APK" height="40"/>
  </a>

</div>

---

## Features

- **Desktop-Grade Code Editor**: Powered by Monaco Editor with syntax highlighting, auto-completion, error linting, code formatting, and multiple tabs.
- **Ultra-Fast Cold Start**: Instant 0ms cache hydration and optimized code-splitting.
- **VS Code-Grade Project Workspace Hub**: Isolated per-project IndexedDB persistence, workspace switching, renaming, duplicating, and `.zip` export/import.
- **Direct Project Terminal**: Interactive terminal with real-time file tree syncing, project runner (`run`, `preview`, `code <file>`), and package management.
- **Custom Mobile Keybar**: Rapid access to programming symbols (`{`, `}`, `[`, `]`, `(`, `)`, `;`, `=>`, `"`, `'`, tabs, undo/redo) designed specifically for touch devices.
- **In-Browser & Local Execution**: Run Python code directly on-device using Pyodide (Wasm) and preview HTML/CSS/JS in real-time.
- **Extensions & Themes**: Support for customized themes, snippet packs, and developer tools.
- **Integrated File System & Git**: Full file explorer, project templates, search & replace, and git source control interface.
- **Native Android Integration**: Built using Capacitor for full on-device hardware acceleration and responsive mobile UI.

---

## Direct APK Download & Installation

### 1. Download the APK
Click the button below to download the latest updated `.apk` package:

👉 **[Download PocketCode IDE v1.0.0 (Direct APK)](https://github.com/Dark87714/pocketcode-ide/raw/main/PocketCode-IDE-v1.0.0.apk)**  
📦 **[View APK File in Repository](https://github.com/Dark87714/pocketcode-ide/blob/main/PocketCode-IDE-v1.0.0.apk)**

### 2. Install on Android
1. Open the downloaded `PocketCode-IDE-v1.0.0.apk` file on your Android device.
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
