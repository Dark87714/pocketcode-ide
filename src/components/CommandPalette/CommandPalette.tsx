import React, { useState, useEffect, useRef } from 'react';
import { 
  Command, Play, Terminal, Files, Sparkles, 
  Palette, Download, Upload, Trash2, FolderPlus, FilePlus, X
} from 'lucide-react';
import { FileItem } from '../../types';

export interface CommandItem {
  id: string;
  title: string;
  category: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  files: FileItem[];
  onClose: () => void;
  onNewFile: () => void;
  onRunPreview: () => void;
  onOpenTerminal: () => void;
  onOpenTemplates: () => void;
  onOpenFile: (file: FileItem) => void;
  onExportZip: () => void;
  onToggleMinimap: () => void;
  onToggleWordWrap: () => void;
  onSwitchTheme: (themeId: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onFormatDocument?: () => void;
  onToggleSplitEditor?: () => void;
  onToggleFindReplace?: () => void;
  onOpenNewProject?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  files,
  onClose,
  onNewFile,
  onRunPreview,
  onOpenTerminal,
  onOpenTemplates,
  onOpenFile,
  onExportZip,
  onToggleMinimap,
  onToggleWordWrap,
  onSwitchTheme,
  onUndo,
  onRedo,
  onFormatDocument,
  onToggleSplitEditor,
  onToggleFindReplace,
  onOpenNewProject
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const baseCommands: CommandItem[] = [
    {
      id: 'cmd_new_project',
      title: 'Project: Start New Project (Blank, Template, Git Clone)',
      category: 'Project',
      icon: <FolderPlus size={14} className="text-sky-400" />,
      shortcut: 'Ctrl+Shift+N',
      action: () => onOpenNewProject?.() || onOpenTemplates()
    },
    {
      id: 'cmd_format',
      title: 'Format Document (Prettier / Code Beautify)',
      category: 'Edit',
      icon: <Command size={14} className="text-amber-400" />,
      shortcut: 'Shift+Alt+F',
      action: () => onFormatDocument?.()
    },
    {
      id: 'cmd_split_editor',
      title: 'View: Toggle Split Editor (Side-by-Side Dual Pane)',
      category: 'View',
      icon: <Command size={14} className="text-sky-400" />,
      shortcut: 'Ctrl+\\',
      action: () => onToggleSplitEditor?.()
    },
    {
      id: 'cmd_find_replace',
      title: 'Edit: Find & Replace in File',
      category: 'Edit',
      icon: <Command size={14} className="text-emerald-400" />,
      shortcut: 'Ctrl+F',
      action: () => onToggleFindReplace?.()
    },
    {
      id: 'cmd_undo',
      title: 'Edit: Undo',
      category: 'Edit',
      icon: <Command size={14} className="text-amber-400" />,
      shortcut: 'Ctrl+Z',
      action: () => onUndo?.()
    },
    {
      id: 'cmd_redo',
      title: 'Edit: Redo',
      category: 'Edit',
      icon: <Command size={14} className="text-amber-400" />,
      shortcut: 'Ctrl+Y',
      action: () => onRedo?.()
    },
    {
      id: 'cmd_new_file',
      title: 'File: New Untitled Text File',
      category: 'File',
      icon: <FilePlus size={14} className="text-sky-400" />,
      shortcut: 'Ctrl+N',
      action: onNewFile
    },
    {
      id: 'cmd_run',
      title: 'Run: Launch Live Web Sandbox Preview',
      category: 'Runner',
      icon: <Play size={14} className="text-emerald-400" />,
      shortcut: 'Ctrl+R',
      action: onRunPreview
    },
    {
      id: 'cmd_term',
      title: 'View: Toggle Integrated Terminal Shell',
      category: 'Terminal',
      icon: <Terminal size={14} className="text-sky-400" />,
      shortcut: 'Ctrl+`',
      action: onOpenTerminal
    },
    {
      id: 'cmd_templates',
      title: 'Project: Switch Starter Template',
      category: 'Workspace',
      icon: <Files size={14} className="text-amber-400" />,
      action: onOpenTemplates
    },
    {
      id: 'cmd_export',
      title: 'File: Download Workspace as ZIP',
      category: 'File',
      icon: <Download size={14} className="text-blue-400" />,
      action: onExportZip
    },
    {
      id: 'cmd_wrap',
      title: 'View: Toggle Word Wrap',
      category: 'Editor',
      icon: <Command size={14} className="text-slate-400" />,
      action: onToggleWordWrap
    },
    {
      id: 'cmd_minimap',
      title: 'View: Toggle Code Minimap',
      category: 'Editor',
      icon: <Command size={14} className="text-slate-400" />,
      action: onToggleMinimap
    },
    {
      id: 'cmd_theme_tokyo',
      title: 'Preferences: Set Theme -> Tokyo Night Storm',
      category: 'Theme',
      icon: <Palette size={14} className="text-cyan-400" />,
      action: () => onSwitchTheme('tokyo-night')
    },
    {
      id: 'cmd_theme_dracula',
      title: 'Preferences: Set Theme -> Dracula Official',
      category: 'Theme',
      icon: <Palette size={14} className="text-purple-400" />,
      action: () => onSwitchTheme('dracula')
    },
    {
      id: 'cmd_theme_synth',
      title: "Preferences: Set Theme -> SynthWave '84",
      category: 'Theme',
      icon: <Palette size={14} className="text-rose-400" />,
      action: () => onSwitchTheme('synthwave84')
    },
    {
      id: 'cmd_theme_dark',
      title: 'Preferences: Set Theme -> VS Code Dark Modern',
      category: 'Theme',
      icon: <Palette size={14} className="text-sky-400" />,
      action: () => onSwitchTheme('vscode-dark')
    }
  ];

  // Also include files for quick jump
  const fileCommands: CommandItem[] = files
    .filter((f) => !f.isFolder)
    .map((f) => ({
      id: `cmd_file_${f.id}`,
      title: `Go to File: ${f.name}`,
      category: 'Files',
      icon: <Files size={14} className="text-sky-300" />,
      action: () => onOpenFile(f)
    }));

  const allCommands = [...baseCommands, ...fileCommands];

  const filteredCommands = allCommands.filter((cmd) =>
    cmd.title.toLowerCase().includes(query.toLowerCase()) ||
    cmd.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredCommands.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % (filteredCommands.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-8 sm:pt-16 p-3 animate-fade-in">
      <div className="w-full max-w-lg bg-[#252526] border border-[#3c3c3c] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh]">
        {/* Search Input Bar */}
        <div className="flex items-center px-3 py-2.5 bg-[#1e1e1e] border-b border-[#333333] gap-2">
          <Command size={16} className="text-sky-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or filename to search..."
            className="flex-1 bg-transparent text-white text-xs sm:text-sm focus:outline-none placeholder-[#666666]"
          />
          <button onClick={onClose} className="p-1 text-[#858585] hover:text-white rounded">
            <X size={16} />
          </button>
        </div>

        {/* Command List */}
        <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 text-xs">
          {filteredCommands.length === 0 ? (
            <div className="p-4 text-center text-[#858585]">No matching commands or files found.</div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  onClick={() => {
                    cmd.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    isSelected ? 'bg-[#007acc] text-white font-medium' : 'text-[#cccccc] hover:bg-[#2d2d2d]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    {cmd.icon}
                    <span className="truncate">{cmd.title}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] uppercase ${isSelected ? 'text-sky-200' : 'text-[#858585]'}`}>
                      {cmd.category}
                    </span>
                    {cmd.shortcut && (
                      <kbd className="text-[10px] bg-[#1e1e1e] px-1.5 py-0.5 rounded border border-[#3c3c3c] text-white">
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
