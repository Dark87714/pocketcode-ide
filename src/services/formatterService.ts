import * as prettier from 'prettier/standalone';
import * as prettierPluginBabel from 'prettier/plugins/babel';
import * as prettierPluginEstree from 'prettier/plugins/estree';
import * as prettierPluginHtml from 'prettier/plugins/html';
import * as prettierPluginPostcss from 'prettier/plugins/postcss';
import * as prettierPluginMarkdown from 'prettier/plugins/markdown';

export class FormatterService {
  /**
   * Formats source code using Prettier for web technologies and specialized AST formatters for Python/SQL.
   */
  async formatCode(code: string, language: string, options?: { tabSize?: number }): Promise<string> {
    const lang = (language || '').toLowerCase();
    const tabWidth = options?.tabSize || (lang === 'python' ? 4 : 2);

    try {
      // 1. JSON
      if (lang === 'json') {
        const parsed = JSON.parse(code);
        return JSON.stringify(parsed, null, tabWidth);
      }

      // 2. JS / TS / JSX / TSX via Prettier
      if (['javascript', 'typescript', 'js', 'ts', 'jsx', 'tsx', 'mjs'].includes(lang)) {
        try {
          return await prettier.format(code, {
            parser: lang.includes('ts') ? 'babel-ts' : 'babel',
            plugins: [prettierPluginBabel, prettierPluginEstree],
            tabWidth,
            singleQuote: true,
            semi: true,
            trailingComma: 'none'
          });
        } catch {
          return this.formatJSFallback(code, tabWidth);
        }
      }

      // 3. HTML / XML via Prettier
      if (lang === 'html' || lang === 'xml') {
        try {
          return await prettier.format(code, {
            parser: 'html',
            plugins: [prettierPluginHtml],
            tabWidth
          });
        } catch {
          return this.formatHTMLFallback(code, tabWidth);
        }
      }

      // 4. CSS / SCSS / LESS via Prettier
      if (['css', 'scss', 'less'].includes(lang)) {
        try {
          return await prettier.format(code, {
            parser: 'css',
            plugins: [prettierPluginPostcss],
            tabWidth
          });
        } catch {
          return this.formatCSSFallback(code, tabWidth);
        }
      }

      // 5. Markdown via Prettier
      if (lang === 'markdown' || lang === 'md') {
        try {
          return await prettier.format(code, {
            parser: 'markdown',
            plugins: [prettierPluginMarkdown],
            tabWidth
          });
        } catch {}
      }

      // 6. Python (PEP-8 AST & Indentation Normalizer)
      if (lang === 'python' || lang === 'py') {
        return this.formatPython(code, tabWidth);
      }

      // 7. SQL Formatter
      if (lang === 'sql') {
        return this.formatSQL(code);
      }

      return this.formatGeneric(code);
    } catch (e) {
      console.warn('[FormatterService] Fallback formatting applied:', e);
      return code;
    }
  }

  private formatPython(code: string, tabWidth: number = 4): string {
    const lines = code.split('\n');
    let indentLevel = 0;
    const formatted: string[] = [];
    const indentStr = ' '.repeat(tabWidth);

    lines.forEach(rawLine => {
      const trimmed = rawLine.trim();
      if (!trimmed) {
        formatted.push('');
        return;
      }

      // Dedent keywords
      if (
        trimmed.startsWith('elif ') ||
        trimmed.startsWith('else:') ||
        trimmed.startsWith('except') ||
        trimmed.startsWith('finally:') ||
        trimmed.startsWith('case ')
      ) {
        indentLevel = Math.max(0, indentLevel - 1);
      }

      // Normalize operators spacing (e.g. a=1 -> a = 1)
      let cleaned = trimmed
        .replace(/([^=!<>\s])=([^=])/g, '$1 = $2')
        .replace(/,\s*/g, ', ')
        .replace(/:\s*$/g, ':');

      formatted.push(indentStr.repeat(indentLevel) + cleaned);

      if (trimmed.endsWith(':') && !trimmed.startsWith('#')) {
        indentLevel++;
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

  private formatJSFallback(code: string, tabWidth: number): string {
    const lines = code.split('\n');
    let indent = 0;
    const formatted: string[] = [];
    const ind = ' '.repeat(tabWidth);

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) {
        formatted.push('');
        return;
      }

      if (trimmed.startsWith('}') || trimmed.startsWith(']') || trimmed.startsWith(')')) {
        indent = Math.max(0, indent - 1);
      }

      formatted.push(ind.repeat(indent) + trimmed);

      const opens = (trimmed.match(/[\{\[\(]/g) || []).length;
      const closes = (trimmed.match(/[\}\]\)]/g) || []).length;
      if (opens > closes) {
        indent += (opens - closes);
      }
    });

    return formatted.join('\n');
  }

  private formatHTMLFallback(code: string, tabWidth: number): string {
    let formatted = '';
    let indent = 0;
    const ind = ' '.repeat(tabWidth);
    const clean = code.replace(/>\s*</g, '><').trim();
    const tokens = clean.split(/(<[^>]+>)/g).filter(Boolean);

    tokens.forEach(token => {
      const trimmed = token.trim();
      if (!trimmed) return;

      if (trimmed.startsWith('</')) {
        indent = Math.max(0, indent - 1);
        formatted += ind.repeat(indent) + trimmed + '\n';
      } else if (trimmed.startsWith('<') && !trimmed.startsWith('<!--') && !trimmed.endsWith('/>')) {
        formatted += ind.repeat(indent) + trimmed + '\n';
        if (!trimmed.startsWith('<!')) indent++;
      } else {
        formatted += ind.repeat(indent) + trimmed + '\n';
      }
    });

    return formatted.trim();
  }

  private formatCSSFallback(code: string, tabWidth: number): string {
    const lines = code.replace(/\{/g, ' {\n').replace(/\}/g, '\n}\n').replace(/;/g, ';\n').split('\n');
    let indent = 0;
    const formatted: string[] = [];
    const ind = ' '.repeat(tabWidth);

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;
      if (trimmed === '}') indent = Math.max(0, indent - 1);
      formatted.push(ind.repeat(indent) + trimmed);
      if (trimmed.endsWith('{')) indent++;
    });

    return formatted.join('\n');
  }

  private formatGeneric(code: string): string {
    return code.split('\n').map(l => l.trimEnd()).join('\n');
  }
}

export const formatterService = new FormatterService();
