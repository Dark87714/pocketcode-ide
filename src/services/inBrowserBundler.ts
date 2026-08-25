/**
 * In-Browser Bundler Service
 * Uses esbuild-wasm to transpile JSX/TSX/TypeScript projects entirely in-browser.
 * Works like `vite build` does in VS Code — no Node.js required.
 */

import { FileItem } from '../types';

let esbuildInitialized = false;

async function ensureEsbuild() {
  if (esbuildInitialized) return;
  const esbuild = await import('esbuild-wasm');
  await esbuild.initialize({
    wasmURL: 'https://cdn.jsdelivr.net/npm/esbuild-wasm@0.25.1/esbuild.wasm',
    worker: true,
  });
  esbuildInitialized = true;
}

export interface BundleResult {
  success: boolean;
  html: string;
  error?: string;
}

/**
 * Detects if a project needs JSX/TSX transpilation
 */
export function needsBundling(files: FileItem[]): boolean {
  return files.some(f =>
    !f.isFolder &&
    (f.name.endsWith('.tsx') || f.name.endsWith('.jsx') ||
      (f.name.endsWith('.ts') && f.content && (
        f.content.includes('React') ||
        f.content.includes('react') ||
        f.content.includes('import {') ||
        f.content.includes('export default') ||
        f.content.includes('export const')
      )))
  );
}

/**
 * Finds the best entry file for a React/JSX project
 */
function findEntryFile(files: FileItem[]): FileItem | undefined {
  const priority = ['main.tsx', 'main.jsx', 'index.tsx', 'index.jsx', 'App.tsx', 'App.jsx', 'app.tsx', 'app.jsx'];
  for (const name of priority) {
    const found = files.find(f => !f.isFolder && f.name === name);
    if (found) return found;
  }
  return files.find(f => !f.isFolder && (f.name.endsWith('.tsx') || f.name.endsWith('.jsx')));
}

/**
 * Builds a virtual file system map for esbuild from workspace files
 */
function buildFileMap(files: FileItem[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const f of files) {
    if (!f.isFolder && f.content !== undefined) {
      // Normalize path: strip leading slash
      const path = f.path.replace(/^\/+/, '');
      map.set(path, f.content);
      // Also add without extension for bare imports
      map.set(f.name, f.content);
    }
  }
  return map;
}

/**
 * Creates a virtual filesystem plugin for esbuild.
 * Resolves imports like 'react', './App', '../utils' from workspace files.
 */
function createVirtualFsPlugin(fileMap: Map<string, string>) {
  return {
    name: 'virtual-workspace-fs',
    setup(build: any) {
      // Intercept all imports
      build.onResolve({ filter: /.*/ }, (args: any) => {
        const { path, importer } = args;

        // Pass through CDN/URL imports as external
        if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('//')) {
          return { path, external: true };
        }

        // Known npm packages — rewrite to esm.sh CDN
        if (!path.startsWith('.') && !path.startsWith('/')) {
          return { path: `https://esm.sh/${path}`, external: true };
        }

        // Relative import: resolve relative to importer
        let resolved = path;
        if (path.startsWith('./') || path.startsWith('../')) {
          const importerDir = importer.includes('/') 
            ? importer.substring(0, importer.lastIndexOf('/'))
            : '';
          resolved = normalizePath(importerDir ? `${importerDir}/${path}` : path);
        } else {
          resolved = path.replace(/^\//, '');
        }

        // Try with original path, then with common extensions
        const extensions = ['', '.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts', '/index.jsx', '/index.js'];
        for (const ext of extensions) {
          const candidate = resolved + ext;
          if (fileMap.has(candidate)) {
            return { path: candidate, namespace: 'virtual' };
          }
          // Also try just the filename
          const base = candidate.split('/').pop() || '';
          if (fileMap.has(base)) {
            return { path: base, namespace: 'virtual' };
          }
        }

        // Fallback: mark as external (CDN will handle it)
        return { path: `https://esm.sh/${path}`, external: true };
      });

      build.onLoad({ filter: /.*/, namespace: 'virtual' }, (args: any) => {
        const content = fileMap.get(args.path);
        if (content === undefined) {
          return { errors: [{ text: `File not found in workspace: ${args.path}` }] };
        }

        const ext = args.path.split('.').pop()?.toLowerCase() || 'js';
        const loaderMap: Record<string, string> = {
          tsx: 'tsx', ts: 'ts', jsx: 'jsx', js: 'js',
          css: 'css', json: 'json', txt: 'text'
        };
        const loader = loaderMap[ext] || 'js';

        return { contents: content, loader };
      });
    }
  };
}

function normalizePath(path: string): string {
  const parts = path.split('/');
  const resolved: string[] = [];
  for (const part of parts) {
    if (part === '' || part === '.') continue;
    if (part === '..') { resolved.pop(); continue; }
    resolved.push(part);
  }
  return resolved.join('/');
}

/**
 * Bundles a React/JSX/TSX project into a self-contained HTML document.
 * Falls back gracefully if esbuild-wasm fails or is unavailable.
 */
export async function bundleProjectToHtml(
  files: FileItem[],
  projectName: string,
  onProgress?: (msg: string) => void
): Promise<BundleResult> {
  const flatFiles = flattenFiles(files);

  // Find CSS files to inline
  const cssFiles = flatFiles.filter(f => !f.isFolder && f.name.endsWith('.css') && f.content);
  const cssContent = cssFiles.map(f => f.content).join('\n');

  // Find HTML entry if exists
  const htmlEntry = flatFiles.find(f => !f.isFolder && (f.name === 'index.html' || f.name.endsWith('.html')));

  // Detect if bundling is needed
  if (!needsBundling(flatFiles)) {
    // Pure HTML/CSS/JS — just inline it
    return buildSimpleHtml(flatFiles, htmlEntry, projectName, cssContent);
  }

  onProgress?.('Initializing in-browser TypeScript/JSX compiler (esbuild)...');

  try {
    await ensureEsbuild();
    const esbuild = await import('esbuild-wasm');

    const entryFile = findEntryFile(flatFiles);
    if (!entryFile) {
      return { success: false, html: '', error: 'No JSX/TSX entry file found (main.tsx, index.tsx, App.tsx)' };
    }

    onProgress?.(`Bundling entry point: ${entryFile.name}`);

    const fileMap = buildFileMap(flatFiles);
    fileMap.set(entryFile.path.replace(/^\/+/, ''), entryFile.content || '');

    const result = await esbuild.build({
      entryPoints: [entryFile.path.replace(/^\/+/, '')],
      bundle: true,
      write: false,
      format: 'iife',
      platform: 'browser',
      target: ['chrome80', 'firefox78', 'safari13'],
      jsx: 'automatic',
      jsxImportSource: 'react',
      loader: {
        '.tsx': 'tsx', '.ts': 'ts', '.jsx': 'jsx', '.js': 'js',
        '.css': 'text', '.json': 'json', '.svg': 'text', '.png': 'dataurl',
        '.jpg': 'dataurl', '.jpeg': 'dataurl', '.gif': 'dataurl', '.webp': 'dataurl'
      },
      define: {
        'process.env.NODE_ENV': '"production"',
        'process.env': '{}',
      },
      plugins: [createVirtualFsPlugin(fileMap)],
      minify: false,
      sourcemap: false,
    });

    if (result.errors.length > 0) {
      const errMsg = result.errors.map((e: any) => e.text).join('\n');
      return { success: false, html: '', error: errMsg };
    }

    const bundledJs = result.outputFiles?.[0]?.text || '';
    if (!bundledJs) {
      return { success: false, html: '', error: 'esbuild produced no output' };
    }

    onProgress?.('Bundle complete. Generating APK HTML shell...');

    // Determine root element id used by the project
    const rootId = detectRootId(flatFiles);

    // Build the final self-contained HTML
    const html = buildReactHtml(projectName, bundledJs, cssContent, rootId, htmlEntry?.content);

    return { success: true, html };
  } catch (err: any) {
    // Graceful fallback: serve raw source with a helpful error overlay
    const errorHtml = buildErrorHtml(projectName, err?.message || String(err));
    return { success: false, html: errorHtml, error: err?.message };
  }
}

function detectRootId(files: FileItem[]): string {
  for (const f of files) {
    if (!f.isFolder && f.content) {
      const match = f.content.match(/getElementById\(['"]([^'"]+)['"]\)/);
      if (match) return match[1];
      if (f.content.includes('createRoot') || f.content.includes('ReactDOM.render')) {
        // Check for root or app or similar
        if (f.content.includes("'root'") || f.content.includes('"root"')) return 'root';
        if (f.content.includes("'app'") || f.content.includes('"app"')) return 'app';
      }
    }
  }
  return 'root';
}

function buildReactHtml(
  projectName: string,
  bundledJs: string,
  cssContent: string,
  rootId: string,
  originalHtml?: string
): string {
  // If there's an original index.html, use it as shell but inject our bundle
  if (originalHtml) {
    let html = originalHtml;
    // Inject CSS
    if (cssContent && html.includes('</head>')) {
      html = html.replace('</head>', `<style>${cssContent}</style>\n</head>`);
    }
    // Replace module script references and inject bundle
    html = html.replace(/<script[^>]*type=['"]module['"][^>]*>[\s\S]*?<\/script>/gi, '');
    html = html.replace(/<script[^>]*src=['"][^'"]*\.(tsx?|jsx?)['"][^>]*><\/script>/gi, '');
    if (html.includes('</body>')) {
      html = html.replace('</body>', `<script>${bundledJs}</script>\n</body>`);
    } else {
      html += `<script>${bundledJs}</script>`;
    }
    return html;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>${projectName}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    html, body, #${rootId} {
      margin: 0; padding: 0;
      width: 100%; height: 100%;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    ${cssContent}
  </style>
</head>
<body>
  <div id="${rootId}"></div>
  <script>
${bundledJs}
  </script>
</body>
</html>`;
}

function buildSimpleHtml(
  files: FileItem[],
  htmlEntry: FileItem | undefined,
  projectName: string,
  cssContent: string
): BundleResult {
  if (htmlEntry?.content) {
    return { success: true, html: htmlEntry.content };
  }
  const jsFiles = files.filter(f => !f.isFolder && (f.name.endsWith('.js') || f.name.endsWith('.ts')));
  const jsContent = jsFiles.map(f => f.content).join('\n');
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName}</title>
  <style>${cssContent}</style>
</head>
<body>
  <div id="root"></div>
  <script>${jsContent}</script>
</body>
</html>`;
  return { success: true, html };
}

function buildErrorHtml(projectName: string, error: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName} - Build Error</title>
  <style>
    body { margin: 0; background: #1e1e1e; color: #f87171; font-family: 'Fira Code', Consolas, monospace; padding: 24px; }
    h2 { color: #e06c75; font-size: 16px; margin-bottom: 12px; }
    pre { font-size: 11px; color: #ce9178; white-space: pre-wrap; word-break: break-all; background: #141414; padding: 16px; border-radius: 8px; }
    .hint { color: #6a9955; font-size: 12px; margin-top: 16px; }
  </style>
</head>
<body>
  <h2>Build failed: ${projectName}</h2>
  <pre>${error}</pre>
  <div class="hint">Tip: Make sure your entry file (main.tsx / index.tsx) exports a valid React app mounted to #root.</div>
</body>
</html>`;
}

function flattenFiles(items: FileItem[]): FileItem[] {
  const result: FileItem[] = [];
  const walk = (list: FileItem[]) => {
    for (const item of list) {
      result.push(item);
      if (item.children?.length) walk(item.children);
    }
  };
  walk(items);
  return result;
}
