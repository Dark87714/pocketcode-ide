import React, { useState } from 'react';
import { 
  Undo2, Redo2, ArrowLeft, ArrowRight, CornerDownLeft, 
  Wand2, Search, Code2, Copy, Scissors, Trash2,
  ChevronDown, ChevronUp, ChevronsUpDown
} from 'lucide-react';

interface MobileKeybarProps {
  onInsertText: (text: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onMoveCursor: (offset: number) => void;
  onFormat?: () => void;
  onToggleFind?: () => void;
  language?: string;
}

export const MobileKeybar: React.FC<MobileKeybarProps> = ({
  onInsertText,
  onUndo,
  onRedo,
  onMoveCursor,
  onFormat,
  onToggleFind,
  language = 'javascript'
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('pocketcode_keybar_collapsed') === 'true';
  });

  // Prevent focus loss when tapping keyboard accessory buttons
  const handleKeyAction = (action: () => void, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    action();
  };

  const toggleCollapse = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('pocketcode_keybar_collapsed', String(next));
      window.dispatchEvent(new Event('resize'));
      return next;
    });
  };

  // Common programming symbols
  const generalSymbols = [
    { label: 'Tab', val: '  ' },
    { label: '{ }', val: '{}' },
    { label: '( )', val: '()' },
    { label: '[ ]', val: '[]' },
    { label: ';', val: ';' },
    { label: ':', val: ':' },
    { label: '=', val: ' = ' },
    { label: '=>', val: ' => ' },
    { label: '" "', val: '""' },
    { label: "' '", val: "''" },
    { label: '` `', val: '``' },
    { label: '< >', val: '<>' },
    { label: '+', val: ' + ' },
    { label: '-', val: ' - ' },
    { label: '*', val: ' * ' },
    { label: '/', val: ' / ' },
    { label: '!', val: '!' },
    { label: '&', val: ' && ' },
    { label: '|', val: ' || ' },
    { label: '?', val: '?' },
    { label: '.', val: '.' },
    { label: ',', val: ', ' },
    { label: '$', val: '$' },
    { label: '#', val: '#' },
    { label: '_', val: '_' }
  ];

  const jsSnippets = [
    { label: 'log', val: 'console.log();' },
    { label: 'const', val: 'const  = ;' },
    { label: 'let', val: 'let  = ;' },
    { label: 'fn', val: 'function () {\n  \n}' },
    { label: 'async', val: 'async () => {\n  \n}' },
    { label: 'ret', val: 'return ;' }
  ];

  const pySnippets = [
    { label: 'print', val: 'print()' },
    { label: 'def', val: 'def ():\n    ' },
    { label: 'if', val: 'if :\n    ' },
    { label: 'for', val: 'for i in range():\n    ' },
    { label: 'self', val: 'self.' },
    { label: 'import', val: 'import ' }
  ];

  const activeSnippets = language === 'python' ? pySnippets : jsSnippets;

  if (isCollapsed) {
    return (
      <div className="w-full bg-[#1e1e1e] border-t border-[#333333] px-2 py-0.5 flex items-center justify-between z-20 select-none">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          <button
            onMouseDown={(e) => handleKeyAction(onUndo, e)}
            onTouchStart={(e) => handleKeyAction(onUndo, e)}
            className="px-1.5 py-0.5 rounded bg-[#2d2d2d] text-white text-xs shrink-0"
            title="Undo"
          >
            <Undo2 size={13} />
          </button>
          <button
            onMouseDown={(e) => handleKeyAction(onRedo, e)}
            onTouchStart={(e) => handleKeyAction(onRedo, e)}
            className="px-1.5 py-0.5 rounded bg-[#2d2d2d] text-white text-xs shrink-0"
            title="Redo"
          >
            <Redo2 size={13} />
          </button>
          <button
            onMouseDown={(e) => handleKeyAction(() => onInsertText('  '), e)}
            onTouchStart={(e) => handleKeyAction(() => onInsertText('  '), e)}
            className="px-1.5 py-0.5 rounded bg-[#2d2d2d] text-[#cccccc] text-[11px] font-mono shrink-0"
          >
            Tab
          </button>
          <button
            onMouseDown={(e) => handleKeyAction(() => onInsertText('{}'), e)}
            onTouchStart={(e) => handleKeyAction(() => onInsertText('{}'), e)}
            className="px-1.5 py-0.5 rounded bg-[#2d2d2d] text-amber-300 text-[11px] font-mono shrink-0"
          >
            &#123; &#125;
          </button>
          <button
            onMouseDown={(e) => handleKeyAction(() => onInsertText('()'), e)}
            onTouchStart={(e) => handleKeyAction(() => onInsertText('()'), e)}
            className="px-1.5 py-0.5 rounded bg-[#2d2d2d] text-amber-300 text-[11px] font-mono shrink-0"
          >
            ( )
          </button>
          <button
            onMouseDown={(e) => handleKeyAction(() => onInsertText(';'), e)}
            onTouchStart={(e) => handleKeyAction(() => onInsertText(';'), e)}
            className="px-1.5 py-0.5 rounded bg-[#2d2d2d] text-sky-400 text-[11px] font-mono shrink-0"
          >
            ;
          </button>
        </div>
        <button
          onMouseDown={toggleCollapse}
          onTouchStart={toggleCollapse}
          className="p-1 rounded text-[#888888] hover:text-white hover:bg-[#333333] transition-colors shrink-0 ml-1"
          title="Expand Keyboard Toolbar"
        >
          <ChevronUp size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#252526] border-t border-[#3c3c3c] flex flex-col z-20 select-none shadow-md">
      {/* Primary Actions Row */}
      <div className="flex items-center px-1.5 py-1 overflow-x-auto no-scrollbar gap-1 bg-[#1e1e1e]/95 backdrop-blur-md">
        {/* Collapse Keybar Button */}
        <button
          onMouseDown={toggleCollapse}
          onTouchStart={toggleCollapse}
          className="p-1 rounded bg-[#2d2d2d] hover:bg-[#3d3d3d] text-[#888888] hover:text-white flex items-center justify-center shrink-0"
          title="Minimize Keybar for More Screen Area"
        >
          <ChevronDown size={14} />
        </button>

        {/* Undo / Redo */}
        <button
          onMouseDown={(e) => handleKeyAction(onUndo, e)}
          onTouchStart={(e) => handleKeyAction(onUndo, e)}
          className="p-1 rounded bg-[#2d2d2d] hover:bg-[#3d3d3d] active:bg-[#007acc] text-white flex items-center justify-center shrink-0"
          title="Undo"
        >
          <Undo2 size={14} />
        </button>
        <button
          onMouseDown={(e) => handleKeyAction(onRedo, e)}
          onTouchStart={(e) => handleKeyAction(onRedo, e)}
          className="p-1 rounded bg-[#2d2d2d] hover:bg-[#3d3d3d] active:bg-[#007acc] text-white flex items-center justify-center shrink-0"
          title="Redo"
        >
          <Redo2 size={14} />
        </button>

        {/* Cursor navigation */}
        <button
          onMouseDown={(e) => handleKeyAction(() => onMoveCursor(-1), e)}
          onTouchStart={(e) => handleKeyAction(() => onMoveCursor(-1), e)}
          className="p-1 rounded bg-[#2d2d2d] hover:bg-[#3d3d3d] active:bg-[#007acc] text-white flex items-center justify-center shrink-0"
          title="Move Cursor Left"
        >
          <ArrowLeft size={14} />
        </button>
        <button
          onMouseDown={(e) => handleKeyAction(() => onMoveCursor(1), e)}
          onTouchStart={(e) => handleKeyAction(() => onMoveCursor(1), e)}
          className="p-1 rounded bg-[#2d2d2d] hover:bg-[#3d3d3d] active:bg-[#007acc] text-white flex items-center justify-center shrink-0"
          title="Move Cursor Right"
        >
          <ArrowRight size={14} />
        </button>

        {/* Format Document */}
        {onFormat && (
          <button
            onMouseDown={(e) => handleKeyAction(onFormat, e)}
            onTouchStart={(e) => handleKeyAction(onFormat, e)}
            className="px-1.5 py-0.5 rounded bg-[#2d2d2d] hover:bg-[#3d3d3d] active:bg-[#007acc] text-amber-300 font-medium text-[11px] flex items-center gap-1 shrink-0"
            title="Format Code"
          >
            <Wand2 size={12} />
            <span>Format</span>
          </button>
        )}

        {/* Find & Replace */}
        {onToggleFind && (
          <button
            onMouseDown={(e) => handleKeyAction(onToggleFind, e)}
            onTouchStart={(e) => handleKeyAction(onToggleFind, e)}
            className="p-1 rounded bg-[#2d2d2d] hover:bg-[#3d3d3d] active:bg-[#007acc] text-[#cccccc] hover:text-white shrink-0"
            title="Find & Replace"
          >
            <Search size={14} />
          </button>
        )}

        <div className="h-3.5 w-[1px] bg-[#3c3c3c] shrink-0 mx-0.5" />

        {/* Dynamic Code Snippets */}
        {activeSnippets.map((s) => (
          <button
            key={s.label}
            onMouseDown={(e) => handleKeyAction(() => onInsertText(s.val), e)}
            onTouchStart={(e) => handleKeyAction(() => onInsertText(s.val), e)}
            className="px-1.5 py-0.5 rounded bg-[#2d2d2d] hover:bg-[#3d3d3d] active:bg-[#007acc] text-sky-400 font-mono text-[11px] shrink-0 font-medium"
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Secondary Coding Symbols Row */}
      <div className="flex items-center px-1.5 py-0.5 overflow-x-auto no-scrollbar gap-1 bg-[#252526]">
        {generalSymbols.map((item) => (
          <button
            key={item.label}
            onMouseDown={(e) => handleKeyAction(() => onInsertText(item.val), e)}
            onTouchStart={(e) => handleKeyAction(() => onInsertText(item.val), e)}
            className="px-2 py-0.5 rounded bg-[#333333] hover:bg-[#444444] active:bg-[#007acc] text-[#dddddd] font-mono text-xs shrink-0 font-medium transition-colors"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
};
