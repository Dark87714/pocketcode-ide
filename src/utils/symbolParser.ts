export interface DocumentSymbol {
  name: string;
  kind: 'function' | 'class' | 'interface' | 'variable' | 'method' | 'property' | 'enum' | 'tag';
  line: number;
  column?: number;
  detail?: string;
  children?: DocumentSymbol[];
}

/**
 * Extracts symbols (Outline) from source code across multiple languages
 */
export function extractSymbols(content: string, language: string = 'javascript'): DocumentSymbol[] {
  if (!content) return [];
  const lines = content.split('\n');
  const symbols: DocumentSymbol[] = [];
  const lang = language.toLowerCase();

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
      return;
    }

    // 1. JAVASCRIPT / TYPESCRIPT
    if (['javascript', 'typescript', 'javascriptreact', 'typescriptreact', 'js', 'ts', 'jsx', 'tsx'].includes(lang)) {
      // Classes
      const classMatch = trimmed.match(/^(?:export\s+)?(?:default\s+)?class\s+([a-zA-Z0-9_$]+)/);
      if (classMatch) {
        symbols.push({ name: classMatch[1], kind: 'class', line: lineNum, detail: 'class' });
        return;
      }

      // Interfaces & Types
      const ifaceMatch = trimmed.match(/^(?:export\s+)?interface\s+([a-zA-Z0-9_$]+)/);
      if (ifaceMatch) {
        symbols.push({ name: ifaceMatch[1], kind: 'interface', line: lineNum, detail: 'interface' });
        return;
      }

      const typeMatch = trimmed.match(/^(?:export\s+)?type\s+([a-zA-Z0-9_$]+)/);
      if (typeMatch) {
        symbols.push({ name: typeMatch[1], kind: 'interface', line: lineNum, detail: 'type' });
        return;
      }

      // Functions (function keyword)
      const funcMatch = trimmed.match(/^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*([a-zA-Z0-9_$]+)?\s*\(([^)]*)\)/);
      if (funcMatch && funcMatch[1]) {
        symbols.push({ name: funcMatch[1], kind: 'function', line: lineNum, detail: `(${funcMatch[2] || ''})` });
        return;
      }

      // Arrow function variables or React components: const MyComp: React.FC = () => {
      const arrowMatch = trimmed.match(/^(?:export\s+)?(?:const|let|var)\s+([a-zA-Z0-9_$]+)(?:\s*:\s*[^=]+)?\s*=\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z0-9_$]+)\s*=>/);
      if (arrowMatch) {
        const isComponent = /^[A-Z]/.test(arrowMatch[1]);
        symbols.push({ 
          name: arrowMatch[1], 
          kind: isComponent ? 'class' : 'function', 
          line: lineNum, 
          detail: isComponent ? 'Component' : '() =>' 
        });
        return;
      }

      // Enums
      const enumMatch = trimmed.match(/^(?:export\s+)?enum\s+([a-zA-Z0-9_$]+)/);
      if (enumMatch) {
        symbols.push({ name: enumMatch[1], kind: 'enum', line: lineNum, detail: 'enum' });
        return;
      }

      // Top-level exported constants
      const constMatch = trimmed.match(/^export\s+(?:const|let|var)\s+([a-zA-Z0-9_$]+)/);
      if (constMatch) {
        symbols.push({ name: constMatch[1], kind: 'variable', line: lineNum, detail: 'variable' });
        return;
      }
    }

    // 2. PYTHON
    if (['python', 'py'].includes(lang)) {
      const pyClass = trimmed.match(/^class\s+([a-zA-Z0-9_]+)(?:\([^)]*\))?:/);
      if (pyClass) {
        symbols.push({ name: pyClass[1], kind: 'class', line: lineNum, detail: 'class' });
        return;
      }

      const pyFunc = trimmed.match(/^(?:async\s+)?def\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\):/);
      if (pyFunc) {
        const isMethod = line.startsWith('    ') || line.startsWith('\t');
        symbols.push({ 
          name: pyFunc[1], 
          kind: isMethod ? 'method' : 'function', 
          line: lineNum, 
          detail: `(${pyFunc[2] || ''})` 
        });
        return;
      }
    }

    // 3. RUST
    if (['rust', 'rs'].includes(lang)) {
      const rustStruct = trimmed.match(/^(?:pub\s+)?(?:struct|enum|trait)\s+([a-zA-Z0-9_]+)/);
      if (rustStruct) {
        symbols.push({ name: rustStruct[1], kind: 'class', line: lineNum, detail: 'type' });
        return;
      }

      const rustFn = trimmed.match(/^(?:pub\s+)?(?:async\s+)?fn\s+([a-zA-Z0-9_]+)/);
      if (rustFn) {
        symbols.push({ name: rustFn[1], kind: 'function', line: lineNum, detail: 'fn' });
        return;
      }
    }

    // 4. GO
    if (['go', 'golang'].includes(lang)) {
      const goStruct = trimmed.match(/^type\s+([a-zA-Z0-9_]+)\s+(?:struct|interface)/);
      if (goStruct) {
        symbols.push({ name: goStruct[1], kind: 'class', line: lineNum, detail: 'type' });
        return;
      }

      const goFunc = trimmed.match(/^func\s+(?:\([^)]+\)\s+)?([a-zA-Z0-9_]+)/);
      if (goFunc) {
        symbols.push({ name: goFunc[1], kind: 'function', line: lineNum, detail: 'func' });
        return;
      }
    }

    // 5. C / C++ / Java
    if (['cpp', 'c', 'java', 'cs'].includes(lang)) {
      const cClass = trimmed.match(/^(?:public\s+|private\s+|protected\s+)?class\s+([a-zA-Z0-9_]+)/);
      if (cClass) {
        symbols.push({ name: cClass[1], kind: 'class', line: lineNum, detail: 'class' });
        return;
      }

      const cFunc = trimmed.match(/^(?:[a-zA-Z0-9_<>\*]+\s+)+([a-zA-Z0-9_]+)\s*\([^)]*\)\s*(?:const)?\s*\{?$/);
      if (cFunc && !['if', 'for', 'while', 'switch', 'return', 'catch'].includes(cFunc[1])) {
        symbols.push({ name: cFunc[1], kind: 'function', line: lineNum, detail: 'method' });
        return;
      }
    }

    // 6. CSS / SCSS
    if (['css', 'scss', 'less'].includes(lang)) {
      const cssSelector = trimmed.match(/^([.#a-zA-Z0-9_\-\s,>:+]+)\s*\{/);
      if (cssSelector && !cssSelector[1].startsWith('@media')) {
        symbols.push({ name: cssSelector[1].trim(), kind: 'property', line: lineNum, detail: 'rule' });
        return;
      }
    }
  });

  return symbols;
}
