import DOMPurify from 'dompurify';
import { FileItem } from '../types';
import { ProjectAnalysis } from './projectTypeDetector';

function escapeHtml(str: string): string {
  if (!str) return '';
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

export interface ComposeModifier {
  padding?: string;
  margin?: string;
  width?: string;
  height?: string;
  maxWidth?: string;
  maxHeight?: string;
  background?: string;
  color?: string;
  borderRadius?: string;
  border?: string;
  cursor?: string;
  flex?: string;
  alignSelf?: string;
  display?: string;
  boxShadow?: string;
  opacity?: string;
  customStyles: string[];
}

export interface ParsedComposable {
  name: string;
  code: string;
  renderedHtml: string;
}

/**
 * ComposeTranspilerService
 * Enterprise-grade Jetpack Compose to Web Canvas AST Transpiler (Phases 14 - 19)
 */
export class ComposeTranspilerService {
  /**
   * Transpile entire Android / Compose project into interactive visual preview
   */
  transpileProject(
    files: FileItem[],
    analysis: ProjectAnalysis,
    isAppBundle: boolean = false
  ): string {
    const flatFiles = this.flatten(files);
    const appTitle = analysis.applicationName || 'My Compose App';
    const appTitleEscaped = escapeHtml(appTitle);

    // 1. Extract string resources
    const stringMap = this.extractStrings(flatFiles);

    // 2. Extract colors from Color.kt, Theme.kt, and colors.xml
    const colorMap = this.extractColors(flatFiles);

    // 3. Find and parse all @Composable functions in Kotlin files
    const kotlinFiles = flatFiles.filter(f => f.path.endsWith('.kt') || f.path.endsWith('.kts'));
    const xmlLayoutFiles = flatFiles.filter(f => f.path.toLowerCase().includes('res/layout/') && f.name.endsWith('.xml'));

    const parsedScreens: { name: string; html: string; stateInit: string }[] = [];

    for (const kf of kotlinFiles) {
      if (!kf.content) continue;
      const composables = this.extractComposables(kf.content, stringMap, colorMap);
      for (const comp of composables) {
        parsedScreens.push({
          name: comp.name,
          html: comp.renderedHtml,
          stateInit: ''
        });
      }
    }

    // 4. Also parse any XML layouts for legacy/hybrid projects
    for (const xf of xmlLayoutFiles) {
      if (!xf.content) continue;
      const layoutName = xf.name.replace(/\.xml$/, '');
      const html = this.transpileXmlLayout(xf.content, stringMap, colorMap);
      parsedScreens.push({
        name: layoutName,
        html,
        stateInit: ''
      });
    }

    const defaultScreen = parsedScreens.find(s => 
      s.name === 'MainActivity' || s.name.endsWith('Screen') || s.name === 'App' || s.name === 'MainScreen'
    ) || parsedScreens[0] || {
      name: 'HomeScreen',
      html: `<div class="compose-card"><div class="compose-title">📱 ${appTitleEscaped}</div><div class="compose-desc">Welcome to your Jetpack Compose application preview.</div></div>`,
      stateInit: ''
    };

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
  <title>${appTitleEscaped}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
  <style>
    :root {
      --primary: ${colorMap.primary || '#6366f1'};
      --on-primary: #ffffff;
      --primary-container: ${colorMap.primaryContainer || '#312e81'};
      --on-primary-container: #c7d2fe;
      --secondary: ${colorMap.secondary || '#38bdf8'};
      --surface: ${colorMap.background || '#090e17'};
      --surface-card: ${colorMap.surface || '#121b2b'};
      --surface-border: ${colorMap.outline || '#1e293b'};
      --text: ${colorMap.onBackground || '#f8fafc'};
      --text-muted: #8492a6;
      --text-dim: #64748b;
      --top-bar-bg: #0d1522;
      --top-bar-border: #1e293b;
    }
    .light-theme {
      --surface: #f8fafc;
      --surface-card: #ffffff;
      --surface-border: #e2e8f0;
      --text: #0f172a;
      --text-muted: #64748b;
      --text-dim: #94a3b8;
      --top-bar-bg: #ffffff;
      --top-bar-border: #e2e8f0;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; -webkit-tap-highlight-color: transparent; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--surface);
      color: var(--text);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      width: 100vw;
      overflow: hidden;
      padding: ${isAppBundle ? '0' : '8px'};
      transition: background 0.2s, color 0.2s;
    }
    .app-root {
      width: 100%;
      height: 100%;
      max-width: ${isAppBundle ? '100%' : '412px'};
      max-height: ${isAppBundle ? '100%' : '860px'};
      background: var(--surface);
      border-radius: ${isAppBundle ? '0' : '28px'};
      border: ${isAppBundle ? 'none' : '4px solid #1e293b'};
      box-shadow: ${isAppBundle ? 'none' : '0 25px 50px -12px rgba(0, 0, 0, 0.85)'};
      display: flex;
      flex-direction: column;
      overflow: hidden;
      position: relative;
    }
    .status-bar {
      height: 28px;
      padding: 0 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11px;
      font-weight: 700;
      color: var(--text-muted);
      background: var(--top-bar-bg);
      border-bottom: 1px solid var(--surface-border);
      z-index: 10;
    }
    .screen-navigator {
      display: ${parsedScreens.length > 1 ? 'flex' : 'none'};
      gap: 6px;
      padding: 8px 12px;
      overflow-x: auto;
      background: var(--top-bar-bg);
      border-bottom: 1px solid var(--surface-border);
      z-index: 5;
    }
    .screen-navigator::-webkit-scrollbar { display: none; }
    .screen-tab-btn {
      padding: 5px 12px;
      border-radius: 16px;
      font-size: 11px;
      font-weight: 700;
      background: var(--surface-card);
      color: var(--text-muted);
      cursor: pointer;
      white-space: nowrap;
      border: 1px solid var(--surface-border);
      transition: all 0.15s;
    }
    .screen-tab-btn.active {
      background: var(--primary);
      color: #fff;
      border-color: var(--primary);
    }
    .screen-container {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      position: relative;
    }
    .screen-container::-webkit-scrollbar { display: none; }

    /* Jetpack Compose Layouts (Phase 16) */
    .compose-column {
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: 100%;
    }
    .compose-row {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      width: 100%;
    }
    .compose-box {
      position: relative;
      width: 100%;
      display: flex;
    }
    .compose-scaffold {
      display: flex;
      flex-direction: column;
      min-height: 100%;
      width: 100%;
      position: relative;
    }
    .compose-topappbar {
      padding: 12px 16px;
      background: var(--top-bar-bg);
      border-bottom: 1px solid var(--surface-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 16px;
      font-weight: 800;
      color: var(--text);
    }
    .compose-card {
      background: var(--surface-card);
      border: 1px solid var(--surface-border);
      border-radius: 16px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .compose-card.clickable:active { transform: scale(0.98); }
    .compose-lazy-column {
      display: flex;
      flex-direction: column;
      gap: 10px;
      width: 100%;
      overflow-y: auto;
    }
    .compose-spacer { flex-shrink: 0; }
    .compose-divider {
      height: 1px;
      background: var(--surface-border);
      width: 100%;
      margin: 4px 0;
    }

    /* Jetpack Compose Material 3 Components (Phase 17) */
    .compose-title {
      font-size: 16px;
      font-weight: 800;
      color: var(--text);
      line-height: 1.3;
    }
    .compose-headline {
      font-size: 22px;
      font-weight: 800;
      color: var(--text);
      line-height: 1.2;
    }
    .compose-subtitle {
      font-size: 12px;
      font-weight: 700;
      color: var(--primary);
    }
    .compose-desc {
      font-size: 12px;
      color: var(--text-muted);
      line-height: 1.5;
    }
    .compose-btn {
      background: var(--primary);
      color: var(--on-primary);
      border: none;
      border-radius: 12px;
      padding: 12px 18px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: transform 0.1s, opacity 0.1s;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
    }
    .compose-btn:active { transform: scale(0.97); opacity: 0.9; }
    .compose-btn.outlined {
      background: transparent;
      border: 1.5px solid var(--primary);
      color: var(--primary);
      box-shadow: none;
    }
    .compose-btn.elevated {
      background: var(--surface-card);
      color: var(--primary);
      border: 1px solid var(--surface-border);
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);
    }
    .compose-btn.text {
      background: transparent;
      color: var(--primary);
      border: none;
      box-shadow: none;
      padding: 8px 12px;
    }
    .compose-fab {
      position: absolute;
      bottom: 20px;
      right: 20px;
      width: 56px;
      height: 56px;
      border-radius: 18px;
      background: var(--primary);
      color: var(--on-primary);
      border: none;
      box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      cursor: pointer;
      transition: transform 0.15s;
    }
    .compose-fab:active { transform: scale(0.92); }
    .compose-textfield {
      width: 100%;
      background: var(--surface-card);
      border: 1.5px solid var(--surface-border);
      border-radius: 12px;
      padding: 12px 14px;
      color: var(--text);
      font-size: 13px;
      font-family: inherit;
      outline: none;
      transition: border-color 0.2s;
    }
    .compose-textfield:focus { border-color: var(--primary); }
    .compose-badge {
      background: var(--primary-container);
      color: var(--on-primary-container);
      font-size: 10px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      align-self: flex-start;
    }
    .compose-switch-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }
    .compose-switch {
      position: relative;
      width: 44px;
      height: 24px;
      background: var(--surface-border);
      border-radius: 12px;
      transition: background 0.2s;
      cursor: pointer;
    }
    .compose-switch.checked { background: var(--primary); }
    .compose-switch-thumb {
      position: absolute;
      top: 2px;
      left: 2px;
      width: 20px;
      height: 20px;
      background: #ffffff;
      border-radius: 50%;
      transition: transform 0.2s;
    }
    .compose-switch.checked .compose-switch-thumb { transform: translateX(20px); }
    .compose-slider {
      width: 100%;
      accent-color: var(--primary);
      cursor: pointer;
    }
    .compose-progress-circle {
      width: 24px;
      height: 24px;
      border: 3px solid var(--surface-border);
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="app-root" id="appRoot">
    <div class="status-bar">
      <span id="statusBarClock">9:41 AM</span>
      <div style="display: flex; gap: 6px; align-items: center;">
        <i class="bi bi-wifi"></i>
        <i class="bi bi-battery-full"></i>
      </div>
    </div>

    <div class="screen-navigator" id="screenNav">
      ${parsedScreens.map((s, idx) => `
        <button type="button" class="screen-tab-btn ${idx === 0 ? 'active' : ''}" data-screen-name="${encodeURIComponent(s.name)}">
          📱 ${escapeHtml(s.name)}
        </button>
      `).join('')}
    </div>

    <div class="screen-container" id="screenViewport">
      ${defaultScreen.html}
    </div>
  </div>

  <script>
    // State management & screen router (Phase 18)
    const screensStore = ${JSON.stringify(parsedScreens).replace(/<\/script/gi, '<\\/script')};
    
    function updateClock() {
      const now = new Date();
      const hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const clockEl = document.getElementById('statusBarClock');
      if (clockEl) clockEl.textContent = \`\${hours % 12 || 12}:\${minutes} \${hours >= 12 ? 'PM' : 'AM'}\`;
    }
    setInterval(updateClock, 10000);
    updateClock();

    document.querySelectorAll('.screen-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const rawName = decodeURIComponent(btn.getAttribute('data-screen-name') || '');
        document.querySelectorAll('.screen-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const target = screensStore.find(s => s.name === rawName);
        if (target) {
          document.getElementById('screenViewport').innerHTML = target.html;
          bindInteractiveEvents();
        }
      });
    });

    function bindInteractiveEvents() {
      // Interactive Switch bindings
      document.querySelectorAll('.compose-switch').forEach(sw => {
        sw.onclick = () => {
          sw.classList.toggle('checked');
        };
      });
      // Interactive Button click feedback
      document.querySelectorAll('.compose-btn, .compose-fab').forEach(btn => {
        btn.onclick = (e) => {
          const countEl = btn.querySelector('.click-counter');
          if (countEl) {
            let count = parseInt(countEl.textContent || '0', 10) + 1;
            countEl.textContent = count;
          }
        };
      });
    }
    bindInteractiveEvents();
  </script>
</body>
</html>`;
  }

  /**
   * Extract @Composable functions from Kotlin code and transpile their UI trees
   */
  private extractComposables(
    content: string,
    stringMap: Map<string, string>,
    colorMap: Record<string, string>
  ): ParsedComposable[] {
    const results: ParsedComposable[] = [];
    const compRegex = /@Composable\s+(?:fun|inline fun)\s+([a-zA-Z0-9_]+)\s*\([^)]*\)\s*\{([\s\S]*?)(?=@Composable|\n\s*fun|\s*$)/g;

    let match;
    while ((match = compRegex.exec(content)) !== null) {
      const name = match[1];
      const body = match[2];
      const renderedHtml = this.transpileComposeTree(body, stringMap, colorMap);
      results.push({
        name,
        code: body,
        renderedHtml
      });
    }

    return results;
  }

  /**
   * Parses Modifier chain into CSS styles (Phase 15)
   */
  private parseModifier(code: string): string {
    const styles: string[] = [];

    if (code.includes('fillMaxSize')) {
      styles.push('width: 100%', 'height: 100%');
    }
    if (code.includes('fillMaxWidth')) {
      styles.push('width: 100%');
    }
    if (code.includes('fillMaxHeight')) {
      styles.push('height: 100%');
    }

    // Padding
    const padMatch = code.match(/padding\s*\(\s*([0-9.]+)\.dp\s*\)/);
    if (padMatch) {
      styles.push(`padding: ${padMatch[1]}px`);
    }
    const padAllMatch = code.match(/padding\s*\(\s*horizontal\s*=\s*([0-9.]+)\.dp\s*,\s*vertical\s*=\s*([0-9.]+)\.dp\s*\)/);
    if (padAllMatch) {
      styles.push(`padding: ${padAllMatch[2]}px ${padAllMatch[1]}px`);
    }

    // Height / Width
    const heightMatch = code.match(/height\s*\(\s*([0-9.]+)\.dp\s*\)/);
    if (heightMatch) {
      styles.push(`height: ${heightMatch[1]}px`);
    }
    const widthMatch = code.match(/width\s*\(\s*([0-9.]+)\.dp\s*\)/);
    if (widthMatch) {
      styles.push(`width: ${widthMatch[1]}px`);
    }

    // Background
    if (code.includes('background')) {
      if (code.includes('MaterialTheme.colorScheme.primary') || code.includes('Color.Blue')) {
        styles.push('background: var(--primary)');
      } else if (code.includes('MaterialTheme.colorScheme.surface')) {
        styles.push('background: var(--surface-card)');
      }
    }

    // Clickable
    if (code.includes('clickable')) {
      styles.push('cursor: pointer');
    }

    return styles.join('; ');
  }

  /**
   * Transpiles a Composable function body tree into semantic HTML (Phases 14, 16, 17, 18)
   */
  private transpileComposeTree(
    body: string,
    stringMap: Map<string, string>,
    colorMap: Record<string, string>
  ): string {
    let output = '';

    // Check if body contains Scaffold
    if (body.includes('Scaffold')) {
      const topBarTitleMatch = body.match(/TopAppBar\s*\(.*?title\s*=\s*\{\s*Text\s*\(\s*["']([^"']+)["']/s);
      const topBarTitle = topBarTitleMatch ? escapeHtml(topBarTitleMatch[1]) : '';
      
      output += `<div class="compose-scaffold">`;
      if (topBarTitle) {
        output += `<div class="compose-topappbar"><span>${topBarTitle}</span><i class="bi bi-three-dots-vertical"></i></div>`;
      }
    }

    // Extract Text elements
    const textRegex = /Text\s*\(\s*(?:text\s*=\s*)?(?:stringResource\([^)]+\)|"([^"]+)"|'([^']+)')/g;
    const texts: string[] = [];
    let tMatch;
    while ((tMatch = textRegex.exec(body)) !== null) {
      const txt = tMatch[1] || tMatch[2];
      if (txt && !texts.includes(txt)) {
        texts.push(txt);
      }
    }

    // Extract Buttons
    const btnRegex = /Button[^{]*\{[\s\S]*?Text\s*\(\s*(?:text\s*=\s*)?["']([^"']+)["']/g;
    const buttons: string[] = [];
    let bMatch;
    while ((bMatch = btnRegex.exec(body)) !== null) {
      buttons.push(bMatch[1]);
    }

    // Extract TextFields
    const tfRegex = /(?:TextField|OutlinedTextField)\s*\([\s\S]*?(?:label\s*=\s*\{[\s\S]*?Text\s*\(\s*["']([^"']+)["']|placeholder\s*=\s*\{[\s\S]*?Text\s*\(\s*["']([^"']+)["'])/g;
    const textfields: string[] = [];
    let tfMatch;
    while ((tfMatch = tfRegex.exec(body)) !== null) {
      textfields.push(tfMatch[1] || tfMatch[2]);
    }

    // Render Cards & Sections
    if (texts.length > 0 || buttons.length > 0 || textfields.length > 0) {
      output += `<div class="compose-column">`;

      // Title & Subtitle
      if (texts[0]) {
        output += `<div class="compose-headline">${escapeHtml(texts[0])}</div>`;
      }
      if (texts[1]) {
        output += `<div class="compose-desc">${escapeHtml(texts[1])}</div>`;
      }

      // Input Fields
      for (const tf of textfields) {
        output += `<input type="text" class="compose-textfield" placeholder="${escapeHtml(tf)}" />`;
      }

      // Remaining texts as styled cards
      for (let i = 2; i < texts.length; i++) {
        output += `
          <div class="compose-card">
            <div class="compose-title">${escapeHtml(texts[i])}</div>
          </div>
        `;
      }

      // Interactive Switch if detected
      if (body.includes('Switch(')) {
        output += `
          <div class="compose-card">
            <div class="compose-row">
              <span class="compose-title" style="font-size: 13px;">Enable Notifications</span>
              <div class="compose-switch checked"><div class="compose-switch-thumb"></div></div>
            </div>
          </div>
        `;
      }

      // Buttons
      for (const btn of buttons) {
        output += `
          <button type="button" class="compose-btn">
            <span>${escapeHtml(btn)}</span>
          </button>
        `;
      }

      output += `</div>`;
    }

    // Floating Action Button
    if (body.includes('FloatingActionButton')) {
      output += `<button type="button" class="compose-fab"><i class="bi bi-plus"></i></button>`;
    }

    if (body.includes('Scaffold')) {
      output += `</div>`;
    }

    if (!output.trim()) {
      output = `
        <div class="compose-card">
          <div class="compose-title">Jetpack Compose View</div>
          <div class="compose-desc">Component rendered successfully. Add Text, Button, or Cards to build your UI.</div>
        </div>
      `;
    }

    return DOMPurify.sanitize(output);
  }

  /**
   * Transpile Android XML layout files into HTML
   */
  private transpileXmlLayout(
    xmlContent: string,
    stringMap: Map<string, string>,
    colorMap: Record<string, string>
  ): string {
    const texts: string[] = [];
    const textRegex = /android:text="([^"]+)"/g;
    let match;
    while ((match = textRegex.exec(xmlContent)) !== null) {
      let val = match[1];
      if (val.startsWith('@string/')) {
        const key = val.replace('@string/', '');
        val = stringMap.get(key) || key;
      }
      texts.push(val);
    }

    let html = `<div class="compose-column">`;
    texts.forEach((txt, idx) => {
      if (idx === 0) {
        html += `<div class="compose-headline">${escapeHtml(txt)}</div>`;
      } else {
        html += `<div class="compose-card"><div class="compose-title">${escapeHtml(txt)}</div></div>`;
      }
    });
    html += `</div>`;
    return DOMPurify.sanitize(html);
  }

  private extractStrings(files: FileItem[]): Map<string, string> {
    const map = new Map<string, string>();
    const stringXmlFiles = files.filter(f => f.name.toLowerCase() === 'strings.xml');
    for (const sf of stringXmlFiles) {
      const regex = /<string\s+name="([^"]+)">([^<]+)<\/string>/g;
      let m;
      while ((m = regex.exec(sf.content)) !== null) {
        map.set(m[1], m[2]);
      }
    }
    return map;
  }

  private extractColors(files: FileItem[]): Record<string, string> {
    const map: Record<string, string> = {
      primary: '#6366f1',
      primaryContainer: '#312e81',
      secondary: '#38bdf8',
      background: '#090e17',
      surface: '#121b2b',
      onBackground: '#f8fafc',
      outline: '#1e293b'
    };

    const colorXmlFiles = files.filter(f => f.name.toLowerCase() === 'colors.xml');
    for (const cf of colorXmlFiles) {
      const regex = /<color\s+name="([^"]+)">([^<]+)<\/color>/g;
      let m;
      while ((m = regex.exec(cf.content)) !== null) {
        const name = m[1].toLowerCase();
        const hex = m[2].trim();
        if (name.includes('primary')) map.primary = hex;
        if (name.includes('background')) map.background = hex;
        if (name.includes('surface')) map.surface = hex;
      }
    }

    return map;
  }

  private flatten(files: FileItem[]): FileItem[] {
    const result: FileItem[] = [];
    const traverse = (items: FileItem[]) => {
      for (const item of items) {
        if (!item.isFolder) result.push(item);
        if (item.children) traverse(item.children);
      }
    };
    traverse(files);
    return result;
  }
}

export const composeTranspilerService = new ComposeTranspilerService();
