import React, { useRef } from 'react';
import { DiffEditor as MonacoDiffEditor } from '@monaco-editor/react';
import { X, SplitSquareVertical, ArrowLeftRight } from 'lucide-react';
import { EditorSettings } from '../../types';
import { THEMES } from '../../services/themeService';

interface DiffEditorProps {
  originalContent: string;
  modifiedContent: string;
  originalFileName?: string;
  modifiedFileName?: string;
  language?: string;
  settings: EditorSettings;
  onClose: () => void;
  onApplyChanges?: (newContent: string) => void;
}

export const DiffEditor: React.FC<DiffEditorProps> = ({
  originalContent,
  modifiedContent,
  originalFileName = 'Original (HEAD)',
  modifiedFileName = 'Working Tree',
  language = 'javascript',
  settings,
  onClose
}) => {
  const [isInline, setIsInline] = React.useState(false);
  const diffEditorRef = useRef<any>(null);

  const handleMount = (editor: any, monaco: any) => {
    diffEditorRef.current = editor;

    // Set active theme
    const activeThemeObj = THEMES.find((t) => t.id === settings.theme) || THEMES[0];
    monaco.editor.setTheme(activeThemeObj.monacoTheme);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#1e1e1e] overflow-hidden">
      {/* Diff Header Bar */}
      <div className="h-9 bg-[#252526] border-b border-[#333333] flex items-center justify-between px-3 text-xs select-none shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white flex items-center gap-1.5">
            <ArrowLeftRight size={14} className="text-sky-400" />
            <span>VISUAL DIFF</span>
          </span>
          <span className="text-[#858585]">|</span>
          <span className="text-rose-400 font-mono text-[11px]">{originalFileName}</span>
          <span className="text-[#858585]">↔</span>
          <span className="text-emerald-400 font-mono text-[11px]">{modifiedFileName}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsInline(!isInline)}
            className={`px-2 py-1 rounded flex items-center gap-1 text-[11px] font-medium transition-colors ${
              isInline ? 'bg-[#007acc] text-white' : 'bg-[#333333] text-[#cccccc] hover:bg-[#444444]'
            }`}
            title="Toggle Inline / Side-by-Side View"
          >
            <SplitSquareVertical size={13} />
            <span>{isInline ? 'Inline Diff' : 'Side-by-Side'}</span>
          </button>

          <button
            onClick={onClose}
            className="p-1 rounded text-[#858585] hover:text-white hover:bg-[#333333]"
            title="Close Diff"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Monaco Diff Editor Instance */}
      <div className="flex-1 relative overflow-hidden">
        <MonacoDiffEditor
          height="100%"
          language={language}
          original={originalContent}
          modified={modifiedContent}
          onMount={handleMount}
          theme={settings.theme === 'dracula' ? 'dracula' : settings.theme === 'tokyo-night' ? 'tokyo-night' : settings.theme === 'synthwave84' ? 'synthwave' : 'vs-dark'}
          options={{
            renderSideBySide: !isInline,
            readOnly: true,
            fontSize: settings.fontSize || 14,
            fontFamily: settings.fontFamily || '"Fira Code", Consolas, monospace',
            minimap: { enabled: false },
            lineNumbers: 'on',
            automaticLayout: true,
            originalEditable: false
          }}
        />
      </div>
    </div>
  );
};
