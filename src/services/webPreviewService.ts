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

      indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <title>PocketCode Live Sandbox</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 16px;
      color: #333;
      background: #fafafa;
    }
    ${cssContent}
  </style>
</head>
<body>
  <div id="root">
    <h2>🚀 Live App Output</h2>
    <p>Output from workspace scripts.</p>
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
