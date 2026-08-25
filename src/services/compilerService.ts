import { fileSystemService } from './fileSystem';

const COMPILER_ENDPOINT_KEY = 'pocketcode_compiler_endpoint';
const COMPILER_AUTH_TOKEN_KEY = 'pocketcode_compiler_auth_token';
const DEFAULT_ENDPOINT = 'https://emkc.org/api/v2/piston';

export interface CompilerFile {
  name: string;
  content: string;
  encoding?: string;
}

export interface CompilerResult {
  language: string;
  version?: string;
  stdout: string;
  stderr: string;
  compileOutput?: string;
  exitCode: number;
  signal?: string | null;
  success: boolean;
  executionTimeMs?: number;
  error?: string;
}

interface LanguageMapping {
  language: string;
  version: string;
  aliases: string[];
}

const LANGUAGE_REGISTRY: Record<string, LanguageMapping> = {
  c: { language: 'c', version: '10.2.0', aliases: ['c', 'h'] },
  cpp: { language: 'c++', version: '10.2.0', aliases: ['cpp', 'c++', 'cc', 'cxx', 'hpp', 'hh'] },
  java: { language: 'java', version: '15.0.2', aliases: ['java'] },
  rust: { language: 'rust', version: '1.68.2', aliases: ['rust', 'rs'] },
  go: { language: 'go', version: '1.16.2', aliases: ['go', 'golang'] },
  csharp: { language: 'csharp.net', version: '6.12.0', aliases: ['csharp', 'cs', 'dotnet'] },
  php: { language: 'php', version: '8.2.3', aliases: ['php'] },
  ruby: { language: 'ruby', version: '3.0.1', aliases: ['ruby', 'rb'] },
  kotlin: { language: 'kotlin', version: '1.8.20', aliases: ['kotlin', 'kt', 'kts'] },
  swift: { language: 'swift', version: '5.3.3', aliases: ['swift'] },
  dart: { language: 'dart', version: '2.19.6', aliases: ['dart'] },
  zig: { language: 'zig', version: '0.10.1', aliases: ['zig'] },
  scala: { language: 'scala', version: '3.2.2', aliases: ['scala'] },
  r: { language: 'r', version: '4.1.1', aliases: ['r'] },
  lua: { language: 'lua', version: '5.4.4', aliases: ['lua'] },
  haskell: { language: 'haskell', version: '9.0.1', aliases: ['haskell', 'hs'] },
  bash: { language: 'bash', version: '5.2.0', aliases: ['bash', 'sh', 'shell'] },
  perl: { language: 'perl', version: '5.36.0', aliases: ['perl', 'pl'] },
  elixir: { language: 'elixir', version: '1.11.3', aliases: ['elixir', 'ex', 'exs'] },
  clojure: { language: 'clojure', version: '1.10.3', aliases: ['clojure', 'clj'] },
  typescript: { language: 'typescript', version: '5.0.3', aliases: ['typescript', 'ts'] },
  javascript: { language: 'javascript', version: '18.15.0', aliases: ['javascript', 'js', 'node'] },
  python: { language: 'python', version: '3.10.0', aliases: ['python', 'py'] }
};

export class CompilerService {
  private endpoint: string = '';
  private authToken: string = '';

  constructor() {
    this.endpoint = this.loadEndpoint();
    this.authToken = this.loadAuthToken();
  }

  getEndpoint(): string {
    return this.endpoint || DEFAULT_ENDPOINT;
  }

  getAuthToken(): string {
    return this.authToken;
  }

  setAuthToken(token: string): void {
    this.authToken = token.trim();
    try {
      localStorage.setItem(COMPILER_AUTH_TOKEN_KEY, this.authToken);
    } catch {}
  }

  private loadAuthToken(): string {
    try {
      return localStorage.getItem(COMPILER_AUTH_TOKEN_KEY) || '';
    } catch {
      return '';
    }
  }

  setEndpoint(url: string) {
    if (!url || typeof url !== 'string') {
      throw new Error('Invalid compiler endpoint URL');
    }
    const cleanUrl = url.trim().replace(/\/+$/, '');
    let parsed: URL;
    try {
      parsed = new URL(cleanUrl);
    } catch {
      throw new Error('Malformed compiler endpoint URL');
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Compiler endpoint must use HTTP or HTTPS');
    }

    const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    const isBlockedHost =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '::1' ||
      hostname === '169.254.169.254' ||
      hostname === 'metadata.google.internal' ||
      hostname === 'instance-data' ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.local') ||
      /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
      /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
      /^169\.254\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
      /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname);

    if (isBlockedHost) {
      throw new Error('Target endpoint is blocked by SSRF / security firewall');
    }

    this.endpoint = cleanUrl;
    localStorage.setItem(COMPILER_ENDPOINT_KEY, this.endpoint);
  }

  resetEndpoint() {
    this.endpoint = DEFAULT_ENDPOINT;
    localStorage.removeItem(COMPILER_ENDPOINT_KEY);
  }

  private loadEndpoint(): string {
    try {
      return localStorage.getItem(COMPILER_ENDPOINT_KEY) || DEFAULT_ENDPOINT;
    } catch {
      return DEFAULT_ENDPOINT;
    }
  }

  resolveLanguage(langOrExt: string): LanguageMapping | null {
    const query = langOrExt.toLowerCase().replace(/^\./, '');
    for (const key of Object.keys(LANGUAGE_REGISTRY)) {
      const entry = LANGUAGE_REGISTRY[key];
      if (entry.language === query || entry.aliases.includes(query) || key === query) {
        return entry;
      }
    }
    return null;
  }

  isSupported(langOrExt: string): boolean {
    return this.resolveLanguage(langOrExt) !== null;
  }

  /**
   * Compiles and executes code using the execution engine
   */
  async execute(
    mainFileName: string,
    mainCode: string,
    langOrExt: string,
    stdin: string = '',
    args: string[] = []
  ): Promise<CompilerResult> {
    const mapping = this.resolveLanguage(langOrExt);
    if (!mapping) {
      return {
        language: langOrExt,
        stdout: '',
        stderr: `Language "${langOrExt}" is not currently supported by the compiler engine.`,
        exitCode: 1,
        success: false,
        error: `Unsupported language: ${langOrExt}`
      };
    }

    // Collect related workspace files (e.g. headers, helper classes) to send as multi-file compilation
    const files: CompilerFile[] = [{ name: mainFileName, content: mainCode }];
    try {
      const allFiles = fileSystemService.getAllFlatFiles();
      const ext = mainFileName.split('.').pop()?.toLowerCase();
      
      // Include other files sharing similar extension in the same project up to 10 files
      let includedCount = 0;
      for (const f of allFiles) {
        if (f.name !== mainFileName && f.content && includedCount < 10) {
          const fExt = f.name.split('.').pop()?.toLowerCase();
          if (
            fExt === ext ||
            (ext === 'cpp' && (fExt === 'h' || fExt === 'hpp')) ||
            (ext === 'c' && fExt === 'h')
          ) {
            files.push({ name: f.name, content: f.content });
            includedCount++;
          }
        }
      }
    } catch {
      // Ignore file system enumeration errors
    }

    const payload = {
      language: mapping.language,
      version: mapping.version,
      files,
      stdin,
      args,
      compile_timeout: 10000,
      run_timeout: 8000
    };

    const startTime = performance.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (this.authToken) {
        headers['Authorization'] = `Bearer ${this.authToken}`;
      }

      const endpoint = `${this.getEndpoint()}/execute`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`Compiler server error (${response.status}): ${errorText || response.statusText}`);
      }

      const data = await response.json();
      const executionTimeMs = Math.round(performance.now() - startTime);

      const compileOutput = data.compile ? (data.compile.output || data.compile.stderr || '') : '';
      const runStdout = data.run ? (data.run.stdout || data.run.output || '') : '';
      const runStderr = data.run ? (data.run.stderr || '') : '';
      const exitCode = data.run ? (data.run.code ?? (data.compile?.code ?? 0)) : (data.compile?.code ?? 1);
      const signal = data.run?.signal || data.compile?.signal || null;

      const hasCompileError = data.compile && data.compile.code !== 0;
      const isSuccess = !hasCompileError && exitCode === 0;

      return {
        language: mapping.language,
        version: data.version || mapping.version,
        stdout: runStdout,
        stderr: runStderr,
        compileOutput,
        exitCode,
        signal,
        success: isSuccess,
        executionTimeMs
      };
    } catch (err: any) {
      const executionTimeMs = Math.round(performance.now() - startTime);
      const isAbort = err.name === 'AbortError';
      const msg = isAbort
        ? 'Compilation & execution timed out after 20 seconds.'
        : (err.message || 'Failed to connect to compiler server.');

      return {
        language: mapping.language,
        version: mapping.version,
        stdout: '',
        stderr: msg,
        exitCode: 1,
        success: false,
        executionTimeMs,
        error: msg
      };
    }
  }

  /**
   * Fetches available runtimes from the execution backend
   */
  async getRuntimes(): Promise<Array<{ language: string; version: string; aliases: string[] }>> {
    try {
      const response = await fetch(`${this.getEndpoint()}/runtimes`);
      if (response.ok) {
        return await response.json();
      }
    } catch {
      // Fallback
    }
    return Object.values(LANGUAGE_REGISTRY);
  }
}

export const compilerService = new CompilerService();
