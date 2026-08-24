import { FileItem } from '../types';
import { ProjectAnalysis } from './projectTypeDetector';

export interface ParsedComposable {
  name: string;
  code: string;
  renderedHtml: string;
}

export class ComposeTranspilerService {
  /**
   * Transpiles a collection of Kotlin Jetpack Compose and Android XML files into a full-bleed interactive application
   */
  transpileProject(
    files: FileItem[],
    analysis: ProjectAnalysis,
    isAppBundle: boolean = false
  ): string {
    const flatFiles = this.flatten(files);
    const appTitle = analysis.applicationName || 'My Application';

    // 1. Extract string resources
    const stringMap = this.extractStrings(flatFiles);

    // 2. Extract colors from Color.kt, Theme.kt, and colors.xml
    const colorMap = this.extractColors(flatFiles);

    // 3. Find and parse all @Composable functions in Kotlin files
    const kotlinFiles = flatFiles.filter(f => f.path.endsWith('.kt') || f.path.endsWith('.kts'));
    const xmlLayoutFiles = flatFiles.filter(f => f.path.toLowerCase().includes('res/layout/') && f.name.endsWith('.xml'));

    const parsedScreens: { name: string; html: string }[] = [];

    for (const kf of kotlinFiles) {
      if (!kf.content) continue;
      const composables = this.extractComposables(kf.content, stringMap, colorMap);
      for (const comp of composables) {
        if (comp.name.endsWith('Screen') || comp.name.endsWith('Content') || comp.name.endsWith('View') || comp.name === 'MainActivity') {
          parsedScreens.push({
            name: comp.name,
            html: comp.renderedHtml
          });
        }
      }
    }

    // 4. Also parse any XML layouts
    for (const xf of xmlLayoutFiles) {
      if (!xf.content) continue;
      const layoutName = xf.name.replace(/\.xml$/, '');
      const html = this.transpileXmlLayout(xf.content, stringMap, colorMap);
      parsedScreens.push({
        name: layoutName,
        html
      });
    }

    const defaultScreen = parsedScreens[0] || {
      name: 'HomeScreen',
      html: `<div class="compose-card"><div class="compose-title">📱 ${appTitle}</div><div class="compose-desc">Welcome to your Native Android application.</div></div>`
    };

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
      --primary: ${colorMap.primary || '#6366f1'};
      --primary-container: ${colorMap.primaryContainer || '#312e81'};
      --surface: ${colorMap.background || '#090e17'};
      --surface-card: ${colorMap.surface || '#121b2b'};
      --surface-border: ${colorMap.outline || '#1e293b'};
      --text: ${colorMap.onBackground || '#f8fafc'};
      --text-muted: #8492a6;
      --text-dim: #64748b;
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
      padding: ${isAppBundle ? '0' : '12px'};
    }
    .app-root {
      width: 100%;
      height: 100%;
      max-width: ${isAppBundle ? '100%' : '412px'};
      max-height: ${isAppBundle ? '100%' : '860px'};
      background: var(--surface);
      border-radius: ${isAppBundle ? '0' : '36px'};
      border: ${isAppBundle ? 'none' : '8px solid #1e293b'};
      box-shadow: ${isAppBundle ? 'none' : '0 25px 50px -12px rgba(0, 0, 0, 0.85)'};
      display: flex;
      flex-direction: column;
      overflow: hidden;
      position: relative;
    }
    .screen-container {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .screen-container::-webkit-scrollbar { display: none; }
    .compose-column {
      display: flex;
      flex-direction: column;
      gap: 10px;
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
    }
    .compose-grid-2 {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      width: 100%;
    }
    .compose-card {
      background: var(--surface-card);
      border: 1px solid var(--surface-border);
      border-radius: 14px;
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      transition: transform 0.15s, background 0.15s;
    }
    .compose-card.clickable { cursor: pointer; }
    .compose-card.clickable:active { transform: scale(0.98); background: #172338; }
    .compose-title {
      font-size: 15px;
      font-weight: 800;
      color: #fff;
      line-height: 1.25;
    }
    .compose-subtitle {
      font-size: 11.5px;
      font-weight: 600;
      color: var(--primary);
    }
    .compose-desc {
      font-size: 11px;
      color: var(--text-muted);
      line-height: 1.45;
    }
    .compose-btn {
      background: var(--primary);
      color: #fff;
      border: none;
      border-radius: 12px;
      padding: 12px 18px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: transform 0.15s, opacity 0.15s;
      box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);
    }
    .compose-btn:active { transform: scale(0.97); opacity: 0.9; }
    .compose-btn.outlined {
      background: transparent;
      border: 1px solid var(--primary);
      color: var(--primary);
      box-shadow: none;
    }
    .compose-textfield {
      width: 100%;
      background: var(--surface-card);
      border: 1px solid var(--surface-border);
      border-radius: 12px;
      padding: 12px 14px;
      color: #fff;
      font-size: 12.5px;
      font-family: inherit;
      outline: none;
      transition: border-color 0.2s;
    }
    .compose-textfield:focus {
      border-color: var(--primary);
    }
    .compose-badge {
      background: var(--primary-container);
      color: #c7d2fe;
      font-size: 9.5px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      align-self: flex-start;
    }
    .compose-spacer-h16 { height: 16px; }
    .compose-spacer-h8 { height: 8px; }
    .compose-spacer-h24 { height: 24px; }
    .screen-navigator {
      display: ${parsedScreens.length > 1 ? 'flex' : 'none'};
      gap: 6px;
      padding: 10px 16px;
      overflow-x: auto;
      background: #0d1522;
      border-bottom: 1px solid var(--surface-border);
    }
    .screen-navigator::-webkit-scrollbar { display: none; }
    .screen-tab-btn {
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
      background: #172338;
      color: #94a3b8;
      cursor: pointer;
      white-space: nowrap;
      border: 1px solid transparent;
      transition: all 0.15s;
    }
    .screen-tab-btn.active {
      background: var(--primary);
      color: #fff;
    }
  </style>
</head>
<body>
  <div class="app-root">
    <div class="screen-navigator" id="screenNav">
      ${parsedScreens.map((s, idx) => `
        <div class="screen-tab-btn ${idx === 0 ? 'active' : ''}" onclick="switchScreen('${s.name}')">
          📱 ${s.name}
        </div>
      `).join('')}
    </div>

    <div class="screen-container" id="screenViewport">
      ${defaultScreen.html}
    </div>
  </div>

  <script>
    const screensStore = ${JSON.stringify(parsedScreens)};
    function switchScreen(name) {
      document.querySelectorAll('.screen-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.includes(name));
      });
      const target = screensStore.find(s => s.name === name);
      if (target) {
        document.getElementById('screenViewport').innerHTML = target.html;
      }
    }
  </script>
</body>
</html>`;
  }

  /**
   * Extracts @Composable functions and transpiles their UI tree
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
      const renderedHtml = this.transpileComposeBody(body, stringMap, colorMap);
      results.push({
        name,
        code: body,
        renderedHtml
      });
    }

    return results;
  }

  /**
   * Transpiles a Composable function body into HTML
   */
  private transpileComposeBody(
    body: string,
    stringMap: Map<string, string>,
    colorMap: Record<string, string>
  ): string {
    const cards: string[] = [];
    const texts: string[] = [];
    const buttons: string[] = [];
    const textfields: string[] = [];

    // Extract Text("...")
    const textRegex = /Text\s*\(\s*(?:text\s*=\s*)?(?:stringResource\([^)]+\)|"([^"]+)"|'([^']+)')/g;
    let tMatch;
    while ((tMatch = textRegex.exec(body)) !== null) {
      const txt = tMatch[1] || tMatch[2];
      if (txt && !texts.includes(txt)) {
        texts.push(txt);
      }
    }

    // Extract Buttons
    const btnRegex = /Button[^{]*\{[\s\S]*?Text\s*\(\s*(?:text\s*=\s*)?["']([^"']+)["']/g;
    let bMatch;
    while ((bMatch = btnRegex.exec(body)) !== null) {
      const btnTxt = bMatch[1];
      if (btnTxt && !buttons.includes(btnTxt)) {
        buttons.push(btnTxt);
      }
    }

    // Extract TextFields
    const fieldRegex = /(?:OutlinedTextField|TextField)\s*\([\s\S]*?(?:label|placeholder)\s*=\s*\{[^}]*Text\s*\(\s*["']([^"']+)["']/g;
    let fMatch;
    while ((fMatch = fieldRegex.exec(body)) !== null) {
      const placeholder = fMatch[1];
      if (placeholder && !textfields.includes(placeholder)) {
        textfields.push(placeholder);
      }
    }

    // Extract Cards / Items
    const cardRegex = /Card\s*\([^)]*\)\s*\{([\s\S]*?)\}/g;
    let cMatch;
    while ((cMatch = cardRegex.exec(body)) !== null) {
      const cardBody = cMatch[1];
      const cardTexts: string[] = [];
      let ctMatch;
      const ctRegex = /Text\s*\(\s*(?:text\s*=\s*)?["']([^"']+)["']/g;
      while ((ctMatch = ctRegex.exec(cardBody)) !== null) {
        if (ctMatch[1]) cardTexts.push(ctMatch[1]);
      }
      if (cardTexts.length > 0) {
        cards.push(`
          <div class="compose-card clickable" onclick="alert('Selected: ${cardTexts[0]}')">
            <div class="compose-title">${cardTexts[0]}</div>
            ${cardTexts[1] ? `<div class="compose-subtitle">${cardTexts[1]}</div>` : ''}
            ${cardTexts.slice(2).map(ct => `<div class="compose-desc">${ct}</div>`).join('')}
          </div>
        `);
      }
    }

    let outputHtml = '<div class="compose-column">';

    if (textfields.length > 0) {
      outputHtml += textfields.map(tf => `
        <input type="text" class="compose-textfield" placeholder="${tf}..." />
      `).join('');
    }

    if (texts.length > 0 && cards.length === 0) {
      outputHtml += `
        <div class="compose-card">
          <div class="compose-title">${texts[0]}</div>
          ${texts[1] ? `<div class="compose-subtitle">${texts[1]}</div>` : ''}
          ${texts.slice(2).map(t => `<div class="compose-desc">${t}</div>`).join('')}
        </div>
      `;
    }

    if (cards.length > 0) {
      outputHtml += `<div class="compose-grid-2">${cards.join('')}</div>`;
    }

    if (buttons.length > 0) {
      outputHtml += buttons.map(b => `
        <button class="compose-btn" onclick="alert('Action: ${b}')">${b}</button>
      `).join('');
    }

    outputHtml += '</div>';
    return outputHtml;
  }

  /**
   * Transpiles an Android XML layout file into HTML
   */
  private transpileXmlLayout(
    xmlContent: string,
    stringMap: Map<string, string>,
    colorMap: Record<string, string>
  ): string {
    let html = '<div class="compose-column">';

    // Parse TextViews
    const textMatches = xmlContent.matchAll(/<TextView[\s\S]*?android:text="([^"]+)"[\s\S]*?\/>/g);
    for (const m of textMatches) {
      const text = this.resolveString(m[1], stringMap);
      html += `<div class="compose-title">${text}</div>`;
    }

    // Parse Buttons
    const btnMatches = xmlContent.matchAll(/<Button[\s\S]*?android:text="([^"]+)"[\s\S]*?\/>/g);
    for (const m of btnMatches) {
      const text = this.resolveString(m[1], stringMap);
      html += `<button class="compose-btn" onclick="alert('${text}')">${text}</button>`;
    }

    // Parse EditTexts
    const editMatches = xmlContent.matchAll(/<EditText[\s\S]*?android:hint="([^"]+)"[\s\S]*?\/>/g);
    for (const m of editMatches) {
      const hint = this.resolveString(m[1], stringMap);
      html += `<input type="text" class="compose-textfield" placeholder="${hint}" />`;
    }

    html += '</div>';
    return html;
  }

  private extractStrings(files: FileItem[]): Map<string, string> {
    const map = new Map<string, string>();
    for (const f of files) {
      if (f.name === 'strings.xml' && f.content) {
        const matches = f.content.matchAll(/<string\s+name=["']([^"']+)["']>([^<]+)<\/string>/g);
        for (const m of matches) {
          map.set(m[1], m[2]);
        }
      }
    }
    return map;
  }

  private extractColors(files: FileItem[]): Record<string, string> {
    const colors: Record<string, string> = {
      primary: '#6366f1',
      primaryContainer: '#312e81',
      background: '#090e17',
      surface: '#121b2b',
      outline: '#1e293b',
      onBackground: '#f8fafc'
    };

    for (const f of files) {
      if (f.name === 'colors.xml' && f.content) {
        const matches = f.content.matchAll(/<color\s+name=["']([^"']+)["']>([^<]+)<\/color>/g);
        for (const m of matches) {
          colors[m[1]] = m[2];
        }
      } else if ((f.name === 'Color.kt' || f.name === 'Theme.kt') && f.content) {
        const matches = f.content.matchAll(/val\s+([a-zA-Z0-9_]+)\s*=\s*Color\s*\(\s*0x([a-fA-F0-9]{8})\s*\)/g);
        for (const m of matches) {
          const hex = '#' + m[2].substring(2);
          colors[m[1]] = hex;
        }
      }
    }

    return colors;
  }

  private resolveString(raw: string, stringMap: Map<string, string>): string {
    if (raw.startsWith('@string/')) {
      const key = raw.replace('@string/', '');
      return stringMap.get(key) || key;
    }
    return raw;
  }

  private flatten(files: FileItem[]): FileItem[] {
    const result: FileItem[] = [];
    const traverse = (items: FileItem[]) => {
      for (const item of items) {
        if (!item.isFolder) {
          result.push(item);
        }
        if (item.children && item.children.length > 0) {
          traverse(item.children);
        }
      }
    };
    traverse(files);
    return result;
  }
}

export const composeTranspilerService = new ComposeTranspilerService();
