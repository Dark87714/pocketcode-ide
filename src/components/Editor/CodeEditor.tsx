import React, { useRef, useEffect, useState } from 'react';
import Editor, { OnMount, OnChange, loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { EditorSettings } from '../../types';
import { THEMES } from '../../services/themeService';
import { setupMonacoIntellisense, validatePythonSyntax } from '../../services/languageService';
import { debuggerService } from '../../services/debuggerService';
import { snippetService } from '../../services/snippetService';
import { formatterService } from '../../services/formatterService';
import { parseDocumentSymbols } from '../../utils/symbolParser';
import { realGitService, GitBlameLine } from '../../services/realGitService';

// Configure Monaco to use local bundled instance instead of CDN network calls
loader.config({ monaco });

interface CodeEditorProps {
  content: string;
  language: string;
  path: string;
  settings: EditorSettings;
  jumpToLine?: number | null;
  onChange: (value: string) => void;
  onMountInstance?: (editor: any, monaco: any) => void;
  onDiagnosticsUpdate?: (markers: any[]) => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  content,
  language,
  path,
  settings,
  jumpToLine,
  onChange,
  onMountInstance,
  onDiagnosticsUpdate
}) => {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const pathRef = useRef<string>(path);
  const decorationsRef = useRef<string[]>([]);
  const blameDecorationsRef = useRef<string[]>([]);
  const registeredLanguagesRef = useRef<Set<string>>(new Set());
  const [activeBlame, setActiveBlame] = useState<GitBlameLine | null>(null);

  useEffect(() => {
    pathRef.current = path;
  }, [path]);

  useEffect(() => {
    return () => {
      editorRef.current = null;
      monacoRef.current = null;
      onMountInstance?.(null, null);
    };
  }, []);

  const updateDecorations = () => {
    if (!editorRef.current || !monacoRef.current) return;
    const editor = editorRef.current;
    const mon = monacoRef.current;

    const newDecorations: any[] = [];

    // 1. Breakpoints
    const bps = debuggerService.getBreakpoints(pathRef.current);
    bps.forEach(bp => {
      newDecorations.push({
        range: new mon.Range(bp.lineNumber, 1, bp.lineNumber, 1),
        options: {
          isWholeLine: false,
          glyphMarginClassName: bp.enabled ? 'monaco-breakpoint-glyph' : 'monaco-breakpoint-glyph opacity-40',
          glyphMarginHoverMessage: { value: `Breakpoint at line ${bp.lineNumber}${bp.condition ? ` (condition: ${bp.condition})` : ''}` }
        }
      });
    });

    // 2. Active Paused Line
    const currentFrame = debuggerService.getCurrentFrame();
    if (currentFrame && currentFrame.file === pathRef.current) {
      newDecorations.push({
        range: new mon.Range(currentFrame.line, 1, currentFrame.line, 1),
        options: {
          isWholeLine: true,
          className: 'monaco-debug-paused-line',
          glyphMarginClassName: 'monaco-debug-paused-glyph'
        }
      });
    }

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);
  };

  const updateBlameAnnotation = async (line: number) => {
    if (!editorRef.current || !monacoRef.current) return;
    try {
      const blames = await realGitService.getBlame(pathRef.current);
      const blame = blames.find(b => b.lineNumber === line);
      setActiveBlame(blame || null);

      if (blame) {
        const mon = monacoRef.current;
        const editor = editorRef.current;
        blameDecorationsRef.current = editor.deltaDecorations(blameDecorationsRef.current, [
          {
            range: new mon.Range(line, 1, line, 1),
            options: {
              isWholeLine: true,
              after: {
                content: `   ${blame.author}, ${blame.date} • ${blame.message}`,
                inlineClassName: 'monaco-gitlens-blame-inline'
              }
            }
          }
        ]);
      }
    } catch {}
  };

  const updatePythonDiagnostics = () => {
    if (!editorRef.current || !monacoRef.current) return;
    const lang = language.toLowerCase();
    if (lang === 'python' || pathRef.current.endsWith('.py')) {
      const mon = monacoRef.current;
      const model = editorRef.current.getModel();
      if (!model) return;

      const syntaxErrors = validatePythonSyntax(content);
      const markers = syntaxErrors.map(err => ({
        severity: mon.MarkerSeverity.Error,
        message: err.message,
        startLineNumber: err.line,
        startColumn: 1,
        endLineNumber: err.line,
        endColumn: 100
      }));

      mon.editor.setModelMarkers(model, 'python-syntax-linter', markers);
    }
  };

  const handleEditorDidMount: OnMount = (editor, mon) => {
    editorRef.current = editor;
    monacoRef.current = mon;
    onMountInstance?.(editor, mon);

    // Enhance TypeScript / JS language intelligence & global types
    setupMonacoIntellisense(mon);

    // Define custom themes
    THEMES.forEach((theme) => {
      if (theme.monacoData) {
        mon.editor.defineTheme(theme.monacoTheme, theme.monacoData);
      }
    });

    // Set active theme
    const activeThemeObj = THEMES.find((t) => t.id === settings.theme) || THEMES[0];
    mon.editor.setTheme(activeThemeObj.monacoTheme);

    // Click handler for Breakpoint Gutter (Glyph Margin only)
    editor.onMouseDown((e: any) => {
      if (e.target.type === mon.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
        const line = e.target.position?.lineNumber;
        if (line) {
          debuggerService.toggleBreakpoint(pathRef.current, line);
        }
      }
    });

    // Cursor movement for GitLens blame line
    editor.onDidChangeCursorPosition((e: any) => {
      updateBlameAnnotation(e.position.lineNumber);
    });

    // Register Providers once per language
    const lang = language.toLowerCase();
    if (!registeredLanguagesRef.current.has(lang)) {
      registeredLanguagesRef.current.add(lang);

      // 1. Snippet Autocompletion Provider
      try {
        mon.languages.registerCompletionItemProvider(lang, {
          provideCompletionItems: (model: any, position: any) => {
            const word = model.getWordUntilPosition(position);
            const range = {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: word.startColumn,
              endColumn: word.endColumn
            };

            const snippets = snippetService.getSnippetsForLanguage(lang);
            const suggestions = snippets.map(s => ({
              label: s.prefix,
              kind: mon.languages.CompletionItemKind.Snippet,
              insertText: Array.isArray(s.body) ? s.body.join('\n') : s.body,
              insertTextRules: mon.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: s.description,
              detail: `Snippet: ${s.description}`,
              range
            }));

            return { suggestions };
          }
        });
      } catch {}

      // 2. Document Formatting Provider (Prettier & AST engine)
      try {
        mon.languages.registerDocumentFormattingEditProvider(lang, {
          provideDocumentFormattingEdits: async (model: any) => {
            const text = model.getValue();
            const formatted = await formatterService.formatCode(text, lang, { tabSize: settings.tabSize });
            return [
              {
                range: model.getFullModelRange(),
                text: formatted
              }
            ];
          }
        });
      } catch {}

      // 3. Definition Provider (Go-to-Definition F12)
      try {
        mon.languages.registerDefinitionProvider(lang, {
          provideDefinition: (model: any, position: any) => {
            const word = model.getWordAtPosition(position);
            if (!word) return null;

            const text = model.getValue();
            const symbols = parseDocumentSymbols(text, lang);
            const target = symbols.find((s: any) => s.name === word.word);

            if (target) {
              return {
                uri: model.uri,
                range: new mon.Range(
                  target.line,
                  1,
                  target.line,
                  1
                )
              };
            }
            return null;
          }
        });
      } catch {}

      // 4. Merge Conflict CodeLens Provider
      try {
        mon.languages.registerCodeLensProvider(lang, {
          provideCodeLenses: (model: any) => {
            const lenses: any[] = [];
            const lines = model.getValue().split('\n');
            let inConflict = false;
            let startLine = 0;

            lines.forEach((line: string, idx: number) => {
              const lineNum = idx + 1;
              if (line.startsWith('<<<<<<<')) {
                inConflict = true;
                startLine = lineNum;
                lenses.push({
                  range: new mon.Range(lineNum, 1, lineNum, 1),
                  command: {
                    id: 'pocketcode.acceptCurrentConflict',
                    title: '⚡ Accept Current Change | Accept Incoming | Accept Both'
                  }
                });
              } else if (line.startsWith('>>>>>>>')) {
                inConflict = false;
              }
            });

            return { lenses, dispose: () => {} };
          }
        });
      } catch {}
    }

    // Diagnostics listener
    mon.editor.onDidChangeMarkers(() => {
      const markers = mon.editor.getModelMarkers({ resource: editor.getModel()?.uri });
      onDiagnosticsUpdate?.(markers);
    });

    updateDecorations();
    updatePythonDiagnostics();
    onMountInstance?.(editor, mon);
  };

  // Jump to specific line if requested
  useEffect(() => {
    if (jumpToLine && editorRef.current) {
      editorRef.current.revealLineInCenter(jumpToLine);
      editorRef.current.setPosition({ lineNumber: jumpToLine, column: 1 });
    }
  }, [jumpToLine]);

  // Update decorations on debug events
  useEffect(() => {
    const handleUpdate = () => updateDecorations();
    window.addEventListener('pocketcode:breakpoints-changed', handleUpdate);
    window.addEventListener('pocketcode:debug-paused', handleUpdate);
    window.addEventListener('pocketcode:debug-stopped', handleUpdate);
    updateDecorations();
    updatePythonDiagnostics();

    return () => {
      window.removeEventListener('pocketcode:breakpoints-changed', handleUpdate);
      window.removeEventListener('pocketcode:debug-paused', handleUpdate);
      window.removeEventListener('pocketcode:debug-stopped', handleUpdate);
    };
  }, [path, content]);

  // Update theme when settings change
  useEffect(() => {
    if (monacoRef.current) {
      const activeThemeObj = THEMES.find((t) => t.id === settings.theme) || THEMES[0];
      monacoRef.current.editor.setTheme(activeThemeObj.monacoTheme);
    }
  }, [settings.theme]);

  // Update editor options dynamically
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({
        fontSize: settings.fontSize,
        fontFamily: settings.fontFamily,
        tabSize: language === 'python' ? 4 : (settings.tabSize || 2),
        wordWrap: settings.wordWrap,
        minimap: { enabled: settings.minimap },
        lineNumbers: settings.lineNumbers
      });
    }
  }, [settings, language]);

  const handleChange: OnChange = (value) => {
    onChange(value || '');
  };

  // Handle Mobile Virtual Keyboard Viewport Resize & Cursor Reveal (Phase 70)
  useEffect(() => {
    const handleViewportResize = () => {
      if (editorRef.current && window.visualViewport) {
        const activePos = editorRef.current.getPosition();
        if (activePos) {
          editorRef.current.revealPositionInCenter(activePos);
        }
      }
    };

    if (typeof window !== 'undefined' && window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportResize);
      return () => {
        window.visualViewport?.removeEventListener('resize', handleViewportResize);
      };
    }
  }, []);

  const insertSymbol = (symbol: string) => {
    if (!editorRef.current) return;
    const editor = editorRef.current;
    const selection = editor.getSelection();
    if (symbol === 'TAB') {
      editor.trigger('keyboard', 'tab', null);
      return;
    }
    if (symbol === 'UNDO') {
      editor.trigger('keyboard', 'undo', null);
      return;
    }
    if (symbol === 'REDO') {
      editor.trigger('keyboard', 'redo', null);
      return;
    }
    if (selection) {
      editor.executeEdits('mobile-keypad', [{
        range: selection,
        text: symbol,
        forceMoveMarkers: true
      }]);
      editor.focus();
    }
  };

  const QUICK_KEYS = ['TAB', '{', '}', '(', ')', '[', ']', ';', '=', '<', '>', '"', "'", ':', '->', '=>', '|', '&', '!', 'UNDO', 'REDO'];

  return (
    <div className="w-full h-full relative flex flex-col overflow-hidden bg-[#1e1e1e]">
      <div className="flex-1 relative overflow-hidden">
        <Editor
          height="100%"
          path={path}
          language={language}
          value={content}
          onChange={handleChange}
          onMount={handleEditorDidMount}
          theme={THEMES.find((t) => t.id === settings.theme)?.monacoTheme || 'vs-dark'}
          options={{
            fontSize: settings.fontSize || 14,
            fontFamily: settings.fontFamily || '"Fira Code", Consolas, monospace',
            fontLigatures: true,
            tabSize: language === 'python' ? 4 : (settings.tabSize || 2),
            insertSpaces: true,
            detectIndentation: true,
            trimAutoWhitespace: true,
            glyphMargin: true, // Breakpoint gutter
            wordWrap: settings.wordWrap || 'on',
            minimap: { enabled: settings.minimap ?? false },
            lineNumbers: settings.lineNumbers || 'on',
            automaticLayout: true,
            readOnly: false,
            domReadOnly: false,
            autoClosingBrackets: 'always',
            autoClosingQuotes: 'always',
            tabCompletion: 'on',
            quickSuggestions: {
              other: true,
              comments: true,
              strings: true
            },
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            contextmenu: true,
            folding: true,
            renderLineHighlight: 'all',
            selectOnLineNumbers: true,
            roundedSelection: true,
            fixedOverflowWidgets: true,
            scrollbar: {
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
              useShadows: false,
            }
          }}
          loading={
            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
              <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium">Loading Monaco Editor Engine...</span>
            </div>
          }
        />
      </div>

      {/* Mobile Touch Quick Keypad (Visible on mobile screens) */}
      <div className="h-9 bg-[#252526] border-t border-[#333333] flex sm:hidden items-center px-1 gap-1 overflow-x-auto no-scrollbar shrink-0 select-none z-10">
        {QUICK_KEYS.map((k) => (
          <button
            key={k}
            onMouseDown={(e) => {
              e.preventDefault();
              insertSymbol(k);
            }}
            className="px-2.5 h-7 rounded bg-[#333333] active:bg-sky-600 text-xs font-mono font-bold text-[#cccccc] active:text-white flex items-center justify-center shrink-0 shadow-sm"
          >
            {k}
          </button>
        ))}
      </div>
    </div>
  );
};
