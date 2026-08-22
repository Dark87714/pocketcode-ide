import React, { useRef, useEffect } from 'react';
import Editor, { OnMount, OnChange, loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { EditorSettings } from '../../types';
import { THEMES } from '../../services/themeService';
import { setupMonacoIntellisense } from '../../services/languageService';

// Configure Monaco to use local bundled instance instead of CDN network calls
loader.config({ monaco });

interface CodeEditorProps {
  content: string;
  language: string;
  path: string;
  settings: EditorSettings;
  onChange: (value: string) => void;
  onMountInstance?: (editor: any, monaco: any) => void;
  onDiagnosticsUpdate?: (markers: any[]) => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  content,
  language,
  path,
  settings,
  onChange,
  onMountInstance,
  onDiagnosticsUpdate
}) => {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Enhance TypeScript / JS language intelligence & global types
    setupMonacoIntellisense(monaco);

    // Define custom themes
    THEMES.forEach((theme) => {
      if (theme.monacoData) {
        monaco.editor.defineTheme(theme.monacoTheme, theme.monacoData);
      }
    });

    // Set active theme
    const activeThemeObj = THEMES.find((t) => t.id === settings.theme) || THEMES[0];
    monaco.editor.setTheme(activeThemeObj.monacoTheme);

    // Diagnostics listener
    monaco.editor.onDidChangeMarkers(() => {
      const markers = monaco.editor.getModelMarkers({ resource: editor.getModel()?.uri });
      onDiagnosticsUpdate?.(markers);
    });

    onMountInstance?.(editor, monaco);
  };

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
        tabSize: settings.tabSize,
        wordWrap: settings.wordWrap,
        minimap: { enabled: settings.minimap },
        lineNumbers: settings.lineNumbers
      });
    }
  }, [settings]);

  const handleChange: OnChange = (value) => {
    onChange(value || '');
  };

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#1e1e1e]">
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
          tabSize: settings.tabSize || 2,
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
  );
};
