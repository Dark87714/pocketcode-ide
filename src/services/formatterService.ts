export class FormatterService {
  /**
   * Formats source code based on language
   */
  formatCode(code: string, language: string): string {
    const lang = (language || '').toLowerCase();

    try {
      if (lang === 'json') {
        const parsed = JSON.parse(code);
        return JSON.stringify(parsed, null, 2);
      }

      if (lang === 'html' || lang === 'xml') {
        return this.formatHTML(code);
      }

      if (lang === 'css' || lang === 'scss') {
        return this.formatCSS(code);
      }

      if (lang === 'javascript' || lang === 'typescript' || lang === 'js' || lang === 'ts' || lang === 'jsx' || lang === 'tsx') {
        return this.formatJS(code);
      }

      if (lang === 'sql') {
        return this.formatSQL(code);
      }

      if (lang === 'python' || lang === 'py') {
        return this.formatPython(code);
      }

      // Default generic indent cleanup
      return this.formatGeneric(code);
    } catch (e) {
      console.warn('Formatting fallback:', e);
      return code;
    }
  }

  private formatJS(code: string): string {
    const lines = code.split('\n');
    let indent = 0;
    const formatted: string[] = [];

    lines.forEach(line => {
      let trimmed = line.trim();
      if (!trimmed) {
        formatted.push('');
        return;
      }

      // Decrease indent if closing bracket
      if (trimmed.startsWith('}') || trimmed.startsWith(']') || trimmed.startsWith(')')) {
        indent = Math.max(0, indent - 1);
      }

      formatted.push('  '.repeat(indent) + trimmed);

      // Increase indent if opening bracket without immediate close
      const opens = (trimmed.match(/[\{\[\(]/g) || []).length;
      const closes = (trimmed.match(/[\}\]\)]/g) || []).length;
      if (opens > closes && !trimmed.startsWith('//')) {
        indent += (opens - closes);
      }
    });

    return formatted.join('\n');
  }

  private formatHTML(code: string): string {
    let formatted = '';
    let indent = 0;
    const tab = '  ';

    // Normalize spacing around tags
    const clean = code.replace(/>\s*</g, '><').trim();
    const tokens = clean.split(/(<[^>]+>)/g).filter(Boolean);

    const selfClosing = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr', '!doctype'];

    tokens.forEach(token => {
      const trimmed = token.trim();
      if (!trimmed) return;

      if (trimmed.startsWith('<!--')) {
        formatted += tab.repeat(indent) + trimmed + '\n';
      } else if (trimmed.startsWith('</')) {
        indent = Math.max(0, indent - 1);
        formatted += tab.repeat(indent) + trimmed + '\n';
      } else if (trimmed.startsWith('<')) {
        const tagName = (trimmed.match(/<([a-zA-Z0-9\-!]+)/) || [])[1]?.toLowerCase();
        const isSelfClosing = trimmed.endsWith('/>') || (tagName && selfClosing.includes(tagName));

        formatted += tab.repeat(indent) + trimmed + '\n';
        if (!isSelfClosing) {
          indent++;
        }
      } else {
        formatted += tab.repeat(indent) + trimmed + '\n';
      }
    });

    return formatted.trim();
  }

  private formatCSS(code: string): string {
    const lines = code.replace(/\{/g, ' {\n').replace(/\}/g, '\n}\n').replace(/;/g, ';\n').split('\n');
    let indent = 0;
    const formatted: string[] = [];

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;

      if (trimmed === '}') {
        indent = Math.max(0, indent - 1);
      }

      formatted.push('  '.repeat(indent) + trimmed);

      if (trimmed.endsWith('{')) {
        indent++;
      }
    });

    return formatted.join('\n');
  }

  private formatSQL(code: string): string {
    const keywords = [
      'SELECT', 'FROM', 'WHERE', 'INSERT INTO', 'VALUES', 'UPDATE', 'SET',
      'DELETE', 'CREATE TABLE', 'DROP TABLE', 'ALTER TABLE', 'JOIN', 'LEFT JOIN',
      'RIGHT JOIN', 'INNER JOIN', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT',
      'OFFSET', 'UNION', 'AND', 'OR', 'NOT', 'NULL', 'PRIMARY KEY', 'FOREIGN KEY'
    ];

    let result = code;
    keywords.forEach(kw => {
      const regex = new RegExp(`\\b${kw}\\b`, 'gi');
      result = result.replace(regex, kw);
    });

    return result;
  }

  private formatPython(code: string): string {
    const lines = code.split('\n');
    let indent = 0;
    const formatted: string[] = [];

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) {
        formatted.push('');
        return;
      }

      if (trimmed.startsWith('elif ') || trimmed.startsWith('else:') || trimmed.startsWith('except') || trimmed.startsWith('finally:')) {
        indent = Math.max(0, indent - 1);
      }

      formatted.push('    '.repeat(indent) + trimmed);

      if (trimmed.endsWith(':') && !trimmed.startsWith('#')) {
        indent++;
      } else if (trimmed.startsWith('return') || trimmed.startsWith('pass') || trimmed.startsWith('raise') || trimmed.startsWith('break')) {
        // May decrease indent on next lines if appropriate
      }
    });

    return formatted.join('\n');
  }

  private formatGeneric(code: string): string {
    return code.split('\n').map(l => l.trimEnd()).join('\n');
  }
}

export const formatterService = new FormatterService();
