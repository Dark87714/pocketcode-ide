import * as monaco from 'monaco-editor';
import { parseDocumentSymbols } from '../utils/symbolParser';

/**
 * Validates Python syntax using static AST token checks (syntax errors, unclosed brackets, missing colons)
 */
export function validatePythonSyntax(code: string): { line: number; message: string }[] {
  const errors: { line: number; message: string }[] = [];
  const lines = code.split('\n');
  const stack: { char: string; line: number }[] = [];

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    // 1. Missing colon checks
    if (
      (trimmed.startsWith('def ') ||
        trimmed.startsWith('class ') ||
        trimmed.startsWith('if ') ||
        trimmed.startsWith('elif ') ||
        trimmed === 'else' ||
        trimmed.startsWith('for ') ||
        trimmed.startsWith('while ') ||
        trimmed.startsWith('try') ||
        trimmed.startsWith('except') ||
        trimmed === 'finally') &&
      !trimmed.endsWith(':') &&
      !trimmed.endsWith('\\') &&
      !trimmed.endsWith('(')
    ) {
      errors.push({
        line: lineNum,
        message: `SyntaxError: expected ':' at end of '${trimmed.split(' ')[0]}' statement`
      });
    }

    // 2. Bracket matching check
    for (let i = 0; i < trimmed.length; i++) {
      const c = trimmed[i];
      if (c === '(' || c === '[' || c === '{') {
        stack.push({ char: c, line: lineNum });
      } else if (c === ')' || c === ']' || c === '}') {
        const last = stack.pop();
        if (!last) {
          errors.push({ line: lineNum, message: `SyntaxError: unmatched closing bracket '${c}'` });
        } else if (
          (c === ')' && last.char !== '(') ||
          (c === ']' && last.char !== '[') ||
          (c === '}' && last.char !== '{')
        ) {
          errors.push({ line: lineNum, message: `SyntaxError: mismatched brackets '${last.char}' and '${c}'` });
        }
      }
    }
  });

  if (stack.length > 0) {
    const unclosed = stack[stack.length - 1];
    errors.push({
      line: unclosed.line,
      message: `SyntaxError: unclosed bracket '${unclosed.char}'`
    });
  }

  return errors;
}

/**
 * Initializes and enhances Monaco Editor with advanced TypeScript/JavaScript type definitions,
 * Python symbol outline providers, Rename Providers (F2), and Reference Providers (Shift+F12).
 */
export function setupMonacoIntellisense(monacoInstance: typeof monaco) {
  // 1. TypeScript & JavaScript Compiler Options
  const ts = monacoInstance.languages.typescript;
  
  if (ts && ts.typescriptDefaults) {
    ts.typescriptDefaults.setCompilerOptions({
      target: ts.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      module: ts.ModuleKind.CommonJS,
      noEmit: true,
      esModuleInterop: true,
      jsx: ts.JsxEmit.React,
      reactNamespace: 'React',
      allowJs: true,
      typeRoots: ['node_modules/@types']
    });

    ts.javascriptDefaults.setCompilerOptions({
      target: ts.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      allowJs: true
    });

    // Inject Common React and Node global types
    const extraDeclarations = `
      declare namespace React {
        function useState<T>(initialState: T | (() => T)): [T, (newState: T | ((prevState: T) => T)) => void];
        function useEffect(effect: () => void | (() => void), deps?: readonly any[]): void;
        function useRef<T>(initialValue: T): { current: T };
        function useMemo<T>(factory: () => T, deps: readonly any[] | undefined): T;
        function useCallback<T extends (...args: any[]) => any>(callback: T, deps: readonly any[]): T;
        type FC<P = {}> = (props: P) => any;
        type ReactNode = any;
      }
      declare var process: { env: Record<string, string> };
      declare var require: (module: string) => any;
      declare var module: { exports: any };
      declare var exports: any;
    `;

    try {
      ts.typescriptDefaults.addExtraLib(extraDeclarations, 'ts:pocketcode_globals.d.ts');
      ts.javascriptDefaults.addExtraLib(extraDeclarations, 'js:pocketcode_globals.d.ts');
    } catch {}
  }

  // 2. Python Document Symbol Provider (Breadcrumbs & Outline)
  try {
    monacoInstance.languages.registerDocumentSymbolProvider('python', {
      provideDocumentSymbols: (model) => {
        const text = model.getValue();
        const symbols = parseDocumentSymbols(text, 'python');

        return symbols.map((s: any) => ({
          name: s.name,
          detail: s.detail || '',
          kind: s.kind === 'function' ? monacoInstance.languages.SymbolKind.Function :
                s.kind === 'class' ? monacoInstance.languages.SymbolKind.Class :
                s.kind === 'variable' ? monacoInstance.languages.SymbolKind.Variable :
                monacoInstance.languages.SymbolKind.Property,
          range: new monacoInstance.Range(s.line, 1, s.line, 1),
          selectionRange: new monacoInstance.Range(s.line, 1, s.line, 1),
          tags: []
        }));
      }
    });
  } catch {}

  // 3. Rename Symbol Provider (F2 Refactoring across all major languages)
  ['javascript', 'typescript', 'python', 'html', 'css', 'json', 'sql'].forEach(lang => {
    try {
      monacoInstance.languages.registerRenameProvider(lang, {
        provideRenameEdits: (model, position, newName) => {
          const word = model.getWordAtPosition(position);
          if (!word) return null;

          const oldName = word.word;
          const text = model.getValue();
          const regex = new RegExp(`\\b${oldName}\\b`, 'g');
          const edits: any[] = [];
          const lines = text.split('\n');

          lines.forEach((line, lineIdx) => {
            let match;
            regex.lastIndex = 0;
            while ((match = regex.exec(line)) !== null) {
              edits.push({
                resource: model.uri,
                versionId: undefined,
                textEdit: {
                  range: new monacoInstance.Range(
                    lineIdx + 1,
                    match.index + 1,
                    lineIdx + 1,
                    match.index + 1 + oldName.length
                  ),
                  text: newName
                }
              });
            }
          });

          return { edits };
        }
      });
    } catch {}
  });

  // 4. Find All References Provider (Shift+F12)
  ['javascript', 'typescript', 'python', 'rust', 'go', 'cpp', 'java'].forEach(lang => {
    try {
      monacoInstance.languages.registerReferenceProvider(lang, {
        provideReferences: (model, position) => {
          const word = model.getWordAtPosition(position);
          if (!word) return [];

          const targetName = word.word;
          const text = model.getValue();
          const regex = new RegExp(`\\b${targetName}\\b`, 'g');
          const locations: any[] = [];
          const lines = text.split('\n');

          lines.forEach((line, lineIdx) => {
            let match;
            regex.lastIndex = 0;
            while ((match = regex.exec(line)) !== null) {
              locations.push({
                uri: model.uri,
                range: new monacoInstance.Range(
                  lineIdx + 1,
                  match.index + 1,
                  lineIdx + 1,
                  match.index + 1 + targetName.length
                )
              });
            }
          });

          return locations;
        }
      });
    } catch {}
  });

  // 5. Python Built-In Hover Docs
  try {
    monacoInstance.languages.registerHoverProvider('python', {
      provideHover: (model, position) => {
        const word = model.getWordAtPosition(position);
        if (!word) return null;

        const pythonDocs: Record<string, string> = {
          print: '```python\nprint(*objects, sep=" ", end="\\n", file=None, flush=False)\n```\nPrints values to a stream, or to sys.stdout by default.',
          len: '```python\nlen(s: Sized) -> int\n```\nReturn the number of items in a container.',
          range: '```python\nrange(stop) -> range object\nrange(start, stop[, step]) -> range object\n```\nReturn an object that produces a sequence of integers from start to stop by step.',
          str: '```python\nstr(object="") -> str\n```\nCreate a new string object from the given object.',
          int: '```python\nint(x=0) -> integer\n```\nConvert a number or string to an integer, or return 0 if no arguments are given.',
          dict: '```python\ndict(**kwargs) -> new dictionary\n```\nCreate a new dictionary with elements.',
          list: '```python\nlist(iterable=()) -> new list\n```\nBuilt-in mutable sequence.',
          type: '```python\ntype(object) -> the object\'s type\n```\nReturn the type of an object.'
        };

        if (pythonDocs[word.word]) {
          return {
            range: new monacoInstance.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
            contents: [
              { value: `**Python Built-In: \`${word.word}\`**` },
              { value: pythonDocs[word.word] }
            ]
          };
        }
        return null;
      }
    });
  } catch {}
}
