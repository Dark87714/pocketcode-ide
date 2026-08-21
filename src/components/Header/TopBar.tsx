import React from 'react';
import { 
  Play, Command, Terminal, FolderGit2,
  Menu, Download, Upload, Eye,
  Code, Layers, Columns2, Search,
  Undo2, Redo2, Wand2
} from 'lucide-react';

interface TopBarProps {
  onRunPreview: () => void;
  onOpenCommandPalette: () => void;
  onToggleSidebar: () => void;
  onToggleTerminal: () => void;
  onOpenTemplates: () => void;
  onExportZip: () => void;
  onImportZip: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onFormatDocument?: () => void;
  onToggleSplitEditor?: () => void;
  onToggleFindReplace?: () => void;
  isSplitEditor?: boolean;
  saveStatus?: 'saved' | 'saving';
  activeSidebarTab: string;
  isSidebarOpen: boolean;
  isTerminalOpen: boolean;
  activeFileName?: string;
  projectName?: string;
  onOpenNewProject?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onRunPreview,
  onOpenCommandPalette,
  onToggleSidebar,
  onToggleTerminal,
  onOpenTemplates,
  onExportZip,
  onImportZip,
  onUndo,
  onRedo,
  onFormatDocument,
  onToggleSplitEditor,
  onToggleFindReplace,
  isSplitEditor = false,
  saveStatus = 'saved',
  isSidebarOpen,
  isTerminalOpen,
  activeFileName,
  projectName,
  onOpenNewProject
}) => {
  return (
    <header className="safe-top bg-[#333333] border-b border-[#252526] px-2 sm:px-3 flex items-center justify-between select-none z-30 shrink-0 gap-1 pb-1.5 sm:pb-0 h-auto min-h-[48px] sm:h-11">
      {/* Left: Menu toggle, Brand & Undo/Redo */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={onToggleSidebar}
          className={`p-1.5 rounded transition-colors ${
            isSidebarOpen ? 'bg-[#007acc] text-white' : 'text-[#cccccc] hover:bg-[#3c3c3c]'
          }`}
          title="Toggle Sidebar"
        >
          <Menu size={18} />
        </button>

        <div className="flex items-center gap-2 cursor-pointer" onClick={onOpenNewProject || onOpenTemplates}>
          <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-sky-600 to-blue-500 flex items-center justify-center shadow-sm">
            <Code size={14} className="text-white" />
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="font-bold text-xs tracking-wide text-white flex items-center gap-1">
              PocketCode <span className="text-[10px] px-1 py-0.2 bg-[#007acc] rounded font-mono">PRO</span>
            </span>
          </div>
        </div>

        {/* Active Project Workspace Pill */}
        <button
          onClick={onOpenNewProject || onOpenTemplates}
          className="flex items-center gap-1.5 px-2 py-0.5 bg-[#252526] hover:bg-[#2e3136] active:bg-[#007acc] text-[#cccccc] hover:text-white rounded-md border border-[#3c3c3c] text-xs font-semibold max-w-[120px] xs:max-w-[160px] sm:max-w-[200px] transition-colors"
          title={`Active Workspace: ${projectName || 'My Pocket Workspace'} (Click to switch or create)`}
        >
          <span className="text-amber-400 shrink-0 text-xs">📁</span>
          <span className="truncate text-xs font-medium">{projectName || 'Pocket Workspace'}</span>
          <span className="text-[9px] text-[#888888]">▾</span>
        </button>

        {/* Undo / Redo Global Buttons */}
        <div className="flex items-center gap-0.5 ml-1 bg-[#252526] p-0.5 rounded-md border border-[#3c3c3c]">
          <button
            onClick={onUndo}
            className="p-1 rounded text-[#cccccc] hover:text-white hover:bg-[#333333] active:bg-[#007acc] transition-colors"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={15} />
          </button>
          <button
            onClick={onRedo}
            className="p-1 rounded text-[#cccccc] hover:text-white hover:bg-[#333333] active:bg-[#007acc] transition-colors"
            title="Redo (Ctrl+Y / Ctrl+Shift+Z)"
          >
            <Redo2 size={15} />
          </button>
        </div>

        {/* Format Document Button */}
        {onFormatDocument && (
          <button
            onClick={onFormatDocument}
            className="p-1.5 rounded text-[#cccccc] hover:text-white hover:bg-[#252526] active:bg-[#007acc] transition-colors hidden xs:flex items-center gap-1 border border-transparent hover:border-[#3c3c3c]"
            title="Format Document (Prettier / Beautify - Shift+Alt+F)"
          >
            <Wand2 size={14} className="text-amber-400" />
            <span className="text-[11px] font-medium hidden md:inline">Format</span>
          </button>
        )}

        {/* Split Editor Toggle */}
        {onToggleSplitEditor && (
          <button
            onClick={onToggleSplitEditor}
            className={`p-1.5 rounded transition-colors hidden sm:flex items-center gap-1 border ${
              isSplitEditor
                ? 'bg-[#007acc] text-white border-[#007acc]'
                : 'text-[#cccccc] hover:bg-[#252526] border-transparent hover:border-[#3c3c3c]'
            }`}
            title="Toggle Split Editor (Side-by-Side)"
          >
            <Columns2 size={15} />
          </button>
        )}

        {/* Auto-Save indicator */}
        <div className="hidden lg:flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-[#252526] border border-[#3c3c3c] text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>{saveStatus === 'saving' ? 'Saving...' : 'Auto-Saved'}</span>
        </div>
      </div>

      {/* Middle: Active File or Command Palette search bar */}
      <div className="flex-1 max-w-xs mx-1 sm:mx-2">
        <button
          onClick={onOpenCommandPalette}
          className="w-full h-7 bg-[#252526] hover:bg-[#2a2d2e] active:bg-[#1e1e1e] border border-[#3c3c3c] rounded flex items-center justify-between px-2.5 text-xs text-[#858585] transition-colors"
        >
          <div className="flex items-center gap-1.5 truncate">
            <Command size={12} className="text-sky-400 shrink-0" />
            <span className="truncate">{activeFileName ? `pocketcode > ${activeFileName}` : 'Command Palette...'}</span>
          </div>
          <kbd className="hidden sm:inline-block text-[10px] bg-[#333333] px-1.5 py-0.5 rounded text-[#858585] border border-[#444444]">
            Ctrl+P
          </kbd>
        </button>
      </div>

      {/* Right: Run, Terminal, Project Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* New Project Button */}
        {onOpenNewProject && (
          <button
            onClick={onOpenNewProject}
            className="p-1 px-2 rounded-md bg-[#007acc]/20 hover:bg-[#007acc] text-sky-400 hover:text-white border border-[#007acc]/40 transition-colors flex items-center gap-1 text-xs font-semibold"
            title="Start New Project (Blank, Template, Git Clone)"
          >
            <FolderGit2 size={13} />
            <span className="hidden sm:inline">New Project</span>
          </button>
        )}

        {/* Touch Find in File Toggle */}
        {onToggleFindReplace && (
          <button
            onClick={onToggleFindReplace}
            className="p-1.5 rounded text-[#cccccc] hover:text-white hover:bg-[#3c3c3c] transition-colors"
            title="Find & Replace (Ctrl+F)"
          >
            <Search size={16} />
          </button>
        )}

        {/* RUN / LIVE PREVIEW BUTTON */}
        <button
          onClick={onRunPreview}
          className="px-3 py-1.5 rounded-md bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-transform"
          title="Run / Live Preview"
        >
          <Play size={13} fill="currentColor" />
          <span className="hidden xs:inline">Run</span>
        </button>

        {/* Terminal Toggle */}
        <button
          onClick={onToggleTerminal}
          className={`p-1.5 rounded transition-colors ${
            isTerminalOpen ? 'bg-[#007acc] text-white' : 'text-[#cccccc] hover:bg-[#3c3c3c]'
          }`}
          title="Toggle Terminal"
        >
          <Terminal size={17} />
        </button>

        {/* Templates / Project switch */}
        <button
          onClick={onOpenTemplates}
          className="p-1.5 rounded text-[#cccccc] hover:bg-[#3c3c3c] transition-colors hidden sm:flex"
          title="Templates & Projects"
        >
          <Layers size={17} />
        </button>

        {/* Download Zip */}
        <button
          onClick={onExportZip}
          className="p-1.5 rounded text-[#cccccc] hover:bg-[#3c3c3c] transition-colors"
          title="Download Workspace ZIP"
        >
          <Download size={17} />
        </button>
      </div>
    </header>
  );
};
