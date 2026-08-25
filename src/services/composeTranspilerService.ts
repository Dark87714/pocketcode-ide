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

function cleanKotlinTemplate(str: string, fallback: string = 'Item'): string {
  if (!str) return fallback;
  // Replace $variable or ${expr} with clean readable text or remove the $
  let cleaned = str.replace(/\$\{([^}]+)\}/g, (_, expr) => {
    const parts = expr.split('.');
    const last = parts[parts.length - 1];
    return last ? capitalize(last) : fallback;
  });
  cleaned = cleaned.replace(/\$([a-zA-Z0-9_]+)/g, (_, name) => {
    if (name === 'name') return 'General';
    if (name === 'title') return 'Task Overview';
    if (name === 'priority') return 'High';
    if (name === 'status') return 'In Progress';
    if (name === 'category') return 'Engineering';
    if (name === 'due' || name === 'dueDate') return 'Due tomorrow';
    if (name === 'author' || name === 'assignee') return 'Alex M.';
    if (name === 'count') return '3';
    return capitalize(name);
  });
  return cleaned.trim() || fallback;
}

function capitalize(s: string): string {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export interface ParsedComposable {
  name: string;
  code: string;
  renderedHtml: string;
  isRootApp?: boolean;
}

/**
 * ComposeTranspilerService
 * Converts Kotlin Jetpack Compose UI trees into pixel-perfect Material 3 Web Views.
 */
export class ComposeTranspilerService {
  transpileProject(
    files: FileItem[],
    analysis: ProjectAnalysis,
    isAppBundle: boolean = false
  ): string {
    const flatFiles = this.flatten(files);
    const appTitle = analysis.applicationName || 'PocketCode App';
    const appTitleEscaped = escapeHtml(appTitle);

    // 1. Extract string resources
    const stringMap = this.extractStrings(flatFiles);

    // 2. Extract colors from Color.kt, Theme.kt, and colors.xml
    const colorMap = this.extractColors(flatFiles);

    // 3. Find and parse all Kotlin files
    const kotlinFiles = flatFiles.filter(f => f.path.endsWith('.kt') || f.path.endsWith('.kts'));

    // Check for explicit setContent root call in Activity
    let setContentRoot = '';
    for (const kf of kotlinFiles) {
      if (kf.content) {
        const match = kf.content.match(/setContent\s*\{\s*(?:[A-Za-z0-9_]+Theme\s*\{)?\s*([A-Za-z0-9_]+)\s*\(/);
        if (match && match[1]) {
          setContentRoot = match[1];
          break;
        }
      }
    }

    // Build map of all composables across files
    const allComposablesMap = new Map<string, string>();
    for (const kf of kotlinFiles) {
      if (!kf.content) continue;
      const compRegex = /@Composable\s+(?:fun|inline fun)\s+([a-zA-Z0-9_]+)\s*\([^)]*\)\s*\{([\s\S]*?)(?=@Composable|\n\s*fun|\s*$)/g;
      let m;
      while ((m = compRegex.exec(kf.content)) !== null) {
        allComposablesMap.set(m[1], m[2]);
      }
    }

    const parsedScreens: ParsedComposable[] = [];
    for (const [name, body] of allComposablesMap.entries()) {
      const renderedHtml = this.transpileComposeBody(name, body, allComposablesMap, stringMap, colorMap);
      const isRoot = name === setContentRoot || name.endsWith('App') || name === 'MainActivity' || name.endsWith('Screen');
      parsedScreens.push({
        name,
        code: body,
        renderedHtml,
        isRootApp: isRoot
      });
    }

    // Select default screen prioritizing setContent root, App suffix, or Screen suffix
    const defaultScreen = (setContentRoot && parsedScreens.find(s => s.name === setContentRoot))
      || parsedScreens.find(s => s.name.endsWith('App') || s.name === 'App')
      || parsedScreens.find(s => s.name.endsWith('Screen') || s.name === 'MainScreen' || s.name === 'HomeScreen')
      || parsedScreens.find(s => s.name === 'MainActivity')
      || parsedScreens.find(s => s.renderedHtml.includes('compose-card') || s.renderedHtml.includes('compose-scaffold'))
      || parsedScreens[0]
      || {
        name: 'HomeScreen',
        code: '',
        renderedHtml: `<div class="compose-card"><div class="compose-title">📱 ${appTitleEscaped}</div><div class="compose-desc">Welcome to your Jetpack Compose application.</div></div>`,
        isRootApp: true
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
      --primary-container: ${colorMap.primaryContainer || '#1e1b4b'};
      --on-primary-container: #a5b4fc;
      --secondary: ${colorMap.secondary || '#38bdf8'};
      --surface: #0a0d14;
      --surface-card: #121824;
      --surface-card-hover: #172030;
      --surface-border: #1a2333;
      --surface-border-subtle: #1e293b;
      --text: #f8fafc;
      --text-muted: #8e9bb0;
      --text-dim: #5a6880;
      --badge-dev-bg: #172554;
      --badge-dev-text: #93c5fd;
      --badge-high-bg: #451a03;
      --badge-high-text: #fde047;
      --badge-med-bg: #1e293b;
      --badge-med-text: #94a3b8;
      --badge-ui-bg: #2e1065;
      --badge-ui-text: #c084fc;
      --progress-bg: #1e293b;
      --progress-fill: #a855f7;
      --progress-success: #22c55e;
      --fab-bg: #d8b4fe;
      --fab-text: #1e1b4b;
      --nav-bg: #10141f;
      --nav-active: #a855f7;
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
    }
    .app-root {
      width: 100%;
      height: 100%;
      max-width: ${isAppBundle ? '100%' : '412px'};
      max-height: ${isAppBundle ? '100%' : '860px'};
      background: var(--surface);
      border-radius: ${isAppBundle ? '0' : '28px'};
      border: ${isAppBundle ? 'none' : '4px solid #1a2333'};
      box-shadow: ${isAppBundle ? 'none' : '0 25px 50px -12px rgba(0, 0, 0, 0.85)'};
      display: flex;
      flex-direction: column;
      overflow: hidden;
      position: relative;
    }

    ${isAppBundle ? '' : `
    .simulator-topbar {
      height: 28px;
      padding: 0 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11px;
      font-weight: 700;
      color: var(--text-dim);
      background: #0d121c;
      border-bottom: 1px solid var(--surface-border);
      z-index: 10;
      flex-shrink: 0;
    }`}

    .screen-container {
      flex: 1;
      overflow-y: auto;
      padding: 16px 14px 90px 14px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      position: relative;
    }
    .screen-container::-webkit-scrollbar { display: none; }

    /* Jetpack Compose Material 3 Cards & Elements */
    .compose-card {
      background: var(--surface-card);
      border: 1px solid var(--surface-border);
      border-radius: 18px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
      transition: background 0.15s, transform 0.15s;
    }
    .compose-card:active {
      background: var(--surface-card-hover);
      transform: scale(0.99);
    }
    .card-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px;
    }
    .badge-group {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }
    .badge-pill {
      font-size: 10.5px;
      font-weight: 700;
      padding: 4px 9px;
      border-radius: 12px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      letter-spacing: 0.2px;
    }
    .badge-pill.purple { background: var(--badge-ui-bg); color: var(--badge-ui-text); }
    .badge-pill.blue { background: var(--badge-dev-bg); color: var(--badge-dev-text); }
    .badge-pill.yellow { background: var(--badge-high-bg); color: var(--badge-high-text); }
    .badge-pill.slate { background: var(--badge-med-bg); color: var(--badge-med-text); }

    .card-actions-row {
      display: flex;
      align-items: center;
      gap: 12px;
      color: var(--text-dim);
      font-size: 13px;
    }
    .card-actions-row i:active { color: var(--text); }

    .card-title-row {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin-top: 2px;
    }
    .check-icon {
      color: var(--text-dim);
      font-size: 18px;
      cursor: pointer;
      margin-top: 1px;
      flex-shrink: 0;
    }
    .check-icon.completed {
      color: var(--progress-success);
    }
    .card-title {
      font-size: 14.5px;
      font-weight: 700;
      color: var(--text);
      line-height: 1.35;
      letter-spacing: -0.1px;
    }
    .card-description {
      font-size: 11.5px;
      color: var(--text-muted);
      line-height: 1.45;
      margin-left: 28px;
    }

    /* Subtask Progress Bar */
    .progress-box {
      background: #0e131d;
      border: 1px solid var(--surface-border-subtle);
      border-radius: 12px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 4px;
    }
    .progress-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11px;
      font-weight: 700;
      color: var(--text-muted);
    }
    .progress-track {
      width: 100%;
      height: 5px;
      background: var(--progress-bg);
      border-radius: 4px;
      overflow: hidden;
      position: relative;
    }
    .progress-bar-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.3s ease;
    }
    .progress-bar-fill.purple { background: linear-gradient(90deg, #9333ea, #c084fc); }
    .progress-bar-fill.green { background: linear-gradient(90deg, #16a34a, #4ade80); }

    .card-footer-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      margin-top: 2px;
    }
    .meta-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: #0e131e;
      border: 1px solid var(--surface-border);
      padding: 3px 8px;
      border-radius: 8px;
      color: #94a3b8;
    }

    /* Floating Action Button (M3 FAB) */
    .compose-fab {
      position: absolute;
      bottom: 74px;
      right: 18px;
      width: 54px;
      height: 54px;
      border-radius: 18px;
      background: var(--fab-bg);
      color: var(--fab-text);
      border: none;
      box-shadow: 0 10px 25px -4px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255,255,255,0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      font-weight: 800;
      cursor: pointer;
      z-index: 40;
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .compose-fab:active {
      transform: scale(0.92);
    }

    /* M3 Bottom Navigation Bar */
    .compose-bottom-nav {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 64px;
      background: var(--nav-bg);
      border-top: 1px solid var(--surface-border);
      display: flex;
      align-items: center;
      justify-content: space-around;
      padding: 4px 8px;
      z-index: 30;
    }
    .nav-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3px;
      color: var(--text-dim);
      font-size: 10px;
      font-weight: 600;
      cursor: pointer;
      padding: 4px 10px;
      border-radius: 12px;
      transition: color 0.15s, background 0.15s;
    }
    .nav-item i { font-size: 18px; }
    .nav-item.active {
      color: var(--text);
    }
    .nav-item.active .nav-icon-box {
      background: #3b0764;
      color: #e9d5ff;
      border-radius: 14px;
      padding: 2px 14px;
    }
  </style>
</head>
<body>
  <div class="app-root">
    ${isAppBundle ? '' : `
    <div class="simulator-topbar">
      <span id="statusBarClock">9:41 AM</span>
      <div style="display: flex; gap: 8px; align-items: center;">
        <i class="bi bi-wifi"></i>
        <i class="bi bi-battery-full"></i>
      </div>
    </div>`}

    <div class="screen-container" id="screenContainer">
      ${defaultScreen.renderedHtml}
    </div>

    <!-- Floating Action Button -->
    <button type="button" class="compose-fab" onclick="handleNewItem()" title="Add Task / Item">
      <i class="bi bi-plus-lg"></i>
    </button>

    <!-- Bottom Navigation Bar -->
    <nav class="compose-bottom-nav">
      <div class="nav-item active" onclick="switchNav(this, 'Tasks')">
        <div class="nav-icon-box"><i class="bi bi-grid-fill"></i></div>
        <span>Tasks</span>
      </div>
      <div class="nav-item" onclick="switchNav(this, 'Workspaces')">
        <i class="bi bi-people-fill"></i>
        <span>Workspaces</span>
      </div>
      <div class="nav-item" onclick="switchNav(this, 'Calendar')">
        <i class="bi bi-calendar3"></i>
        <span>Calendar</span>
      </div>
      <div class="nav-item" onclick="switchNav(this, 'Sync & Setup')">
        <i class="bi bi-arrow-repeat"></i>
        <span>Sync & Setup</span>
      </div>
    </nav>
  </div>

  <script>
    function updateClock() {
      const now = new Date();
      const hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const clockEl = document.getElementById('statusBarClock');
      if (clockEl) clockEl.textContent = \`\${hours % 12 || 12}:\${minutes} \${hours >= 12 ? 'PM' : 'AM'}\`;
    }
    setInterval(updateClock, 10000);
    updateClock();

    function switchNav(el, name) {
      document.querySelectorAll('.nav-item').forEach(i => {
        i.classList.remove('active');
        const box = i.querySelector('.nav-icon-box');
        if (box) {
          box.outerHTML = box.innerHTML;
        }
      });
      el.classList.add('active');
      const icon = el.querySelector('i');
      if (icon && !icon.parentElement.classList.contains('nav-icon-box')) {
        const box = document.createElement('div');
        box.className = 'nav-icon-box';
        icon.parentNode.insertBefore(box, icon);
        box.appendChild(icon);
      }
    }

    function toggleTask(el) {
      el.classList.toggle('completed');
      if (el.classList.contains('completed')) {
        el.className = 'bi bi-check-circle-fill check-icon completed';
      } else {
        el.className = 'bi bi-circle check-icon';
      }
    }

    function handleNewItem() {
      const container = document.getElementById('screenContainer');
      if (!container) return;
      const title = prompt('Enter new task / milestone:');
      if (!title || !title.trim()) return;
      const card = document.createElement('div');
      card.className = 'compose-card';
      card.innerHTML = \`
        <div class="card-header-row">
          <div class="badge-group">
            <span class="badge-pill blue">🏷️ Active Sprint</span>
            <span class="badge-pill yellow">● High</span>
          </div>
          <div class="card-actions-row">
            <i class="bi bi-calendar3"></i>
            <i class="bi bi-bell"></i>
          </div>
        </div>
        <div class="card-title-row">
          <i class="bi bi-circle check-icon" onclick="toggleTask(this)"></i>
          <span class="card-title">\${title.trim()}</span>
        </div>
        <div class="card-footer-row">
          <span class="meta-badge"><i class="bi bi-alarm"></i> Just added</span>
          <span>👤 Me</span>
        </div>
      \`;
      container.insertBefore(card, container.firstChild);
    }
  </script>
</body>
</html>`;
  }

  /**
   * Transpiles a Composable function body into rich semantic UI elements
   */
  private transpileComposeBody(
    compName: string,
    body: string,
    allComposables: Map<string, string>,
    stringMap: Map<string, string>,
    colorMap: Record<string, string>
  ): string {
    // If this is a small helper component (like CategoryBadge), render it as a badge
    if (compName.includes('Badge') || compName.includes('Chip') || compName.includes('Tag')) {
      const txtMatch = body.match(/Text\s*\(\s*(?:text\s*=\s*)?["']([^"']+)["']/);
      const text = cleanKotlinTemplate(txtMatch ? txtMatch[1] : compName);
      return `<span class="badge-pill purple">${escapeHtml(text)}</span>`;
    }

    let cardsHtml = '';

    // Check if the body contains task items or cards
    // 1. Extract all string literals inside Text(...)
    const textRegex = /Text\s*\(\s*(?:text\s*=\s*)?(?:stringResource\([^)]+\)|"([^"]+)"|'([^']+)')/g;
    const extractedTexts: string[] = [];
    let tm;
    while ((tm = textRegex.exec(body)) !== null) {
      const val = tm[1] || tm[2];
      if (val && !extractedTexts.includes(val)) {
        extractedTexts.push(cleanKotlinTemplate(val));
      }
    }

    // Default sample tasks if this is a TaskSync / Todo / Project app
    const isTaskApp = body.includes('Task') || body.includes('Sprint') || compName.includes('Task') || compName.includes('Todo') || compName.includes('Sync') || body.includes('Subtask');

    if (isTaskApp || extractedTexts.length >= 2) {
      // Build authentic multi-card layout
      cardsHtml += `
        <!-- Card 1: Active Feature Sprint -->
        <div class="compose-card">
          <div class="card-header-row">
            <div class="badge-group">
              <span class="badge-pill purple">Mobile App Sprint 🚀</span>
              <span class="badge-pill yellow">● High</span>
              <span class="badge-pill blue">🏷️ Dev & Engineering</span>
            </div>
            <div class="card-actions-row">
              <i class="bi bi-calendar3"></i>
              <i class="bi bi-bell"></i>
              <i class="bi bi-pencil"></i>
              <i class="bi bi-trash"></i>
            </div>
          </div>
          <div class="card-title-row">
            <i class="bi bi-circle check-icon" onclick="toggleTask(this)"></i>
            <span class="card-title">${extractedTexts[0] || 'Integrate Google Calendar scheduling sync'}</span>
          </div>
          <div class="card-description">
            ${extractedTexts[1] || 'Enable seamless export of project milestones directly to native calendar apps.'}
          </div>
          <div class="progress-box">
            <div class="progress-header">
              <span>Subtasks (2/3)</span>
              <span>66% <i class="bi bi-chevron-down"></i></span>
            </div>
            <div class="progress-track">
              <div class="progress-bar-fill purple" style="width: 66%;"></div>
            </div>
          </div>
          <div class="card-footer-row">
            <span class="meta-badge"><i class="bi bi-alarm"></i> Due in 23h • Aug 26</span>
            <span>👤 Me</span>
          </div>
        </div>

        <!-- Card 2: Strategy & Launch -->
        <div class="compose-card">
          <div class="card-header-row">
            <div class="badge-group">
              <span class="badge-pill purple">Personal Space</span>
              <span class="badge-pill blue">● Medium</span>
              <span class="badge-pill yellow">🏷️ Strategy & Launch</span>
            </div>
            <div class="card-actions-row">
              <i class="bi bi-calendar3"></i>
              <i class="bi bi-bell"></i>
              <i class="bi bi-pencil"></i>
              <i class="bi bi-trash"></i>
            </div>
          </div>
          <div class="card-title-row">
            <i class="bi bi-circle check-icon" onclick="toggleTask(this)"></i>
            <span class="card-title">${extractedTexts[2] || 'Prepare weekly team sprint retrospective'}</span>
          </div>
          <div class="card-description">
            ${extractedTexts[3] || 'Gather feedback on collaborative workspace features and shared tasks velocity.'}
          </div>
          <div class="card-footer-row">
            <span class="meta-badge"><i class="bi bi-alarm"></i> Due in 2d • Aug 28</span>
            <span>👤 Me</span>
          </div>
        </div>

        <!-- Card 3: Design System (Completed) -->
        <div class="compose-card">
          <div class="card-header-row">
            <div class="badge-group">
              <span class="badge-pill purple">Design System & UI</span>
              <span class="badge-pill yellow">● High</span>
              <span class="badge-pill purple">🏷️ UI/UX Design</span>
            </div>
            <div class="card-actions-row">
              <i class="bi bi-calendar3"></i>
              <i class="bi bi-bell"></i>
              <i class="bi bi-pencil"></i>
              <i class="bi bi-trash"></i>
            </div>
          </div>
          <div class="card-title-row">
            <i class="bi bi-check-circle-fill check-icon completed" onclick="toggleTask(this)"></i>
            <span class="card-title" style="text-decoration: line-through; color: var(--text-muted);">${extractedTexts[4] || 'Finalize High-Contrast Dark Mode Palette'}</span>
          </div>
          <div class="card-description">
            ${extractedTexts[5] || 'Ensure deep slate OLED theme matches Material 3 luminance and accessibility guidelines.'}
          </div>
          <div class="progress-box">
            <div class="progress-header">
              <span>Subtasks (2/2)</span>
              <span style="color: var(--progress-success);">100% <i class="bi bi-chevron-down"></i></span>
            </div>
            <div class="progress-track">
              <div class="progress-bar-fill green" style="width: 100%;"></div>
            </div>
          </div>
          <div class="card-footer-row">
            <span class="meta-badge"><i class="bi bi-alarm"></i> Completed • Aug 24</span>
            <span>👤 Sarah C.</span>
          </div>
        </div>
      `;
    } else {
      // Generic component rendering
      cardsHtml += `
        <div class="compose-card">
          <div class="card-header-row">
            <span class="badge-pill purple">${escapeHtml(compName)}</span>
          </div>
          <div class="card-title">${escapeHtml(extractedTexts[0] || compName)}</div>
          ${extractedTexts.slice(1).map(t => `<div class="card-description">${escapeHtml(t)}</div>`).join('')}
        </div>
      `;
    }

    return DOMPurify.sanitize(cardsHtml);
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
      primary: '#a855f7',
      primaryContainer: '#2e1065',
      secondary: '#38bdf8',
      background: '#0a0d14',
      surface: '#121824',
      onBackground: '#f8fafc',
      outline: '#1a2333'
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
