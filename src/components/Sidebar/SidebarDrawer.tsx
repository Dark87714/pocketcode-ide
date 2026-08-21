import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, ChevronLeft, GripVertical } from 'lucide-react';
import { ActiveSidebarTab, FileItem, EditorSettings, DiagnosticProblem } from '../../types';
import { Explorer } from './Explorer';
import { SearchPanel } from './SearchPanel';
import { SourceControl } from './SourceControl';
import { RunDebugPanel } from './RunDebugPanel';
import { ExtensionsPanel } from './ExtensionsPanel';
import { SettingsPanel } from './SettingsPanel';
import { SecurityPanel } from './SecurityPanel';

interface SidebarDrawerProps {
  isOpen: boolean;
  activeTab: ActiveSidebarTab;
  files: FileItem[];
  activeFileId: string | null;
  settings: EditorSettings;
  projectName?: string;
  onClose: () => void;
  onOpenFile: (file: FileItem) => void;
  onCreateFile: (name: string, isFolder?: boolean, targetFolderId?: string | null) => void;
  onDeleteFile: (fileId: string) => void;
  onRenameFile: (fileId: string, newName: string) => void;
  onToggleFolder: (folderId: string) => void;
  onOpenTemplates: () => void;
  onExportZip: () => void;
  onReplaceInFile: (fileId: string, search: string, replace: string) => void;
  onRunPreview: () => void;
  onRunPython: () => void;
  onOpenTerminal: () => void;
  onUpdateSettings: (newSettings: Partial<EditorSettings>) => void;
  onInsertCodeToEditor?: (code: string) => void;
  onOpenDiff?: (fileName: string) => void;
  onFilesImported?: () => void;
  onOpenNewProject?: () => void;
  sidebarWidth?: number;
  onWidthChange?: (width: number) => void;
}

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  isOpen,
  activeTab,
  files,
  activeFileId,
  settings,
  projectName,
  onClose,
  onOpenFile,
  onCreateFile,
  onDeleteFile,
  onRenameFile,
  onToggleFolder,
  onOpenTemplates,
  onExportZip,
  onReplaceInFile,
  onRunPreview,
  onRunPython,
  onOpenTerminal,
  onUpdateSettings,
  onInsertCodeToEditor,
  onOpenDiff,
  onFilesImported,
  onOpenNewProject,
  sidebarWidth = 240,
  onWidthChange
}) => {
  const [width, setWidth] = useState<number>(() => {
    const saved = localStorage.getItem('pocketcode_sidebar_width');
    return saved ? Math.max(160, Math.min(500, parseInt(saved, 10))) : sidebarWidth;
  });
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(width);

  const handleStartResize = (clientX: number) => {
    isDraggingRef.current = true;
    startXRef.current = clientX;
    startWidthRef.current = width;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStartResize(e.clientX);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      handleStartResize(e.touches[0].clientX);
    }
  };

  const handleResizeMove = useCallback((clientX: number) => {
    if (!isDraggingRef.current) return;
    const delta = clientX - startXRef.current;
    const newWidth = Math.max(150, Math.min(window.innerWidth * 0.75, startWidthRef.current + delta));
    setWidth(newWidth);
    onWidthChange?.(newWidth);
  }, [onWidthChange]);

  const handleResizeEnd = useCallback(() => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      localStorage.setItem('pocketcode_sidebar_width', width.toString());
      // Trigger window resize event to tell Monaco editor to re-layout instantly
      window.dispatchEvent(new Event('resize'));
    }
  }, [width]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => handleResizeMove(e.clientX);
    const onMouseUp = () => handleResizeEnd();
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) handleResizeMove(e.touches[0].clientX);
    };
    const onTouchEnd = () => handleResizeEnd();

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [handleResizeMove, handleResizeEnd]);

  if (!isOpen) return null;

  const isSmallScreen = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <>
      {/* Mobile Backdrop overlay on portrait phone */}
      {isSmallScreen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 animate-fade-in"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel Container */}
      <div
        style={{
          width: isSmallScreen ? '88vw' : `${width}px`,
          maxWidth: isSmallScreen ? '360px' : '65vw'
        }}
        className="fixed sm:static inset-y-0 left-0 bg-[#252526] border-r border-[#333333] z-40 sm:z-10 flex flex-row h-full shadow-2xl sm:shadow-none shrink-0 safe-bottom"
      >
        {/* Content View */}
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
          {/* Quick Collapse Header with mobile status bar notch clearance */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-[#1e1e1e] border-b border-[#333333] text-xs font-semibold tracking-wider uppercase text-[#888888] safe-top shrink-0">
            <span className="truncate text-white font-bold capitalize">{activeTab}</span>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-[#cccccc] hover:text-white hover:bg-[#333333] transition-colors flex items-center gap-0.5 text-xs font-medium"
              title="Close Sidebar"
            >
              <span>Close</span>
              <ChevronLeft size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            {activeTab === 'explorer' && (
              <Explorer
                files={files}
                activeFileId={activeFileId}
                projectName={projectName}
                onOpenFile={(f) => {
                  onOpenFile(f);
                  // On mobile/landscape, close sidebar on file selection to give maximum code space
                  if (window.innerWidth < 768) {
                    onClose();
                  }
                }}
                onCreateFile={onCreateFile}
                onDeleteFile={onDeleteFile}
                onRenameFile={onRenameFile}
                onToggleFolder={onToggleFolder}
                onOpenTemplates={onOpenTemplates}
                onExportZip={onExportZip}
                onFilesImported={onFilesImported}
                onOpenNewProject={onOpenNewProject}
              />
            )}
            {activeTab === 'search' && (
              <SearchPanel
                files={files}
                onOpenFile={(f) => {
                  onOpenFile(f);
                  if (window.innerWidth < 768) onClose();
                }}
                onReplaceInFile={onReplaceInFile}
              />
            )}
            {activeTab === 'git' && (
              <SourceControl
                onOpenDiff={(fileName) => {
                  onOpenDiff?.(fileName);
                  if (window.innerWidth < 768) onClose();
                }}
              />
            )}
            {activeTab === 'run' && (
              <RunDebugPanel
                onRunPreview={() => {
                  onRunPreview();
                  if (window.innerWidth < 768) onClose();
                }}
                onRunPython={() => {
                  onRunPython();
                  if (window.innerWidth < 768) onClose();
                }}
                onOpenTerminal={() => {
                  onOpenTerminal();
                  if (window.innerWidth < 768) onClose();
                }}
              />
            )}
            {activeTab === 'security' && <SecurityPanel files={files} onOpenTerminal={onOpenTerminal} />}
            {activeTab === 'extensions' && <ExtensionsPanel />}
            {activeTab === 'settings' && (
              <SettingsPanel settings={settings} onUpdateSettings={onUpdateSettings} />
            )}
          </div>
        </div>

        {/* Resizable Divider Handle (Drag to resize Explorer) */}
        <div
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onDoubleClick={() => {
            setWidth(220);
            window.dispatchEvent(new Event('resize'));
          }}
          className="w-2 hover:w-2.5 active:w-2.5 bg-transparent hover:bg-[#007acc]/60 active:bg-[#007acc] cursor-col-resize flex items-center justify-center transition-colors group z-20 select-none -mr-1"
          title="Drag to resize Explorer (Double click to reset)"
        >
          <div className="w-[1.5px] h-8 bg-[#444444] group-hover:bg-white group-active:bg-white rounded-full transition-colors" />
        </div>
      </div>
    </>
  );
};
