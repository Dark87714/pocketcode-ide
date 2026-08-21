import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, Command, Terminal, FolderGit2,
  Menu, Download, Code, Layers, Columns2, Search,
  Undo2, Redo2, Wand2, MoreHorizontal, Check
} from 'lucide-react';

interface TopBarProps {
  onRunPreview: () => void;
  onOpenCommandPalette: () => void;
  onToggleSidebar: () => void;
  onToggleTerminal: () => void;
  onOpenTemplates: () => void;
  onExportZip: () => void;
  onImportZip?: () => void;
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
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Close more menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };
    if (isMoreMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isMoreMenuOpen]);

  return (
    <header className="safe-top bg-[#333333] border-b border-[#252526] px-1.5 sm:px-3 flex items-center justify-between select-none z-30 shrink-0 gap-1 sm:gap-2 h-10 sm:h-11 w-full max-w-full overflow-visible relative">
      {/* Left: Sidebar Toggle, Brand, Workspace Pill & Undo/Redo */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 min-w-0">
        {/* Toggle Sidebar Button */}
        <button
          onClick={onToggleSidebar}
          className={`p-1 sm:p-1.5 rounded transition-colors ${
            isSidebarOpen ? 'bg-[#007acc] text-white' : 'text-[#cccccc] hover:bg-[#3c3c3c] active:bg-[#007acc]'
          }`}
          title="Toggle Sidebar"
          aria-label="Toggle Sidebar"
        >
          <Menu size={17} />
        </button>

        {/* Logo / Brand */}
        <div 
          className="flex items-center gap-1.5 cursor-pointer shrink-0" 
          onClick={onOpenNewProject || onOpenTemplates}
          title="PocketCode Home"
        >
          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded bg-gradient-to-tr from-sky-600 to-blue-500 flex items-center justify-center shadow-sm">
            <Code size={13} className="text-white" />
          </div>
          <div className="hidden md:flex flex-col">
            <span className="font-bold text-xs tracking-wide text-white flex items-center gap-1">
              PocketCode <span className="text-[9px] px-1 py-0.2 bg-[#007acc] rounded font-mono">PRO</span>
            </span>
          </div>
        </div>

        {/* Active Project Workspace Pill */}
        <button
          onClick={onOpenNewProject || onOpenTemplates}
          className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 bg-[#252526] hover:bg-[#2e3136] active:bg-[#007acc] text-[#cccccc] hover:text-white rounded border border-[#3c3c3c] text-xs font-semibold max-w-[80px] xs:max-w-[120px] sm:max-w-[170px] md:max-w-[210px] transition-colors truncate shrink"
          title={`Active Workspace: ${projectName || 'Pocket Workspace'} (Click to switch or create)`}
        >
          <span className="text-amber-400 shrink-0 text-[11px] sm:text-xs">📁</span>
          <span className="truncate text-[11px] sm:text-xs font-medium">{projectName || 'Workspace'}</span>
          <span className="text-[8px] sm:text-[9px] text-[#888888] shrink-0">▾</span>
        </button>

        {/* Undo / Redo Global Buttons */}
        <div className="flex items-center gap-0.5 bg-[#252526] p-0.5 rounded border border-[#3c3c3c] shrink-0">
          <button
            onClick={onUndo}
            className="p-1 rounded text-[#cccccc] hover:text-white hover:bg-[#333333] active:bg-[#007acc] transition-colors"
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
          >
            <Undo2 size={13} />
          </button>
          <button
            onClick={onRedo}
            className="p-1 rounded text-[#cccccc] hover:text-white hover:bg-[#333333] active:bg-[#007acc] transition-colors"
            title="Redo (Ctrl+Y / Ctrl+Shift+Z)"
            aria-label="Redo"
          >
            <Redo2 size={13} />
          </button>
        </div>

        {/* Format Document Button (Visible on md+) */}
        {onFormatDocument && (
          <button
            onClick={onFormatDocument}
            className="p-1 sm:p-1.5 rounded text-[#cccccc] hover:text-white hover:bg-[#252526] active:bg-[#007acc] transition-colors hidden md:flex items-center gap-1 border border-transparent hover:border-[#3c3c3c] shrink-0"
            title="Format Document (Prettier / Beautify - Shift+Alt+F)"
          >
            <Wand2 size={13} className="text-amber-400" />
            <span className="text-[11px] font-medium hidden lg:inline">Format</span>
          </button>
        )}

        {/* Split Editor Toggle (Visible on lg+) */}
        {onToggleSplitEditor && (
          <button
            onClick={onToggleSplitEditor}
            className={`p-1 sm:p-1.5 rounded transition-colors hidden lg:flex items-center gap-1 border shrink-0 ${
              isSplitEditor
                ? 'bg-[#007acc] text-white border-[#007acc]'
                : 'text-[#cccccc] hover:bg-[#252526] border-transparent hover:border-[#3c3c3c]'
            }`}
            title="Toggle Split Editor (Side-by-Side)"
          >
            <Columns2 size={14} />
          </button>
        )}

        {/* Auto-Save indicator (Visible on xl+) */}
        <div className="hidden xl:flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#252526] border border-[#3c3c3c] text-emerald-400 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>{saveStatus === 'saving' ? 'Saving...' : 'Auto-Saved'}</span>
        </div>
      </div>

      {/* Middle: Active File or Command Palette search bar */}
      <div className="flex-1 min-w-0 max-w-[120px] xs:max-w-[180px] sm:max-w-xs md:max-w-sm mx-1">
        <button
          onClick={onOpenCommandPalette}
          className="w-full h-7 bg-[#252526] hover:bg-[#2a2d2e] active:bg-[#1e1e1e] border border-[#3c3c3c] rounded flex items-center justify-between px-2 text-xs text-[#858585] transition-colors"
          title="Open Command Palette (Ctrl+P)"
        >
          <div className="flex items-center gap-1.5 truncate min-w-0">
            <Command size={12} className="text-sky-400 shrink-0" />
            <span className="truncate text-[11px] sm:text-xs">
              {activeFileName ? `pocketcode > ${activeFileName}` : 'Command Palette...'}
            </span>
          </div>
          <kbd className="hidden sm:inline-block text-[9px] bg-[#333333] px-1 py-0.2 rounded text-[#858585] border border-[#444444] shrink-0">
            Ctrl+P
          </kbd>
        </button>
      </div>

      {/* Right: Run, Terminal, Project Actions & Overflow Menu */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {/* New Project Button (Visible on md+) */}
        {onOpenNewProject && (
          <button
            onClick={onOpenNewProject}
            className="p-1 px-1.5 rounded bg-[#007acc]/20 hover:bg-[#007acc] text-sky-400 hover:text-white border border-[#007acc]/40 transition-colors hidden md:flex items-center gap-1 text-[11px] font-semibold shrink-0"
            title="Start New Project (Blank, Template, Git Clone)"
          >
            <FolderGit2 size={13} />
            <span>New</span>
          </button>
        )}

        {/* Touch Find in File Toggle (Visible on lg+) */}
        {onToggleFindReplace && (
          <button
            onClick={onToggleFindReplace}
            className="p-1 sm:p-1.5 rounded text-[#cccccc] hover:text-white hover:bg-[#3c3c3c] transition-colors hidden lg:flex shrink-0"
            title="Find & Replace (Ctrl+F)"
          >
            <Search size={15} />
          </button>
        )}

        {/* RUN / LIVE PREVIEW BUTTON (Always prominent and visible on all screens) */}
        <button
          onClick={onRunPreview}
          className="px-2 sm:px-2.5 py-1 rounded bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white font-bold text-xs flex items-center gap-1 shadow-md transition-transform shrink-0"
          title="Run / Live Preview (Execute Code)"
        >
          <Play size={12} fill="currentColor" />
          <span className="hidden xs:inline text-[11px] sm:text-xs">Run</span>
        </button>

        {/* Terminal Toggle (Always visible) */}
        <button
          onClick={onToggleTerminal}
          className={`p-1 sm:p-1.5 rounded transition-colors shrink-0 ${
            isTerminalOpen ? 'bg-[#007acc] text-white' : 'text-[#cccccc] hover:bg-[#3c3c3c] active:bg-[#007acc]'
          }`}
          title="Toggle Terminal Drawer"
          aria-label="Toggle Terminal"
        >
          <Terminal size={16} />
        </button>

        {/* Templates / Project switch (Visible on sm+) */}
        <button
          onClick={onOpenTemplates}
          className="p-1 sm:p-1.5 rounded text-[#cccccc] hover:bg-[#3c3c3c] transition-colors hidden sm:flex shrink-0"
          title="Project Templates & Starters"
        >
          <Layers size={16} />
        </button>

        {/* Download Zip (Visible on sm+) */}
        <button
          onClick={onExportZip}
          className="p-1 sm:p-1.5 rounded text-[#cccccc] hover:bg-[#3c3c3c] transition-colors hidden sm:flex shrink-0"
          title="Download Workspace ZIP"
        >
          <Download size={16} />
        </button>

        {/* Overflow / More Actions Dropdown (Visible on small screens or for fast access) */}
        <div className="relative shrink-0" ref={moreMenuRef}>
          <button
            onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
            className={`p-1 sm:p-1.5 rounded transition-colors ${
              isMoreMenuOpen ? 'bg-[#007acc] text-white' : 'text-[#cccccc] hover:bg-[#3c3c3c] active:bg-[#007acc]'
            }`}
            title="More Actions"
            aria-label="More Actions"
          >
            <MoreHorizontal size={17} />
          </button>

          {/* More Actions Dropdown Popup */}
          {isMoreMenuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-52 bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-2xl py-1.5 z-50 flex flex-col text-xs text-[#cccccc] backdrop-blur-md bg-opacity-95 animate-slide-up">
              {/* Active Workspace Info */}
              <div className="px-3 py-1 text-[10px] text-[#888888] uppercase tracking-wider font-semibold border-b border-[#333333] mb-1 flex items-center justify-between">
                <span>Workspace Tools</span>
                <span className="text-emerald-400 flex items-center gap-1 font-normal lowercase">
                  <Check size={10} />
                  {saveStatus}
                </span>
              </div>

              {onOpenNewProject && (
                <button
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    onOpenNewProject();
                  }}
                  className="w-full px-3 py-1.5 hover:bg-[#007acc] hover:text-white flex items-center gap-2 text-left transition-colors"
                >
                  <FolderGit2 size={14} className="text-sky-400" />
                  <span>New Project / Git Clone</span>
                </button>
              )}

              {onFormatDocument && (
                <button
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    onFormatDocument();
                  }}
                  className="w-full px-3 py-1.5 hover:bg-[#007acc] hover:text-white flex items-center gap-2 text-left transition-colors"
                >
                  <Wand2 size={14} className="text-amber-400" />
                  <span>Format Document (Prettier)</span>
                </button>
              )}

              {onToggleFindReplace && (
                <button
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    onToggleFindReplace();
                  }}
                  className="w-full px-3 py-1.5 hover:bg-[#007acc] hover:text-white flex items-center gap-2 text-left transition-colors"
                >
                  <Search size={14} className="text-purple-400" />
                  <span>Find & Replace</span>
                </button>
              )}

              {onToggleSplitEditor && (
                <button
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    onToggleSplitEditor();
                  }}
                  className="w-full px-3 py-1.5 hover:bg-[#007acc] hover:text-white flex items-center gap-2 text-left transition-colors"
                >
                  <Columns2 size={14} className="text-blue-400" />
                  <span>{isSplitEditor ? 'Close Split Editor' : 'Side-by-Side Split Editor'}</span>
                </button>
              )}

              <button
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  onOpenTemplates();
                }}
                className="w-full px-3 py-1.5 hover:bg-[#007acc] hover:text-white flex items-center gap-2 text-left transition-colors"
              >
                <Layers size={14} className="text-emerald-400" />
                <span>Templates & Starters</span>
              </button>

              <button
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  onExportZip();
                }}
                className="w-full px-3 py-1.5 hover:bg-[#007acc] hover:text-white flex items-center gap-2 text-left transition-colors border-t border-[#333333] mt-1 pt-1.5"
              >
                <Download size={14} className="text-teal-400" />
                <span>Download Workspace ZIP</span>
              </button>

              <button
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  onOpenCommandPalette();
                }}
                className="w-full px-3 py-1.5 hover:bg-[#007acc] hover:text-white flex items-center gap-2 text-left transition-colors"
              >
                <Command size={14} className="text-sky-400" />
                <span>Command Palette...</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
