import { FileItem } from '../types';
import { pyodideService } from './pyodideService';
import { fileSystemService } from './fileSystem';
import { securityService } from './securityService';
import { compilerService } from './compilerService';
import { sqliteService } from './sqliteService';

export interface RunResult {
  language: string;
  type: 'terminal' | 'preview' | 'markdown' | 'sql';
  output?: string[];
  sqlResult?: { headers: string[]; rows: any[][] };
  error?: string;
}

export class UniversalRunnerService {
  /**
   * Executes code in any supported programming language
   */
  async runFile(
    file: FileItem,
    onOutput: (line: string, type: 'stdout' | 'stderr' | 'system' | 'table') => void
  ): Promise<RunResult> {
    // 0. SECURITY & WAF INSPECTION
    const inspection = securityService.inspectPayload(file.content, file.name);
    if (!inspection.safe) {
      onOutput(`🛡️ [WAF SECURITY WARNING] Detected suspicious patterns: ${inspection.threats.join(', ')}`, 'stderr');
    }

    const lang = (file.language || 'plaintext').toLowerCase();
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    // 1. PYTHON
    if (lang === 'python' || ext === 'py') {
      onOutput(`⚡ Initializing Python 3.11 WASM Environment...`, 'system');
      await pyodideService.runPython(
        file.content,
        (msg) => onOutput(msg, 'stdout'),
        (err) => onOutput(err, 'stderr')
      );
      return { language: 'Python', type: 'terminal' };
    }

    // 2. JAVASCRIPT & TYPESCRIPT
    if (lang === 'javascript' || lang === 'typescript' || ext === 'js' || ext === 'ts' || ext === 'mjs') {
      // Static code security scan (BUG-006)
      const scan = securityService.scanCode(file.content, file.name);
      if (scan.riskLevel === 'critical') {
        onOutput(`🛡️ [WAF CRITICAL BLOCK] Code execution aborted due to detected dangerous payload: ${scan.threats.join(', ')}`, 'stderr');
        return { language: 'JavaScript', type: 'terminal', error: 'Blocked by Security WAF' };
      }

      onOutput(`⚡ Executing ${file.name} in V8 Isolated Sandbox (Web Worker)...`, 'system');
      try {
        const logs: string[] = [];
        
        let executableCode = file.content;
        if (lang === 'typescript' || ext === 'ts') {
          const ts = await import('typescript');
          executableCode = ts.transpile(executableCode, { target: ts.ScriptTarget.ES2022 });
        }

        return await new Promise<RunResult>((resolve) => {
          // Hardened sandbox preamble (BUG-001, BUG-004)
          const workerCode = `
            'use strict';
            // Allowlist-based Global Scope Stripping (BUG-001, BUG-004, BUG-005)
            try {
              const SAFE_GLOBALS = new Set([
                'undefined', 'NaN', 'Infinity', 'isFinite', 'isNaN', 'parseFloat', 'parseInt',
                'decodeURI', 'decodeURIComponent', 'encodeURI', 'encodeURIComponent',
                'Object', 'Function', 'Array', 'Number', 'String', 'Boolean', 'Symbol', 'Date', 'Promise', 'RegExp',
                'Error', 'EvalError', 'RangeError', 'ReferenceError', 'SyntaxError', 'TypeError', 'URIError',
                'JSON', 'Math', 'Intl', 'ArrayBuffer', 'Uint8Array', 'Int8Array', 'Uint16Array', 'Int16Array',
                'Uint32Array', 'Int32Array', 'Float32Array', 'Float64Array', 'BigInt64Array', 'BigUint64Array',
                'DataView', 'Map', 'Set', 'WeakMap', 'WeakSet', 'BigInt',
                'console', 'fetch', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
                'onmessage', 'postMessage', 'performance', 'self', 'globalThis'
              ]);

              // Strip all non-allowlisted properties from global scope
              const globalProps = Object.getOwnPropertyNames(self);
              for (const prop of globalProps) {
                if (!SAFE_GLOBALS.has(prop)) {
                  try {
                    delete self[prop];
                    if (self[prop] !== undefined) {
                      self[prop] = undefined;
                    }
                  } catch (e) {}
                }
              }

              // Explicitly neutralize hazardous APIs
              self.importScripts = function() { throw new Error('Security Error: importScripts() is disabled.'); };
              self.WebSocket = undefined;
              self.EventSource = undefined;
              self.XMLHttpRequest = undefined;
              self.Worker = undefined;
              self.SharedWorker = undefined;
              self.BroadcastChannel = undefined;
              self.MessageChannel = undefined;
              self.Notification = undefined;
              self.indexedDB = undefined;
              self.caches = undefined;
              self.openDatabase = undefined;
              if (self.navigator) {
                try { self.navigator.sendBeacon = undefined; } catch(e) {}
              }

              // Deep prototype freezing to defeat prototype pollution and sandbox escape
              Object.freeze(Object.prototype);
              Object.freeze(Array.prototype);
              Object.freeze(Function.prototype);
              Object.freeze(String.prototype);
              Object.freeze(Number.prototype);
              Object.freeze(Boolean.prototype);
            } catch(e) {}

            self.onmessage = async (e) => {
              if (!e.data || typeof e.data !== 'object') return;
              const { code, wafEnabled, strictMode, blockedDomains, allowedDomains } = e.data;
              
              let logCount = 0;
              const MAX_LOGS = 500;
              const MAX_STR_LEN = 10000;

              const sanitizeArg = (a) => {
                let str = typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a);
                if (str && str.length > MAX_STR_LEN) {
                  str = str.slice(0, MAX_STR_LEN) + '... [Truncated: output exceeded 10KB limit]';
                }
                return str;
              };

              const postLog = (type, msg) => {
                if (logCount >= MAX_LOGS) {
                  if (logCount === MAX_LOGS) {
                    logCount++;
                    self.postMessage({ type: 'stderr', msg: '⚠️ [Output Quota Exceeded] Truncating further logs (Max: 500 lines reached to protect device memory).' });
                  }
                  return;
                }
                logCount++;
                self.postMessage({ type, msg });
              };

              const customConsole = {
                log: (...args) => postLog('stdout', args.map(sanitizeArg).join(' ')),
                warn: (...args) => postLog('stderr', '[WARN] ' + args.map(sanitizeArg).join(' ')),
                error: (...args) => postLog('stderr', '[ERROR] ' + args.map(sanitizeArg).join(' ')),
                table: (data) => postLog('stdout', typeof data === 'object' ? sanitizeArg(data) : String(data))
              };

              const originalFetch = typeof fetch === 'function' ? fetch : null;
              const sandboxedFetch = async (url, init) => {
                if (!originalFetch) throw new Error('Fetch API is not available.');
                if (wafEnabled) {
                  const urlStr = typeof url === 'string' ? url : String(url);
                  if (urlStr.toLowerCase().startsWith('javascript:') || urlStr.toLowerCase().startsWith('data:text/html')) {
                    throw new Error('Dangerous URI scheme blocked by WAF');
                  }
                  try {
                    const parsed = new URL(urlStr, 'https://localhost');
                    const hostname = parsed.hostname.toLowerCase();
                    const isPrivateIp = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0' || hostname === '169.254.169.254' || /^10\\.\\d+\\.\\d+\\.\\d+$/.test(hostname) || /^192\\.168\\.\\d+\\.\\d+$/.test(hostname) || /^172\\.(1[6-9]|2\\d|3[01])\\.\\d+\\.\\d+$/.test(hostname);
                    
                    if (isPrivateIp && strictMode) {
                      throw new Error('WAF Blocked: Connection to private internal network is forbidden');
                    }
                    if (blockedDomains && blockedDomains.includes(hostname)) {
                      throw new Error('WAF Blocked: Domain is on the security blocklist');
                    }
                    if (strictMode && allowedDomains && allowedDomains.length > 0 && !allowedDomains.includes(hostname) && !isPrivateIp) {
                      throw new Error('WAF Strict Mode: Domain is not in the allowed destinations list (' + hostname + ')');
                    }
                  } catch (err) {
                    if (err.message && err.message.includes('WAF')) {
                      throw new Error('[WAF Security Firewall] Blocked outbound request to: ' + urlStr + '. ' + err.message);
                    }
                  }
                }
                return originalFetch(url, init);
              };

              try {
                // Secure encapsulated execution
                const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
                const runner = new AsyncFunction('console', 'fetch', code);
                await runner(customConsole, sandboxedFetch);
                self.postMessage({ type: 'done' });
              } catch (err) {
                self.postMessage({ type: 'error', error: err ? String(err.message || err) : 'Runtime Error', stack: err ? err.stack : '' });
              }
            };
          `;

          const blob = new Blob([workerCode], { type: 'application/javascript' });
          const workerUrl = URL.createObjectURL(blob);
          const worker = new Worker(workerUrl);

          let isCleanedUp = false;
          let watchdogTimer: any = null;

          const cleanup = () => {
            if (isCleanedUp) return;
            isCleanedUp = true;
            if (watchdogTimer) clearTimeout(watchdogTimer);
            try { worker.terminate(); } catch(e) {}
            try { URL.revokeObjectURL(workerUrl); } catch(e) {}
          };

          // Watchdog execution timeout: 10 seconds (BUG-002)
          watchdogTimer = setTimeout(() => {
            onOutput(`⏱️ [Execution Timeout] Process exceeded 10s runtime limit. Terminated infinite loop or long-running task.`, 'stderr');
            cleanup();
            resolve({ language: 'JavaScript', type: 'terminal', error: 'Execution Timed Out (10s limit)' });
          }, 10000);

          worker.onmessage = (e: MessageEvent) => {
            // Strong message validation (BUG-007)
            const data = e.data;
            if (!data || typeof data !== 'object') return;

            if (data.type === 'stdout' && typeof data.msg === 'string') {
              if (logs.length < 500) logs.push(data.msg);
              onOutput(data.msg, 'stdout');
            } else if (data.type === 'stderr' && typeof data.msg === 'string') {
              if (logs.length < 500) logs.push(data.msg);
              onOutput(data.msg, 'stderr');
            } else if (data.type === 'error') {
              const errMsg = typeof data.error === 'string' ? data.error : 'Unknown runtime error';
              onOutput(`❌ Runtime Error: ${errMsg}\n${data.stack || ''}`, 'stderr');
              cleanup();
              resolve({ language: 'JavaScript', type: 'terminal', error: errMsg });
            } else if (data.type === 'done') {
              if (logs.length === 0) {
                onOutput(`✅ Script executed cleanly (0 console outputs).`, 'system');
              } else {
                onOutput(`\n✨ Process completed with exit code 0.`, 'system');
              }
              cleanup();
              resolve({ language: 'JavaScript', type: 'terminal', output: logs });
            }
          };

          worker.onerror = (err: ErrorEvent) => {
            const msg = err.message || 'Worker thread execution failure';
            onOutput(`❌ Sandbox Execution Crash: ${msg}`, 'stderr');
            cleanup();
            resolve({ language: 'JavaScript', type: 'terminal', error: msg });
          };
          
          worker.postMessage({
            code: executableCode,
            wafEnabled: securityService.isWafActive(),
            strictMode: securityService.isStrict(),
            blockedDomains: securityService.getBlockedDomains(),
            allowedDomains: securityService.getAllowedDomains()
          });
        });
      } catch (err: any) {
        onOutput(`❌ Runtime Error: ${err.message}\n${err.stack || ''}`, 'stderr');
        return { language: 'JavaScript', type: 'terminal', error: err.message };
      }
    }

    // 3. SQL DATABASE ENGINE (SQLite in-browser WASM relational runner)
    if (lang === 'sql' || ext === 'sql') {
      onOutput(`⚡ Executing SQL Queries (SQLite WASM)...`, 'system');
      try {
        const result = await sqliteService.executeQuery(file.content);
        if (result.error) {
          onOutput(`❌ SQL Error: ${result.error}`, 'stderr');
          return { language: 'SQL', type: 'terminal', error: result.error };
        }
        if (result.columns.length > 0) {
          this.formatSqlTable(result.columns, result.rows, onOutput);
          onOutput(`\n✨ Query OK: ${result.rows.length} row(s) in set (${result.executionTimeMs}ms)`, 'system');
        } else {
          onOutput(`✅ Statement executed successfully (${result.rowsAffected || 0} row(s) affected, ${result.executionTimeMs}ms)`, 'system');
        }
        return { language: 'SQL', type: 'terminal', sqlResult: { headers: result.columns, rows: result.rows } };
      } catch (err: any) {
        onOutput(`❌ SQL Execution Error: ${err.message}`, 'stderr');
        return { language: 'SQL', type: 'terminal', error: err.message };
      }
    }

    // 4. MULTI-LANGUAGE COMPILER & EXECUTION ENGINE (C, C++, Java, Rust, Go, C#, PHP, Ruby, Kotlin, Swift, Dart, Zig, etc.)
    if (compilerService.isSupported(ext || lang)) {
      const mapping = compilerService.resolveLanguage(ext || lang);
      const displayLang = mapping ? mapping.language.toUpperCase() : lang.toUpperCase();
      const versionStr = mapping?.version ? ` v${mapping.version}` : '';
      onOutput(`⚡ Compiling & running ${file.name} (${displayLang}${versionStr})...`, 'system');

      const result = await compilerService.execute(file.name, file.content, ext || lang);

      if (result.compileOutput) {
        onOutput(`[Compiler Diagnostics]\n${result.compileOutput}`, result.exitCode === 0 ? 'system' : 'stderr');
      }

      if (result.stdout) {
        onOutput(result.stdout, 'stdout');
      }

      if (result.stderr) {
        onOutput(result.stderr, 'stderr');
      }

      if (result.success) {
        onOutput(`\n✨ Process finished with exit code 0 (${result.executionTimeMs || 0}ms)`, 'system');
        return { language: displayLang, type: 'terminal', output: [result.stdout] };
      } else {
        onOutput(`\n❌ Process exited with code ${result.exitCode}${result.signal ? ` (Signal: ${result.signal})` : ''}`, 'stderr');
        return { language: displayLang, type: 'terminal', error: result.stderr || result.compileOutput };
      }
    }

    // 5. HTML / CSS / WEB APP
    if (lang === 'html' || ext === 'html' || ext === 'htm') {
      return { language: 'HTML', type: 'preview' };
    }

    // 6. MARKDOWN PREVIEW
    if (lang === 'markdown' || ext === 'md') {
      onOutput(`📄 Rendering Markdown Document...`, 'system');
      onOutput(file.content, 'stdout');
      return { language: 'Markdown', type: 'markdown' };
    }

    // 7. JSON / YAML / XML
    if (lang === 'json' || ext === 'json' || lang === 'yaml' || ext === 'yaml' || ext === 'yml') {
      try {
        if (ext === 'json') {
          const parsed = JSON.parse(file.content);
          onOutput(`✅ Valid JSON Format:`, 'system');
          onOutput(JSON.stringify(parsed, null, 2), 'stdout');
        } else {
          onOutput(`📄 ${file.name} content:`, 'system');
          onOutput(file.content, 'stdout');
        }
      } catch (err: any) {
        onOutput(`❌ Syntax Error in ${file.name}: ${err.message}`, 'stderr');
      }
      return { language: 'Data', type: 'terminal' };
    }

    onOutput(`📄 ${file.name}:\n${file.content}`, 'stdout');
    return { language: 'Text', type: 'terminal' };
  }

  // --- ASCII Table Formatter for SQLite WASM Results ---
  private formatSqlTable(
    columns: string[],
    rows: any[][],
    onOutput: (line: string, type: 'stdout' | 'stderr' | 'system') => void
  ) {
    if (columns.length === 0) return;
    const colWidths = columns.map((col, idx) => {
      let max = col.length;
      for (const row of rows) {
        const valStr = row[idx] !== null && row[idx] !== undefined ? String(row[idx]) : 'NULL';
        if (valStr.length > max) max = valStr.length;
      }
      return Math.min(Math.max(max, 4), 40);
    });

    const separator = '+' + colWidths.map(w => '-'.repeat(w + 2)).join('+') + '+';
    const headerRow = '|' + columns.map((c, i) => ` ${c.padEnd(colWidths[i])} `).join('|') + '|';

    onOutput(separator, 'stdout');
    onOutput(headerRow, 'stdout');
    onOutput(separator, 'stdout');

    for (const row of rows) {
      const rowStr = '|' + row.map((val, i) => {
        const str = val !== null && val !== undefined ? String(val) : 'NULL';
        const truncated = str.length > colWidths[i] ? str.slice(0, colWidths[i] - 3) + '...' : str;
        return ` ${truncated.padEnd(colWidths[i])} `;
      }).join('|') + '|';
      onOutput(rowStr, 'stdout');
    }
    onOutput(separator, 'stdout');
  }
}

export const universalRunnerService = new UniversalRunnerService();
