import { FileItem } from '../types';
import { securityService } from './securityService';

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

  buildPreviewHtml(files: FileItem[]): string {
    const flatFiles = this.getFlatFiles(files);
    const linkedPaths = new Set<string>();

    // Find main HTML entry
    const indexFile = flatFiles.find(f => f.name === 'index.html' || f.name.endsWith('.html'));
    let indexHtml = indexFile?.content || '';
    if (indexFile) {
      linkedPaths.add(indexFile.path);
    }

    if (!indexHtml) {
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
              ${flatFiles.map(f => `<li>${f.name} <span style="color: #6a9955;">(${f.language || 'text'})</span></li>`).join('')}
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
}

export const webPreviewService = new WebPreviewService();
