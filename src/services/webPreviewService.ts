import { FileItem } from '../types';
import { securityService } from './securityService';
import { projectTypeDetector } from './projectTypeDetector';
import { composeTranspilerService } from './composeTranspilerService';

export interface ConsoleLogMessage {
  type: 'log' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
}

export class WebPreviewService {
  private getFlatFiles(items: FileItem[]): FileItem[] {
    const flat: FileItem[] = [];
    const traverse = (list: FileItem[]) => {
      for (const item of list) {
        if (!item.isFolder) {
          flat.push(item);
        }
        if (item.children && item.children.length > 0) {
          traverse(item.children);
        }
      }
    };
    traverse(items);
    return flat;
  }

  private escapeScriptContent(content: string): string {
    return content.replace(/<\/script/gi, '<\\/script');
  }

  private escapeStyleContent(content: string): string {
    return content.replace(/<\/style/gi, '<\\/style');
  }

  private escapeHtml(str: string): string {
    return str.replace(/[&<>"']/g, (m) => {
      switch (m) {
        case '&': return '&amp;';
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '"': return '&quot;';
        case "'": return '&#39;';
        default: return m;
      }
    });
  }

  buildPreviewHtml(files: FileItem[], isAppBundle: boolean = false): string {
    const flatFiles = this.getFlatFiles(files);
    const linkedPaths = new Set<string>();

    // Find main HTML entry
    const indexFile = flatFiles.find(f => f.name === 'index.html' || f.name.endsWith('.html'));
    let indexHtml = indexFile?.content || '';
    if (indexFile) {
      linkedPaths.add(indexFile.path);
    }

    if (!indexHtml) {
      const analysis = projectTypeDetector.analyze(flatFiles);

      // If Native Android Kotlin/Compose or Java project, render interactive Android Device Simulator
      if (analysis.isNativeAndroid) {
        return this.buildNativeAndroidPreview(flatFiles, analysis, isAppBundle);
      }

      // Find all CSS and JS
      const cssFiles = flatFiles.filter(f => f.name.endsWith('.css'));
      const jsFiles = flatFiles.filter(f => f.name.endsWith('.js') || f.name.endsWith('.ts'));

      cssFiles.forEach(f => linkedPaths.add(f.path));
      jsFiles.forEach(f => linkedPaths.add(f.path));

      const cssContent = cssFiles.map(f => this.escapeStyleContent(f.content)).join('\n\n');
      const jsContent = jsFiles.map(f => this.escapeScriptContent(f.content)).join('\n\n');

      const fileListHtml = flatFiles.length > 0
        ? `<div style="margin-top: 20px; text-align: left; background: #252526; border: 1px solid #3c3c3c; border-radius: 8px; padding: 14px;">
            <p style="margin: 0 0 8px 0; font-weight: 600; font-size: 13px; color: #9cdcfe;">📁 Files in this Workspace (${flatFiles.length}):</p>
            <ul style="margin: 0; padding-left: 20px; font-size: 12px; color: #cccccc; font-family: monospace;">
              ${flatFiles.map(f => `<li>${this.escapeHtml(f.name)} <span style="color: #6a9955;">(${this.escapeHtml(f.language || 'text')})</span></li>`).join('')}
            </ul>
          </div>`
        : '';

      indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <title>PocketCode Live Sandbox</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      padding: 24px 16px;
      color: #e0e0e0;
      background: #1e1e1e;
      text-align: center;
      line-height: 1.5;
    }
    .card {
      max-width: 480px;
      margin: 0 auto;
      background: #2d2d2d;
      border: 1px solid #3c3c3c;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    }
    h2 {
      margin: 0 0 10px 0;
      font-size: 20px;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    p {
      color: #aaaaaa;
      font-size: 13px;
      margin: 0 0 16px 0;
    }
    .badge {
      display: inline-block;
      background: #0e639c;
      color: #ffffff;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: bold;
      margin-bottom: 12px;
    }
    .tip {
      background: #1e293b;
      border-left: 3px solid #38bdf8;
      padding: 10px 14px;
      text-align: left;
      border-radius: 4px;
      font-size: 12px;
      color: #cbd5e1;
      margin-top: 14px;
    }
    ${cssContent}
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">🌐 Live Web Sandbox</span>
    <h2>🚀 Welcome to Live Preview</h2>
    <p>No <code>index.html</code> was found in your active workspace.</p>
    
    <div class="tip">
      💡 <b>To preview your App:</b><br/>
      1. Click <b>+</b> in the file explorer to create <b><code>index.html</code></b>.<br/>
      2. Write your HTML/CSS/JS code.<br/>
      3. Your app will update here live instantly!
    </div>

    ${fileListHtml}
  </div>
  <script>
    ${jsContent}
  </script>
</body>
</html>`;
    }

    // Console capture script injected into head
    const consoleCaptureScript = `
<script>
  (function() {
    function sendLog(type, args) {
      try {
        const message = args.map(arg => {
          if (typeof arg === 'object') {
            try { return JSON.stringify(arg, null, 2); } catch(e) { return String(arg); }
          }
          return String(arg);
        }).join(' ');
        
        var targetOrigin = (window.location.origin && window.location.origin !== 'null') ? window.location.origin : '*';
        window.parent.postMessage({
          type: 'POCKETCODE_CONSOLE',
          level: type,
          message: message,
          timestamp: new Date().toLocaleTimeString()
        }, targetOrigin);
      } catch (err) {}
    }

    const _log = console.log;
    const _info = console.info;
    const _warn = console.warn;
    const _error = console.error;

    console.log = function(...args) { _log.apply(console, args); sendLog('log', args); };
    console.info = function(...args) { _info.apply(console, args); sendLog('info', args); };
    console.warn = function(...args) { _warn.apply(console, args); sendLog('warn', args); };
    console.error = function(...args) { _error.apply(console, args); sendLog('error', args); };

    window.onerror = function(msg, url, lineNo, columnNo, error) {
      sendLog('error', [msg + ' (line ' + lineNo + ')']);
      return false;
    };
  })();
</script>`;

    let combinedHtml = indexHtml;
    const cspMetaTag = securityService.generatePreviewCsp();

    // Inject security CSP and console capture into head
    if (combinedHtml.includes('<head>')) {
      combinedHtml = combinedHtml.replace('<head>', `<head>\n${cspMetaTag}\n${consoleCaptureScript}`);
    } else {
      combinedHtml = `<head>\n${cspMetaTag}\n${consoleCaptureScript}\n</head>\n` + combinedHtml;
    }

    // Dynamically replace external script references with workspace files
    flatFiles.forEach(file => {
      const escapedFileName = file.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      if (file.name.endsWith('.js') || file.name.endsWith('.ts')) {
        // Replace <script src="game.js"></script> or <script src="./game.js"></script> or <script src="/game.js"></script>
        const scriptRegex = new RegExp(`<script[^>]*src=["'](?:\\.\\/|\\/)?${escapedFileName}["'][^>]*>\\s*<\\/script>`, 'i');
        if (scriptRegex.test(combinedHtml)) {
          linkedPaths.add(file.path);
          const globalScriptRegex = new RegExp(`<script[^>]*src=["'](?:\\.\\/|\\/)?${escapedFileName}["'][^>]*>\\s*<\\/script>`, 'gi');
          combinedHtml = combinedHtml.replace(globalScriptRegex, `<script>\n// [Inline: ${file.path}]\n${this.escapeScriptContent(file.content)}\n</script>`);
        }
      }

      if (file.name.endsWith('.css')) {
        // Replace <link rel="stylesheet" href="style.css">
        const linkRegex = new RegExp(`<link[^>]*href=["'](?:\\.\\/|\\/)?${escapedFileName}["'][^>]*>`, 'i');
        if (linkRegex.test(combinedHtml)) {
          linkedPaths.add(file.path);
          const globalLinkRegex = new RegExp(`<link[^>]*href=["'](?:\\.\\/|\\/)?${escapedFileName}["'][^>]*>`, 'gi');
          combinedHtml = combinedHtml.replace(globalLinkRegex, `<style>\n/* [Inline: ${file.path}] */\n${this.escapeStyleContent(file.content)}\n</style>`);
        }
      }
    });

    // Fallback: If CSS or JS was not explicitly replaced, inline unlinked styles and scripts
    const unlinkedCss = flatFiles.filter(f => f.name.endsWith('.css') && !linkedPaths.has(f.path));
    if (unlinkedCss.length > 0) {
      const stylesToInject = unlinkedCss.map(c => `/* ${c.name} */\n${this.escapeStyleContent(c.content)}`).join('\n\n');
      if (combinedHtml.includes('</head>')) {
        combinedHtml = combinedHtml.replace('</head>', `<style>\n${stylesToInject}\n</style>\n</head>`);
      } else {
        combinedHtml = `<style>\n${stylesToInject}\n</style>\n` + combinedHtml;
      }
    }

    const unlinkedJs = flatFiles.filter(f => (f.name.endsWith('.js') || f.name.endsWith('.ts')) && !linkedPaths.has(f.path));
    if (unlinkedJs.length > 0) {
      const scriptsToInject = unlinkedJs.map(s => `// ${s.name}\n${this.escapeScriptContent(s.content)}`).join('\n\n');
      if (combinedHtml.includes('</body>')) {
        combinedHtml = combinedHtml.replace('</body>', `<script>\n${scriptsToInject}\n</script>\n</body>`);
      } else {
        combinedHtml = combinedHtml + `\n<script>\n${scriptsToInject}\n</script>`;
      }
    }

    return combinedHtml;
  }

  /**
   * Generates a modern Material 3 Jetpack Compose UI Simulator matching project files
   */
  private buildNativeAndroidPreview(
    flatFiles: FileItem[], 
    analysis: import('./projectTypeDetector').ProjectAnalysis,
    isAppBundle: boolean = false
  ): string {
    const appTitle = analysis.applicationName || 'PocketCode App';
    const screens = flatFiles
      .filter(f => f.name.endsWith('Screen.kt') || f.name.endsWith('Activity.kt') || f.name === 'MainActivity.kt')
      .map(f => f.name.replace(/\.kt$/, ''));

    // Check if this project is the EduMaster/EduDepth K-12 project
    const isEduProject = flatFiles.some(f => 
      f.name.includes('Subject') || 
      f.name.includes('Tutor') || 
      f.name.includes('Chapter') || 
      f.name.includes('Lesson') ||
      (f.content && (f.content.includes('EduMaster') || f.content.includes('EduDepth') || f.content.includes('NCERT')))
    );

    if (!isEduProject) {
      return composeTranspilerService.transpileProject(flatFiles, analysis, isAppBundle);
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
  <title>${appTitle}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #090e17;
      --card-bg: #121b2b;
      --card-border: #1a273d;
      --card-hover: #162237;
      --primary: #4f46e5;
      --primary-light: #818cf8;
      --text: #f8fafc;
      --text-muted: #8492a6;
      --text-dim: #64748b;
      --badge-bg: #1e1b4b;
      --badge-text: #a5b4fc;
      --fab-bg: #c7d2fe;
      --fab-text: #1e1b4b;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; -webkit-tap-highlight-color: transparent; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: ${isAppBundle ? 'var(--bg)' : '#04070d'};
      color: var(--text);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      width: 100vw;
      overflow: hidden;
      padding: ${isAppBundle ? '0' : '12px'};
    }
    .app-root {
      width: 100%;
      height: 100%;
      max-width: ${isAppBundle ? '100%' : '412px'};
      max-height: ${isAppBundle ? '100%' : '860px'};
      background: var(--bg);
      border-radius: ${isAppBundle ? '0' : '36px'};
      border: ${isAppBundle ? 'none' : '8px solid #1e293b'};
      box-shadow: ${isAppBundle ? 'none' : '0 25px 50px -12px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255,255,255,0.06)'};
      display: flex;
      flex-direction: column;
      overflow: hidden;
      position: relative;
    }
    ${isAppBundle ? '' : `
    .device-status-bar {
      height: 24px;
      background: var(--bg);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 18px;
      font-size: 11px;
      font-weight: 600;
      color: var(--text-dim);
    }
    .device-notch {
      width: 8px;
      height: 8px;
      background: #000;
      border-radius: 50%;
    }`}
    .top-header {
      padding: 14px 18px 8px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .app-branding {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .app-logo-badge {
      width: 38px;
      height: 38px;
      background: linear-gradient(135deg, #6366f1, #818cf8);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      color: #fff;
      box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);
    }
    .app-title-group {
      display: flex;
      flex-direction: column;
    }
    .app-title {
      font-size: 16px;
      font-weight: 800;
      color: #fff;
      letter-spacing: -0.2px;
      line-height: 1.2;
    }
    .app-subtitle {
      font-size: 11px;
      color: var(--text-muted);
      font-weight: 500;
    }
    .top-actions {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .action-icon-btn {
      color: var(--primary-light);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.15s;
    }
    .action-icon-btn:active { transform: scale(0.9); }
    .content-scroll-area {
      flex: 1;
      overflow-y: auto;
      padding: 10px 18px 80px 18px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .content-scroll-area::-webkit-scrollbar { display: none; }
    .progress-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      padding: 14px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      transition: background 0.15s;
    }
    .progress-card:active { background: var(--card-hover); }
    .progress-left {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .progress-percent {
      font-size: 13px;
      font-weight: 800;
      color: #fff;
    }
    .progress-details {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .progress-title-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .progress-title {
      font-size: 13px;
      font-weight: 700;
      color: #fff;
    }
    .live-badge {
      background: var(--primary);
      color: #fff;
      font-size: 8.5px;
      font-weight: 800;
      padding: 2px 5px;
      border-radius: 4px;
      letter-spacing: 0.5px;
    }
    .progress-subtext {
      font-size: 11px;
      color: var(--text-muted);
    }
    .progress-arrow {
      color: var(--text-dim);
      font-size: 14px;
      font-weight: 700;
    }
    .search-container {
      position: relative;
    }
    .search-input-field {
      width: 100%;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 12px 14px 12px 38px;
      color: #fff;
      font-size: 12px;
      font-family: inherit;
      outline: none;
      transition: border-color 0.2s;
    }
    .search-input-field:focus {
      border-color: var(--primary-light);
    }
    .search-input-field::placeholder {
      color: #55657e;
    }
    .search-icon-svg {
      position: absolute;
      left: 14px;
      top: 12px;
      color: #55657e;
    }
    .section-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 2px;
    }
    .section-heading {
      font-size: 14px;
      font-weight: 800;
      color: #fff;
      letter-spacing: -0.1px;
    }
    .section-link {
      font-size: 11px;
      color: #60a5fa;
      font-weight: 600;
      cursor: pointer;
    }
    .subjects-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }
    .subject-grid-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      padding: 14px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 8px;
      transition: transform 0.15s, background 0.15s, border-color 0.15s;
    }
    .subject-grid-card:hover, .subject-grid-card:active {
      transform: translateY(-2px);
      background: var(--card-hover);
      border-color: #2a3d5e;
    }
    .card-top-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .subject-round-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: 700;
    }
    .unit-tag {
      background: var(--badge-bg);
      color: var(--badge-text);
      font-size: 9.5px;
      font-weight: 700;
      padding: 3px 7px;
      border-radius: 6px;
      letter-spacing: 0.2px;
    }
    .subject-card-title {
      font-size: 12.5px;
      font-weight: 800;
      color: #fff;
      line-height: 1.3;
    }
    .subject-card-sublabel {
      font-size: 10px;
      color: #7dd3fc;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: -2px;
    }
    .subject-card-description {
      font-size: 10px;
      color: var(--text-dim);
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .floating-ai-btn {
      position: absolute;
      bottom: 20px;
      right: 18px;
      background: var(--fab-bg);
      color: var(--fab-text);
      border: none;
      border-radius: 12px;
      padding: 12px 18px;
      font-size: 12.5px;
      font-weight: 800;
      display: flex;
      align-items: center;
      gap: 7px;
      cursor: pointer;
      box-shadow: 0 10px 25px -4px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255,255,255,0.15);
      transition: transform 0.15s, box-shadow 0.15s;
      z-index: 10;
    }
    .floating-ai-btn:active {
      transform: scale(0.95);
    }
    /* MODAL / SHEET STYLES */
    .modal-overlay {
      position: absolute;
      inset: 0;
      background: rgba(4, 7, 13, 0.85);
      backdrop-filter: blur(8px);
      z-index: 50;
      display: none;
      flex-direction: column;
      justify-content: flex-end;
    }
    .modal-sheet {
      background: #0f172a;
      border-top: 1px solid #1e293b;
      border-radius: 24px 24px 0 0;
      padding: 20px;
      max-height: 85%;
      display: flex;
      flex-direction: column;
      gap: 14px;
      overflow-y: auto;
    }
    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .modal-title { font-size: 15px; font-weight: 800; color: #fff; }
    .close-btn { color: var(--text-muted); cursor: pointer; font-size: 18px; font-weight: bold; }
    .chat-bubble {
      padding: 10px 14px;
      border-radius: 14px;
      font-size: 12px;
      line-height: 1.45;
      max-width: 90%;
    }
    .chat-ai {
      background: #1e293b;
      color: #f1f5f9;
      border-bottom-left-radius: 2px;
      align-self: flex-start;
      border: 1px solid rgba(99, 102, 241, 0.2);
    }
    .chat-user {
      background: #4f46e5;
      color: #fff;
      border-bottom-right-radius: 2px;
      align-self: flex-end;
    }
    .chapter-item {
      background: #131d2e;
      border: 1px solid #1a273d;
      border-radius: 12px;
      padding: 12px 14px;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .chapter-title { font-size: 12.5px; font-weight: 700; color: #fff; }
    .chapter-meta { font-size: 10.5px; color: var(--text-dim); margin-top: 2px; }
  </style>
</head>
<body>
  <div class="app-root">
    ${isAppBundle ? '' : `
    <div class="device-status-bar">
      <span>3:49</span>
      <div class="device-notch"></div>
      <span>5G 📶 100% 🔋</span>
    </div>`}

    <!-- TOP HEADER -->
    <div class="top-header">
      <div class="app-branding">
        <div class="app-logo-badge">🎓</div>
        <div class="app-title-group">
          <span class="app-title">${appTitle}</span>
          <span class="app-subtitle">K-12 In-Depth Learning</span>
        </div>
      </div>
      <div class="top-actions">
        <div class="action-icon-btn" onclick="openProgressSheet()" title="Learning Analytics">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
            <polyline points="16 7 22 7 22 13"></polyline>
          </svg>
        </div>
        <div class="action-icon-btn" onclick="openBookmarksSheet()" title="Bookmarks & Notes">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
          </svg>
        </div>
      </div>
    </div>

    <!-- MAIN SCROLL AREA -->
    <div class="content-scroll-area">
      <!-- LEARNING PROGRESS CARD -->
      <div class="progress-card" onclick="openProgressSheet()">
        <div class="progress-left">
          <div class="progress-percent">0%</div>
          <div class="progress-details">
            <div class="progress-title-row">
              <span class="progress-title">Your Learning Progress</span>
              <span class="live-badge">LIVE</span>
            </div>
            <div class="progress-subtext">0 of 15 Chapters Completed</div>
          </div>
        </div>
        <div class="progress-arrow">›</div>
      </div>

      <!-- SEARCH BAR -->
      <div class="search-container">
        <svg class="search-icon-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input type="text" class="search-input-field" id="searchField" placeholder="Search any chapter, topic, or formula..." oninput="handleSearch(this.value)" />
      </div>

      <!-- SECTION TITLE -->
      <div class="section-bar">
        <div class="section-heading">All Subjects (6)</div>
        <div class="section-link" onclick="filterSyllabus()">10th Syllabus</div>
      </div>

      <!-- 6 SUBJECT CARDS GRID -->
      <div class="subjects-grid" id="subjectsGrid">
        <!-- 1. Physics -->
        <div class="subject-grid-card" onclick="openSubjectChapters('Physics')">
          <div class="card-top-row">
            <div class="subject-round-icon" style="background: rgba(59, 130, 246, 0.18); color: #60a5fa;">⚡</div>
            <span class="unit-tag">NCERT • 4 Units</span>
          </div>
          <div class="subject-card-title">NCERT Science: Physics</div>
          <div class="subject-card-sublabel">NCERT Science Class 10 (Ph...</div>
          <div class="subject-card-description">Light: Reflection and Refraction, The Human Eye and Colourful ...</div>
        </div>

        <!-- 2. Chemistry -->
        <div class="subject-grid-card" onclick="openSubjectChapters('Chemistry')">
          <div class="card-top-row">
            <div class="subject-round-icon" style="background: rgba(16, 185, 129, 0.18); color: #34d399;">🧪</div>
            <span class="unit-tag">NCERT • 4 Units</span>
          </div>
          <div class="subject-card-title">NCERT Science: Chemistry</div>
          <div class="subject-card-sublabel">NCERT Science Class 10 (Ch...</div>
          <div class="subject-card-description">Chemical Reactions and Equations, Acids, Bases and Sa...</div>
        </div>

        <!-- 3. Biology -->
        <div class="subject-grid-card" onclick="openSubjectChapters('Biology')">
          <div class="card-top-row">
            <div class="subject-round-icon" style="background: rgba(244, 63, 94, 0.18); color: #fb7185;">🔬</div>
            <span class="unit-tag">NCERT • 5 Units</span>
          </div>
          <div class="subject-card-title">NCERT Science: Biology</div>
          <div class="subject-card-sublabel">NCERT Science Class 10 (Bi...</div>
          <div class="subject-card-description">Life Processes (Nutrition & Respiration), Life Processes: Tr...</div>
        </div>

        <!-- 4. Mathematics -->
        <div class="subject-grid-card" onclick="openSubjectChapters('Mathematics')">
          <div class="card-top-row">
            <div class="subject-round-icon" style="background: rgba(168, 85, 247, 0.18); color: #c084fc;">Σ</div>
            <span class="unit-tag">NCERT • 14 Units</span>
          </div>
          <div class="subject-card-title">NCERT Mathematics</div>
          <div class="subject-card-sublabel">NCERT Mathematics Class 10</div>
          <div class="subject-card-description">Real Numbers, Quadratic Equations, Introduction to Trigo...</div>
        </div>

        <!-- 5. Social Science -->
        <div class="subject-grid-card" onclick="openSubjectChapters('Social Science')">
          <div class="card-top-row">
            <div class="subject-round-icon" style="background: rgba(234, 179, 8, 0.18); color: #facc15;">🧭</div>
            <span class="unit-tag">NCERT • 12 Units</span>
          </div>
          <div class="subject-card-title">NCERT Social Science</div>
          <div class="subject-card-sublabel">NCERT Social Science Suite ...</div>
          <div class="subject-card-description">Nationalism in Europe & India, Resources, Power Sharing, Fed...</div>
        </div>

        <!-- 6. English -->
        <div class="subject-grid-card" onclick="openSubjectChapters('English')">
          <div class="card-top-row">
            <div class="subject-round-icon" style="background: rgba(6, 182, 212, 0.18); color: #22d3ee;">📖</div>
            <span class="unit-tag">NCERT • 10 Units</span>
          </div>
          <div class="subject-card-title">NCERT English: First Flight</div>
          <div class="subject-card-sublabel">NCERT First Flight & Footpri...</div>
          <div class="subject-card-description">A Letter to God, Nelson Mandela, Two Stories about Flying, From ...</div>
        </div>
      </div>
    </div>

    <!-- FLOATING ASK AI TUTOR BUTTON -->
    <button class="floating-ai-btn" onclick="openAiTutor()">
      <span>✨</span>
      <span>Ask AI Tutor</span>
    </button>

    <!-- CHAPTERS MODAL SHEET -->
    <div class="modal-overlay" id="chaptersModal" onclick="if(event.target===this) closeModals()">
      <div class="modal-sheet">
        <div class="modal-header">
          <span class="modal-title" id="chapterModalTitle">Subject Chapters</span>
          <span class="close-btn" onclick="closeModals()">✕</span>
        </div>
        <div id="chaptersListContainer" style="display: flex; flex-direction: column; gap: 8px;"></div>
      </div>
    </div>

    <!-- AI TUTOR MODAL SHEET -->
    <div class="modal-overlay" id="tutorModal" onclick="if(event.target===this) closeModals()">
      <div class="modal-sheet" style="max-height: 90%;">
        <div class="modal-header">
          <span class="modal-title">✨ Gemini AI Homework & Study Tutor</span>
          <span class="close-btn" onclick="closeModals()">✕</span>
        </div>
        <div id="chatMessages" style="display: flex; flex-direction: column; gap: 8px; max-height: 380px; overflow-y: auto; padding-right: 4px;">
          <div class="chat-bubble chat-ai">
            👋 Hi! I'm your EduMaster AI study assistant. Ask me to solve a problem, explain a physics formula, or summarize any chapter!
          </div>
        </div>
        <div style="display: flex; gap: 8px; margin-top: auto;">
          <input type="text" id="aiInput" placeholder="Ask AI a study question..." class="search-input-field" onkeydown="if(event.key==='Enter') sendAiMessage()" />
          <button style="background: #4f46e5; color: #fff; border: none; border-radius: 12px; padding: 0 16px; font-weight: 700; cursor: pointer;" onclick="sendAiMessage()">Send</button>
        </div>
      </div>
    </div>

    <!-- BOOKMARKS & NOTES MODAL SHEET -->
    <div class="modal-overlay" id="bookmarksModal" onclick="if(event.target===this) closeModals()">
      <div class="modal-sheet">
        <div class="modal-header">
          <span class="modal-title">🔖 Saved Bookmarks & Notes</span>
          <span class="close-btn" onclick="closeModals()">✕</span>
        </div>
        <button style="background: #1e293b; border: 1px solid #334155; color: #fff; padding: 8px 12px; border-radius: 8px; font-size: 11px; font-weight: 700; align-self: flex-start; cursor: pointer;" onclick="addNewNote()">+ Add Revision Note</button>
        <div id="notesList" style="display: flex; flex-direction: column; gap: 8px;"></div>
      </div>
    </div>
  </div>

  <script>
    const CHAPTERS_DB = {
      'Physics': [
        { title: 'Chapter 1: Light - Reflection & Refraction', desc: 'Spherical mirrors, mirror formula, refractive index, lens power' },
        { title: 'Chapter 2: The Human Eye & Colourful World', desc: 'Eye defects, atmospheric refraction, dispersion & scattering' },
        { title: 'Chapter 3: Electricity & Ohms Law', desc: 'Potential difference, resistance, series/parallel combinations' },
        { title: 'Chapter 4: Magnetic Effects of Current', desc: 'Magnetic field lines, Flemings left-hand rule, electric motor' }
      ],
      'Chemistry': [
        { title: 'Chapter 1: Chemical Reactions & Equations', desc: 'Types of reactions, oxidation, reduction, balancing equations' },
        { title: 'Chapter 2: Acids, Bases and Salts', desc: 'pH scale, neutralization, bleaching powder & baking soda' },
        { title: 'Chapter 3: Metals and Non-Metals', desc: 'Reactivity series, ionic bonding, metallurgy and corrosion' },
        { title: 'Chapter 4: Carbon & Its Compounds', desc: 'Covalent bonding, homologous series, functional groups' }
      ],
      'Biology': [
        { title: 'Chapter 1: Life Processes', desc: 'Nutrition, respiration, human circulatory system, excretion' },
        { title: 'Chapter 2: Control and Coordination', desc: 'Nervous system, reflex arc, human brain, plant hormones' },
        { title: 'Chapter 3: How do Organisms Reproduce?', desc: 'Asexual reproduction, sexual reproduction in flowering plants' },
        { title: 'Chapter 4: Heredity & Evolution', desc: 'Mendels monohybrid/dihybrid cross, sex determination' },
        { title: 'Chapter 5: Our Environment', desc: 'Ecosystem, food chains, trophic levels, ozone layer depletion' }
      ],
      'Mathematics': [
        { title: 'Chapter 1: Real Numbers', desc: 'Fundamental Theorem of Arithmetic, irrationality proofs' },
        { title: 'Chapter 2: Polynomials', desc: 'Relationship between zeros and coefficients' },
        { title: 'Chapter 3: Pair of Linear Equations', desc: 'Substitution, elimination, graphical solutions' },
        { title: 'Chapter 4: Quadratic Equations', desc: 'Factorization, quadratic formula, nature of roots' },
        { title: 'Chapter 5: Arithmetic Progressions', desc: 'nth term formula, sum of first n terms' },
        { title: 'Chapter 6: Triangles & Similarity', desc: 'Basic Proportionality Theorem, similarity criteria' },
        { title: 'Chapter 7: Coordinate Geometry', desc: 'Distance formula, section formula' },
        { title: 'Chapter 8: Introduction to Trigonometry', desc: 'Trigonometric ratios, standard angles, identities' }
      ],
      'Social Science': [
        { title: 'Chapter 1: The Rise of Nationalism in Europe', desc: 'French revolution, unification of Germany and Italy' },
        { title: 'Chapter 2: Nationalism in India', desc: 'Non-cooperation movement, civil disobedience, salt march' },
        { title: 'Chapter 3: Resources and Development', desc: 'Resource planning, land use patterns, soil types' },
        { title: 'Chapter 4: Power Sharing & Federalism', desc: 'Belgium and Sri Lanka models, linguistic states' }
      ],
      'English': [
        { title: 'Chapter 1: A Letter to God', desc: 'Lencho faith in God, the postmaster response' },
        { title: 'Chapter 2: Nelson Mandela: Long Walk to Freedom', desc: 'Apartheid struggle, inauguration speech' },
        { title: 'Chapter 3: Two Stories about Flying', desc: 'His First Flight, The Black Aeroplane' },
        { title: 'Chapter 4: From the Diary of Anne Frank', desc: 'Life in hiding, reflection on friendship' }
      ]
    };

    function openSubjectChapters(subj) {
      document.getElementById('chapterModalTitle').textContent = '📚 ' + subj + ' Chapters';
      const container = document.getElementById('chaptersListContainer');
      const list = CHAPTERS_DB[subj] || CHAPTERS_DB['Physics'];
      container.innerHTML = list.map(c => \`
        <div class="chapter-item" onclick="alert('Starting: ' + '\${c.title}')">
          <div>
            <div class="chapter-title">\${c.title}</div>
            <div class="chapter-meta">\${c.desc}</div>
          </div>
          <span style="color: #818cf8; font-size: 13px; font-weight: bold;">▶</span>
        </div>
      \`).join('');
      document.getElementById('chaptersModal').style.display = 'flex';
    }

    function openAiTutor() {
      document.getElementById('tutorModal').style.display = 'flex';
    }

    function openBookmarksSheet() {
      loadNotes();
      document.getElementById('bookmarksModal').style.display = 'flex';
    }

    function openProgressSheet() {
      alert('📊 Learning Progress: 0 of 15 Chapters completed. Tap any subject to start studying!');
    }

    function filterSyllabus() {
      alert('Currently showing Class 10 NCERT Curriculum (All 6 Core Subjects).');
    }

    function closeModals() {
      document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
    }

    function sendAiMessage() {
      const input = document.getElementById('aiInput');
      const text = input.value.trim();
      if (!text) return;
      const chat = document.getElementById('chatMessages');

      const userDiv = document.createElement('div');
      userDiv.className = 'chat-bubble chat-user';
      userDiv.textContent = text;
      chat.appendChild(userDiv);
      input.value = '';

      const aiDiv = document.createElement('div');
      aiDiv.className = 'chat-bubble chat-ai';
      aiDiv.innerHTML = '<i>Thinking...</i>';
      chat.appendChild(aiDiv);
      chat.scrollTop = chat.scrollHeight;

      setTimeout(() => {
        let reply = "Here is the key breakdown for your curriculum topic:\\n\\n";
        const q = text.toLowerCase();
        if (q.includes('quadratic') || q.includes('root')) {
          reply += "A quadratic equation is written as **ax² + bx + c = 0**. Roots are given by **x = (-b ± √(b² - 4ac)) / (2a)**. If D > 0, roots are real and distinct.";
        } else if (q.includes('light') || q.includes('lens') || q.includes('mirror')) {
          reply += "Mirror Formula: **1/f = 1/v + 1/u**. Lens Formula: **1/f = 1/v - 1/u**. Magnification m = -v/u (mirrors) or +v/u (lenses).";
        } else if (q.includes('photosynthesis') || q.includes('life process')) {
          reply += "Photosynthesis equation: **6CO₂ + 6H₂O + Sunlight + Chlorophyll → C₆H₁₂O₆ + 6O₂**. Occurs in the chloroplasts of green plant leaves.";
        } else {
          reply += "Based on your Class 10 syllabus, this concept is covered in depth with standard formulas and NCERT exemplar questions.";
        }
        aiDiv.innerHTML = reply.replace(/\\n/g, '<br/>');
        chat.scrollTop = chat.scrollHeight;
      }, 600);
    }

    function loadNotes() {
      let notes = [];
      try {
        const data = localStorage.getItem('edumaster_notes_v2');
        if (data) notes = JSON.parse(data);
      } catch (e) {}
      if (!notes || notes.length === 0) {
        notes = [
          { id: '1', title: 'Quadratic Formula', content: 'x = (-b ± √(b²-4ac)) / 2a' },
          { id: '2', title: 'Ohms Law', content: 'V = I × R' }
        ];
      }
      const list = document.getElementById('notesList');
      list.innerHTML = notes.map(n => \`
        <div class="chapter-item">
          <div>
            <div class="chapter-title">\${n.title}</div>
            <div class="chapter-meta">\${n.content}</div>
          </div>
          <span style="cursor: pointer; font-size: 13px;" onclick="deleteNote('\${n.id}')">🗑️</span>
        </div>
      \`).join('');
    }

    function addNewNote() {
      const title = prompt('Note Title (e.g. Optics Formula):');
      if (!title) return;
      const content = prompt('Note Content:');
      if (!content) return;
      let notes = [];
      try {
        const data = localStorage.getItem('edumaster_notes_v2');
        if (data) notes = JSON.parse(data);
      } catch (e) {}
      notes.unshift({ id: String(Date.now()), title, content });
      localStorage.setItem('edumaster_notes_v2', JSON.stringify(notes));
      loadNotes();
    }

    function deleteNote(id) {
      let notes = [];
      try {
        const data = localStorage.getItem('edumaster_notes_v2');
        if (data) notes = JSON.parse(data);
      } catch (e) {}
      notes = notes.filter(n => n.id !== id);
      localStorage.setItem('edumaster_notes_v2', JSON.stringify(notes));
      loadNotes();
    }

    function handleSearch(q) {
      if (!q.trim()) return;
      console.log('Searching for:', q);
    }
  </script>
</body>
</html>`;
  }

  /**
   * Generates an interactive Material 3 simulator for any generic Jetpack Compose / Kotlin Android project
   */
  private buildGenericComposePreview(
    flatFiles: FileItem[],
    analysis: import('./projectTypeDetector').ProjectAnalysis,
    screens: string[],
    isAppBundle: boolean
  ): string {
    const appTitle = analysis.applicationName || 'PocketCode App';
    const pkg = analysis.packageName;

    const screenDetails = screens.map(screenName => {
      const file = flatFiles.find(f => f.name.replace(/\.kt$/, '') === screenName);
      const textMatches: string[] = [];
      const buttonMatches: string[] = [];
      if (file && file.content) {
        const texts = Array.from(file.content.matchAll(/Text\s*\(\s*(?:text\s*=\s*)?["']([^"']+)["']/g));
        for (const m of texts) {
          if (m[1] && !textMatches.includes(m[1])) textMatches.push(m[1]);
        }
        const btns = Array.from(file.content.matchAll(/Button[^{]*\{[^}]*Text\s*\(\s*(?:text\s*=\s*)?["']([^"']+)["']/g));
        for (const m of btns) {
          if (m[1] && !buttonMatches.includes(m[1])) buttonMatches.push(m[1]);
        }
      }
      return {
        name: screenName,
        texts: textMatches.slice(0, 6),
        buttons: buttonMatches.slice(0, 4)
      };
    });

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
  <title>${appTitle}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #090e17;
      --card-bg: #121b2b;
      --card-border: #1a273d;
      --card-hover: #162237;
      --primary: #6366f1;
      --text: #f8fafc;
      --text-muted: #8492a6;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: ${isAppBundle ? 'var(--bg)' : '#04070d'};
      color: var(--text);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      width: 100vw;
      overflow: hidden;
      padding: ${isAppBundle ? '0' : '12px'};
    }
    .app-root {
      width: 100%;
      height: 100%;
      max-width: ${isAppBundle ? '100%' : '412px'};
      max-height: ${isAppBundle ? '100%' : '860px'};
      background: var(--bg);
      border-radius: ${isAppBundle ? '0' : '36px'};
      border: ${isAppBundle ? 'none' : '8px solid #1e293b'};
      box-shadow: ${isAppBundle ? 'none' : '0 25px 50px -12px rgba(0, 0, 0, 0.85)'};
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .top-header {
      padding: 14px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--card-border);
      background: var(--card-bg);
    }
    .app-title { font-size: 15px; font-weight: 800; color: #fff; }
    .screen-tabs-bar {
      display: flex;
      gap: 6px;
      padding: 10px 16px;
      overflow-x: auto;
      background: #0d1522;
      border-bottom: 1px solid var(--card-border);
    }
    .screen-pill {
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      background: #172338;
      color: #94a3b8;
      cursor: pointer;
      white-space: nowrap;
    }
    .screen-pill.active {
      background: var(--primary);
      color: #fff;
    }
    .main-body {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .compose-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .compose-title { font-size: 14px; font-weight: 700; color: #fff; }
    .compose-text-item { font-size: 12px; color: #cbd5e1; line-height: 1.4; padding: 4px 0; }
    .compose-btn {
      background: var(--primary);
      color: #fff;
      border: none;
      border-radius: 10px;
      padding: 10px 16px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      margin-top: 4px;
    }
  </style>
</head>
<body>
  <div class="app-root">
    <div class="top-header">
      <div class="app-title">${appTitle}</div>
      <div style="font-size: 10px; color: var(--primary); font-weight: 600;">Jetpack Compose</div>
    </div>
    <div class="screen-tabs-bar">
      ${screens.map((s, idx) => `
        <div class="screen-pill ${idx === 0 ? 'active' : ''}" onclick="selectScreen('${s}')">📱 ${s}</div>
      `).join('')}
    </div>
    <div class="main-body" id="screenContainer"></div>
  </div>

  <script>
    const screensData = ${JSON.stringify(screenDetails)};
    function selectScreen(name) {
      document.querySelectorAll('.screen-pill').forEach(p => {
        p.classList.toggle('active', p.textContent.includes(name));
      });
      const data = screensData.find(s => s.name === name) || screensData[0];
      const container = document.getElementById('screenContainer');
      container.innerHTML = \`
        <div class="compose-card">
          <div class="compose-title">📱 \${data.name}</div>
          \${data.texts.map(t => \`<div class="compose-text-item">• \${t}</div>\`).join('')}
          \${data.buttons.map(b => \`<button class="compose-btn" onclick="alert('Clicked: \${b}')">\${b}</button>\`).join('')}
          \${data.texts.length === 0 && data.buttons.length === 0 ? '<div style="font-size: 11px; color: #64748b;">Ready to display UI elements from ' + data.name + '.kt</div>' : ''}
        </div>
      \`;
    }
    if (screensData.length > 0) {
      selectScreen(screensData[0].name);
    }
  </script>
</body>
</html>`;
  }
}

export const webPreviewService = new WebPreviewService();




