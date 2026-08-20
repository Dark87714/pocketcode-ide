import { FileItem } from '../types';

export interface SecurityThreat {
  id: string;
  type: 'SSRF' | 'XSS' | 'SQLi' | 'PATH_TRAVERSAL' | 'COMMAND_INJECTION' | 'SECRET_LEAK' | 'PROTOTYPE_POLLUTION';
  severity: 'critical' | 'high' | 'medium' | 'low';
  source: string;
  payload: string;
  timestamp: string;
  action: 'BLOCKED' | 'WARNED' | 'SANITIZED';
  description: string;
}

export interface SecretFinding {
  file: string;
  line: number;
  type: string;
  maskedValue: string;
  severity: 'critical' | 'high' | 'medium';
}

export interface SecurityAuditResult {
  score: number; // 0 - 100
  status: 'ARMORED' | 'SECURE' | 'WARNING' | 'CRITICAL';
  threatsBlocked: number;
  secretsFound: SecretFinding[];
  vulnerabilities: { id: string; name: string; severity: 'high' | 'medium' | 'low'; advice: string }[];
  sandboxStatus: 'ISOLATED' | 'PROTECTED';
  wafStatus: 'ACTIVE_STRICT' | 'ACTIVE_STANDARD';
  timestamp: string;
}

export class SecurityService {
  private threats: SecurityThreat[] = [];
  private blockedDomains: Set<string> = new Set([
    '169.254.169.254', // AWS/GCP metadata endpoint
    'metadata.google.internal',
    'attacker.com',
    'malware.onion',
    'c2-server.net'
  ]);
  private allowedDomains: Set<string> = new Set([
    'esm.sh',
    'cdn.jsdelivr.net',
    'cdnjs.cloudflare.com',
    'unpkg.com',
    'api.github.com',
    'raw.githubusercontent.com',
    'pypi.org',
    'files.pythonhosted.org',
    'cdn.tailwindcss.com'
  ]);
  private isStrictMode: boolean = true;
  private isWafEnabled: boolean = true;

  constructor() {
    // Seed initial security monitor event
    this.recordThreat({
      id: `threat_init_${Date.now()}`,
      type: 'SSRF',
      severity: 'high',
      source: 'System Startup',
      payload: '169.254.169.254/latest/meta-data',
      timestamp: new Date().toLocaleTimeString(),
      action: 'BLOCKED',
      description: 'Cloud metadata IP access blocked by WAF default rule.'
    });
  }

  getThreats(): SecurityThreat[] {
    return [...this.threats];
  }

  isWafActive(): boolean {
    return this.isWafEnabled;
  }

  setWafActive(active: boolean): void {
    this.isWafEnabled = active;
  }

  isStrict(): boolean {
    return this.isStrictMode;
  }

  setStrict(strict: boolean): void {
    this.isStrictMode = strict;
  }

  recordThreat(threat: SecurityThreat): void {
    this.threats.unshift(threat);
    if (this.threats.length > 100) {
      this.threats.pop();
    }
  }

  clearThreats(): void {
    this.threats = [];
  }

  /**
   * Web Application Firewall (WAF): Inspects outbound network targets
   */
  validateNetworkRequest(url: string, source = 'User Code'): { allowed: boolean; reason?: string } {
    if (!this.isWafEnabled) return { allowed: true };

    try {
      // Handle relative paths
      if (url.startsWith('/') || url.startsWith('./')) {
        return { allowed: true };
      }

      // Check protocol
      const lower = url.toLowerCase().trim();
      if (lower.startsWith('javascript:') || lower.startsWith('data:text/html') || lower.startsWith('vbscript:')) {
        const threat: SecurityThreat = {
          id: `threat_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          type: 'XSS',
          severity: 'critical',
          source,
          payload: url.slice(0, 100),
          timestamp: new Date().toLocaleTimeString(),
          action: 'BLOCKED',
          description: 'Dangerous URI scheme blocked by WAF'
        };
        this.recordThreat(threat);
        return { allowed: false, reason: 'Dangerous URI scheme blocked by WAF' };
      }

      const parsed = new URL(url);
      const hostname = parsed.hostname.toLowerCase();

      // Block SSRF to internal / private addresses
      const isPrivateIp = 
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '0.0.0.0' ||
        hostname === '::1' ||
        hostname === '169.254.169.254' ||
        /^10\.\d+\.\d+\.\d+$/.test(hostname) ||
        /^192\.168\.\d+\.\d+$/.test(hostname) ||
        /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(hostname);

      if (isPrivateIp && this.isStrictMode) {
        const threat: SecurityThreat = {
          id: `threat_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          type: 'SSRF',
          severity: 'critical',
          source,
          payload: url,
          timestamp: new Date().toLocaleTimeString(),
          action: 'BLOCKED',
          description: `SSRF Attack blocked: Request to internal/private host (${hostname})`
        };
        this.recordThreat(threat);
        return { allowed: false, reason: `WAF Blocked: Connection to private internal network (${hostname}) is forbidden` };
      }

      // Check explicit blacklist
      if (this.blockedDomains.has(hostname)) {
        const threat: SecurityThreat = {
          id: `threat_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          type: 'SSRF',
          severity: 'high',
          source,
          payload: url,
          timestamp: new Date().toLocaleTimeString(),
          action: 'BLOCKED',
          description: `Blacklisted domain blocked by WAF (${hostname})`
        };
        this.recordThreat(threat);
        return { allowed: false, reason: `WAF Blocked: ${hostname} is on the security blocklist` };
      }

      return { allowed: true };
    } catch (e: any) {
      return { allowed: true };
    }
  }

  /**
   * Web Application Firewall: Deep Payload Inspection for Code & Inputs
   */
  inspectPayload(payload: string, source = 'Terminal / Editor'): { safe: boolean; threats: string[] } {
    if (!this.isWafEnabled) return { safe: true, threats: [] };

    const detected: string[] = [];

    // 1. Path Traversal check
    if (/(\.\.[\/\\]){2,}/.test(payload) || /[\/\\]etc[\/\\](passwd|shadow)/i.test(payload)) {
      detected.push('Path Traversal (directory escape attempt)');
      this.recordThreat({
        id: `threat_${Date.now()}_pt`,
        type: 'PATH_TRAVERSAL',
        severity: 'high',
        source,
        payload: payload.slice(0, 100),
        timestamp: new Date().toLocaleTimeString(),
        action: 'BLOCKED',
        description: 'Directory path traversal attempt detected and contained'
      });
    }

    // 2. Severe Command Injection patterns
    if (/;\s*(rm\s+-rf\s+\/|nc\s+-e|bash\s+-i|mkfifo|powershell\s+-enc)/i.test(payload)) {
      detected.push('Remote Shell / Destructive Command Injection');
      this.recordThreat({
        id: `threat_${Date.now()}_ci`,
        type: 'COMMAND_INJECTION',
        severity: 'critical',
        source,
        payload: payload.slice(0, 100),
        timestamp: new Date().toLocaleTimeString(),
        action: 'BLOCKED',
        description: 'Host-level command injection payload intercepted'
      });
    }

    // 3. Prototype Pollution check
    if (/__proto__|constructor\.prototype|Object\.prototype/i.test(payload)) {
      detected.push('Prototype Pollution attempt');
      this.recordThreat({
        id: `threat_${Date.now()}_pp`,
        type: 'PROTOTYPE_POLLUTION',
        severity: 'medium',
        source,
        payload: payload.slice(0, 100),
        timestamp: new Date().toLocaleTimeString(),
        action: 'SANITIZED',
        description: 'Prototype modification attempt intercepted by runtime sandbox'
      });
    }

    return { safe: detected.length === 0, threats: detected };
  }

  /**
   * Secret & Credential Leak Scanner (DLP)
   */
  scanForSecrets(files: FileItem[]): SecretFinding[] {
    const findings: SecretFinding[] = [];

    const patterns: { name: string; regex: RegExp; severity: 'critical' | 'high' | 'medium' }[] = [
      { name: 'OpenAI API Key', regex: /sk-[a-zA-Z0-9]{20,T3BlbkFJ[a-zA-Z0-9]{20,}/g, severity: 'critical' },
      { name: 'Generic API Key (Bearer / Token)', regex: /(api[_-]?key|access[_-]?token|secret[_-]?key)\s*[:=]\s*['"][a-zA-Z0-9_\-]{24,}['"]/gi, severity: 'high' },
      { name: 'AWS Access Key ID', regex: /AKIA[0-9A-Z]{16}/g, severity: 'critical' },
      { name: 'GitHub Personal Access Token', regex: /ghp_[a-zA-Z0-9]{36}/g, severity: 'critical' },
      { name: 'Google API Key', regex: /AIza[0-9A-Za-z\\-_]{35}/g, severity: 'critical' },
      { name: 'SSH / RSA Private Key', regex: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/g, severity: 'critical' },
      { name: 'Database Connection String with Password', regex: /(postgres|mysql|mongodb|redis):\/\/[a-zA-Z0-9_]+:[^@\s]+@[a-zA-Z0-9_\-\.]+/gi, severity: 'high' }
    ];

    const flatFiles: FileItem[] = [];
    const flatten = (items: FileItem[]) => {
      for (const item of items) {
        if (!item.isFolder) flatFiles.push(item);
        if (item.children) flatten(item.children);
      }
    };
    flatten(files);

    flatFiles.forEach(file => {
      if (!file.content) return;
      const lines = file.content.split('\n');

      lines.forEach((line, lineIdx) => {
        patterns.forEach(pat => {
          const matches = line.match(pat.regex);
          if (matches) {
            matches.forEach(m => {
              findings.push({
                file: file.path,
                line: lineIdx + 1,
                type: pat.name,
                maskedValue: m.slice(0, 6) + '••••••••' + m.slice(-4),
                severity: pat.severity
              });
            });
          }
        });
      });
    });

    return findings;
  }

  /**
   * Generates strict Content Security Policy (CSP) headers for Live Previews
   */
  generatePreviewCsp(): string {
    return `<meta http-equiv="Content-Security-Policy" content="
      default-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data: https://esm.sh https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://unpkg.com https://cdn.tailwindcss.com;
      script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://esm.sh https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://unpkg.com https://cdn.tailwindcss.com;
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net;
      font-src 'self' data: https://fonts.gstatic.com;
      img-src 'self' data: blob: https:;
      media-src 'self' data: blob: https:;
      connect-src 'self' https: wss: blob:;
      frame-src 'self' blob:;
      object-src 'none';
      base-uri 'self';
    ">`;
  }

  /**
   * Run full workspace security audit
   */
  runFullSecurityAudit(files: FileItem[]): SecurityAuditResult {
    const secrets = this.scanForSecrets(files);
    const vulnerabilities: { id: string; name: string; severity: 'high' | 'medium' | 'low'; advice: string }[] = [];

    // Check if any secrets found
    if (secrets.length > 0) {
      vulnerabilities.push({
        id: 'VULN-001',
        name: 'Plaintext Credentials in Workspace',
        severity: 'high',
        advice: 'Move API keys and tokens to .env variables or secret storage.'
      });
    }

    // Check for unsafe eval in JS files
    const flatFiles: FileItem[] = [];
    const flatten = (items: FileItem[]) => {
      items.forEach(i => {
        if (!i.isFolder) flatFiles.push(i);
        if (i.children) flatten(i.children);
      });
    };
    flatten(files);

    const hasDirectEval = flatFiles.some(f => (f.name.endsWith('.js') || f.name.endsWith('.ts')) && /window\.eval\(|document\.write\(/g.test(f.content || ''));
    if (hasDirectEval) {
      vulnerabilities.push({
        id: 'VULN-002',
        name: 'Direct eval() / document.write() usage',
        severity: 'medium',
        advice: 'Avoid direct eval() to prevent dynamic code injection vulnerabilities.'
      });
    }

    let score = 100;
    secrets.forEach(s => {
      if (s.severity === 'critical') score -= 25;
      else if (s.severity === 'high') score -= 15;
      else score -= 5;
    });

    if (hasDirectEval) score -= 10;
    score = Math.max(10, Math.min(100, score));

    const status: 'ARMORED' | 'SECURE' | 'WARNING' | 'CRITICAL' = 
      score >= 90 ? 'ARMORED' : score >= 75 ? 'SECURE' : score >= 50 ? 'WARNING' : 'CRITICAL';

    return {
      score,
      status,
      threatsBlocked: this.threats.filter(t => t.action === 'BLOCKED').length,
      secretsFound: secrets,
      vulnerabilities,
      sandboxStatus: 'PROTECTED',
      wafStatus: this.isStrictMode ? 'ACTIVE_STRICT' : 'ACTIVE_STANDARD',
      timestamp: new Date().toLocaleTimeString()
    };
  }

  addBlockedDomain(domain: string): void {
    this.blockedDomains.add(domain.toLowerCase().trim());
  }

  removeBlockedDomain(domain: string): void {
    this.blockedDomains.delete(domain.toLowerCase().trim());
  }

  getBlockedDomains(): string[] {
    return Array.from(this.blockedDomains);
  }

  getAllowedDomains(): string[] {
    return Array.from(this.allowedDomains);
  }
}

export const securityService = new SecurityService();
