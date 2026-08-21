import React, { useState, useRef, useEffect } from 'react';
import { 
  FilePlus, FolderPlus, ChevronRight, ChevronDown, 
  Trash2, Edit2, Folder, FolderOpen, Layers, Plus, FileCode, UploadCloud, Copy,
  Check, X
} from 'lucide-react';
import { FileItem } from '../../types';
import { getTabIcon } from '../Editor/EditorTabs';
import { fileSystemService } from '../../services/fileSystem';
import { extractSymbols, DocumentSymbol } from '../../utils/symbolParser';

interface ExplorerProps {
  files: FileItem[];
  activeFileId: string | null;
  activeFile?: FileItem | null;
  projectName?: string;
  onOpenFile: (file: FileItem) => void;
  onCreateFile: (name: string, isFolder?: boolean, targetFolderId?: string | null) => void;
  onDeleteFile: (fileId: string) => void;
  onRenameFile: (fileId: string, newName: string) => void;
  onToggleFolder: (folderId: string) => void;
  onOpenTemplates: () => void;
  onExportZip: () => void;
  onFilesImported?: () => void;
  onOpenNewProject?: () => void;
  onJumpToLine?: (line: number) => void;
}

export const Explorer: React.FC<ExplorerProps> = ({
  files,
  activeFileId,
  activeFile,
  projectName,
  onOpenFile,
  onCreateFile,
  onDeleteFile,
  onRenameFile,
  onToggleFolder,
  onOpenTemplates,
  onExportZip,
  onFilesImported,
  onOpenNewProject,
  onJumpToLine
}) => {
  const [isOutlineExpanded, setIsOutlineExpanded] = useState(true);
  const symbols = React.useMemo(() => {
    if (!activeFile?.content) return [];
    return extractSymbols(activeFile.content, activeFile.language);
  }, [activeFile?.content, activeFile?.language]);
  // State for creating new file/folder
  const [creatingTargetFolderId, setCreatingTargetFolderId] = useState<string | null>(null);
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newInputName, setNewInputName] = useState('');

  // State for renaming
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // Drag and drop state
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCreatingFile) {
      setTimeout(() => {
        createInputRef.current?.focus();
        createInputRef.current?.select();
      }, 20);
    }
  }, [isCreatingFile, creatingTargetFolderId]);

  const startCreate = (isFolder: boolean, folderId: string | null = null) => {
    if (folderId) {
      const folder = fileSystemService.getFileById(folderId);
      if (folder && !folder.isExpanded) {
        onToggleFolder(folderId);
      }
    }
    setIsCreatingFolder(isFolder);
    setCreatingTargetFolderId(folderId);
    setIsCreatingFile(true);
    setNewInputName('');
  };

  const handleCreateSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const name = newInputName.trim();
    if (name) {
      onCreateFile(name, isCreatingFolder, creatingTargetFolderId);
    }
    setNewInputName('');
    setIsCreatingFile(false);
    setCreatingTargetFolderId(null);
  };

  const handleRenameSubmit = (fileId: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const name = editName.trim();
    if (name) {
      onRenameFile(fileId, name);
    }
    setEditingId(null);
    setEditName('');
  };

  // --- Recursive Folder / File Drag & Drop Import Handler ---
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);

    const items = e.dataTransfer.items;
    if (!items || items.length === 0) return;

    const readEntry = async (entry: any, pathPrefix = ''): Promise<void> => {
      if (entry.isFile) {
        return new Promise((resolve) => {
          entry.file((file: File) => {
            const reader = new FileReader();
            const isMedia = file.type.startsWith('image/') || file.type.startsWith('audio/');
            if (isMedia) {
              reader.readAsDataURL(file);
            } else {
              reader.readAsText(file);
            }
            reader.onload = async () => {
              const fullPath = pathPrefix ? `${pathPrefix}/${file.name}` : file.name;
              await fileSystemService.createFile(fullPath, false, null, String(reader.result || ''));
              resolve();
            };
          });
        });
      } else if (entry.isDirectory) {
        const fullDirPath = pathPrefix ? `${pathPrefix}/${entry.name}` : entry.name;
        await fileSystemService.createFolder(fullDirPath);
        const dirReader = entry.createReader();
        return new Promise((resolve) => {
          dirReader.readEntries(async (entries: any[]) => {
            for (const child of entries) {
              await readEntry(child, fullDirPath);
            }
            resolve();
          });
        });
      }
    };

    for (let i = 0; i < items.length; i++) {
      const entry = items[i].webkitGetAsEntry?.();
      if (entry) {
        await readEntry(entry);
      } else {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.readAsText(file);
          reader.onload = async () => {
            await fileSystemService.createFile(file.name, false, null, String(reader.result || ''));
          };
        }
      }
    }

    onFilesImported?.();
  };

  // Handle standard file picker selection
  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles) return;

    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      const reader = new FileReader();
      const isMedia = file.type.startsWith('image/') || file.type.startsWith('audio/');
      if (isMedia) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
      reader.onload = async () => {
        const path = (file as any).webkitRelativePath || file.name;
        await fileSystemService.createFile(path, false, null, String(reader.result || ''));
        onFilesImported?.();
      };
    }
  };

  // Recursive Tree Node Renderer
  const renderTree = (items: FileItem[], level = 0) => {
    return items.map((item) => {
      const isFolder = !!item.isFolder;
      const isExpanded = !!item.isExpanded;
      const isActive = item.id === activeFileId;
      const isEditing = editingId === item.id;
      const isTargetForNew = isCreatingFile && creatingTargetFolderId === item.id;

      if (isEditing) {
        return (
          <form
            key={item.id}
            onSubmit={(e) => handleRenameSubmit(item.id, e)}
            className="px-2 py-1 bg-[#1e1e1e] border border-[#007acc] rounded flex items-center gap-1.5 shadow-sm"
            style={{ paddingLeft: `${Math.max(8, level * 14 + 8)}px` }}
          >
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setEditingId(null);
                  setEditName('');
                }
              }}
              autoFocus
              className="bg-transparent text-white text-xs w-full focus:outline-none font-mono"
              onBlur={() => {
                if (editName.trim() && editName.trim() !== item.name) {
                  onRenameFile(item.id, editName.trim());
                }
                setEditingId(null);
                setEditName('');
              }}
            />
            <button
              type="submit"
              onMouseDown={(e) => e.preventDefault()}
              className="p-1 text-emerald-400 hover:text-emerald-300"
              title="Confirm rename"
            >
              <Check size={12} />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setEditingId(null);
                setEditName('');
              }}
              className="p-1 text-rose-400 hover:text-rose-300"
              title="Cancel"
            >
              <X size={12} />
            </button>
          </form>
        );
      }

      return (
        <div key={item.id} className="flex flex-col">
          {/* Node Row */}
          <div
            onClick={() => {
              if (isFolder) {
                onToggleFolder(item.id);
              } else {
                onOpenFile(item);
              }
            }}
            style={{ paddingLeft: `${Math.max(8, level * 14 + 8)}px` }}
            className={`flex items-center justify-between py-1.5 px-2 rounded cursor-pointer group select-none transition-colors ${
              isActive
                ? 'bg-[#37373d] text-white font-medium'
                : 'hover:bg-[#2a2d2e] text-[#cccccc]'
            }`}
          >
            <div className="flex items-center gap-1.5 overflow-hidden flex-1">
              {isFolder ? (
                <>
                  <span className="text-[#858585] text-xs">
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </span>
                  <span className="text-amber-400">
                    {isExpanded ? <FolderOpen size={15} /> : <Folder size={15} />}
                  </span>
                </>
              ) : (
                <span className="text-xs">{getTabIcon(item.name)}</span>
              )}
              <span className="truncate text-xs tracking-tight font-mono">{item.name}</span>
            </div>

            {/* Hover Actions */}
            <div className="hidden group-hover:flex items-center gap-1 text-[#858585]">
              {isFolder && (
                <>
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => {
                      e.stopPropagation();
                      startCreate(false, item.id);
                    }}
                    className="p-1 hover:text-white hover:bg-[#333333] rounded transition-colors"
                    title="New File Inside"
                  >
                    <FilePlus size={13} />
                  </button>
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => {
                      e.stopPropagation();
                      startCreate(true, item.id);
                    }}
                    className="p-1 hover:text-white hover:bg-[#333333] rounded transition-colors"
                    title="New Folder Inside"
                  >
                    <FolderPlus size={13} />
                  </button>
                </>
              )}
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingId(item.id);
                  setEditName(item.name);
                }}
                className="p-1 hover:text-white hover:bg-[#333333] rounded transition-colors"
                title="Rename"
              >
                <Edit2 size={12} />
              </button>
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteFile(item.id);
                }}
                className="p-1 hover:text-rose-400 hover:bg-[#333333] rounded transition-colors"
                title="Delete"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>

          {/* Folder Inline Creator Input */}
          {isFolder && isTargetForNew && (
            <form
              onSubmit={handleCreateSubmit}
              style={{ paddingLeft: `${(level + 1) * 14 + 8}px` }}
              className="py-1 bg-[#1e1e1e] border-l-2 border-[#007acc] my-0.5 flex items-center gap-1.5 pr-2 animate-fade-in"
            >
              <span className="text-sky-400 text-xs">{isCreatingFolder ? '📁' : '📄'}</span>
              <input
                ref={createInputRef}
                type="text"
                value={newInputName}
                onChange={(e) => setNewInputName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsCreatingFile(false);
                    setCreatingTargetFolderId(null);
                  }
                }}
                placeholder={isCreatingFolder ? 'folder-name' : 'filename.ext'}
                autoFocus
                className="bg-transparent text-white text-xs w-full focus:outline-none font-mono"
                onBlur={() => {
                  if (newInputName.trim()) {
                    onCreateFile(newInputName.trim(), isCreatingFolder, creatingTargetFolderId);
                    setNewInputName('');
                  }
                  setIsCreatingFile(false);
                  setCreatingTargetFolderId(null);
                }}
              />
              <button
                type="submit"
                onMouseDown={(e) => e.preventDefault()}
                className="p-0.5 text-emerald-400 hover:text-emerald-300"
                title="Create (Enter)"
              >
                <Check size={13} />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setIsCreatingFile(false);
                  setCreatingTargetFolderId(null);
                }}
                className="p-0.5 text-rose-400 hover:text-rose-300"
                title="Cancel (Esc)"
              >
                <X size={13} />
              </button>
            </form>
          )}

          {/* Children nodes */}
          {isFolder && isExpanded && item.children && item.children.length > 0 && (
            <div className="border-l border-[#333333]/40 ml-2.5">
              {renderTree(item.children, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={handleDrop}
      className={`flex flex-col h-full bg-[#252526] text-[#cccccc] select-none text-xs relative transition-colors ${
        isDraggingOver ? 'bg-[#1a2b3c] border-2 border-dashed border-sky-400' : ''
      }`}
    >
      {/* Hidden Upload Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#333333] font-bold text-[11px] uppercase tracking-wider text-[#999999]">
        <button
          onClick={onOpenNewProject || onOpenTemplates}
          className="flex items-center gap-1.5 hover:text-white transition-colors truncate max-w-[140px] text-left"
          title={`Active Project: ${projectName || 'WORKSPACE'} (Click to switch/manage)`}
        >
          <span className="text-amber-400 font-mono text-xs">📁</span>
          <span className="truncate">{projectName || 'WORKSPACE'}</span>
        </button>
        <div className="flex items-center gap-1">
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={onOpenNewProject || onOpenTemplates}
            className="p-1 rounded hover:bg-[#007acc] hover:text-white transition-colors text-sky-400"
            title="Start New Project (Blank, Template, Git Clone)"
          >
            <Plus size={15} />
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="p-1 rounded hover:bg-[#333333] hover:text-white transition-colors"
            title="Upload Files or Folder"
          >
            <UploadCloud size={14} />
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => startCreate(false, null)}
            className="p-1 rounded hover:bg-[#333333] hover:text-white transition-colors"
            title="New File at Root"
          >
            <FilePlus size={14} />
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => startCreate(true, null)}
            className="p-1 rounded hover:bg-[#333333] hover:text-white transition-colors"
            title="New Folder at Root"
          >
            <FolderPlus size={14} />
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={onOpenTemplates}
            className="p-1 rounded hover:bg-[#333333] hover:text-white transition-colors"
            title="Templates"
          >
            <Layers size={14} />
          </button>
        </div>
      </div>

      {/* Drag & Drop Banner */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-30 bg-sky-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 text-sky-300 font-semibold text-center p-4">
          <UploadCloud size={40} className="animate-bounce" />
          <span>Drop files or folders to import into PocketCode workspace</span>
        </div>
      )}

      {/* Root Inline File/Folder Creator Input */}
      {isCreatingFile && creatingTargetFolderId === null && (
        <form onSubmit={handleCreateSubmit} className="px-3 py-1.5 bg-[#1e1e1e] border-b border-[#007acc] flex items-center gap-1.5 animate-fade-in">
          <span className="text-sky-400 font-mono text-[11px]">{isCreatingFolder ? '📁' : '📄'}</span>
          <input
            ref={createInputRef}
            type="text"
            value={newInputName}
            onChange={(e) => setNewInputName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setIsCreatingFile(false);
                setCreatingTargetFolderId(null);
              }
            }}
            placeholder={isCreatingFolder ? 'folder-name (e.g. src/components)' : 'filename.ext (e.g. src/App.tsx)'}
            autoFocus
            className="bg-transparent text-white text-xs w-full focus:outline-none font-mono"
            onBlur={() => {
              if (newInputName.trim()) {
                onCreateFile(newInputName.trim(), isCreatingFolder, creatingTargetFolderId);
                setNewInputName('');
              }
              setIsCreatingFile(false);
              setCreatingTargetFolderId(null);
            }}
          />
          <button
            type="submit"
            onMouseDown={(e) => e.preventDefault()}
            className="p-0.5 text-emerald-400 hover:text-emerald-300"
            title="Create (Enter)"
          >
            <Check size={13} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setIsCreatingFile(false);
              setCreatingTargetFolderId(null);
            }}
            className="p-0.5 text-rose-400 hover:text-rose-300"
            title="Cancel (Esc)"
          >
            <X size={13} />
          </button>
        </form>
      )}

      {/* File & Folder Tree List */}
      <div className="flex-1 overflow-y-auto px-1 py-1 space-y-0.5 min-h-[140px]">
        {files.length === 0 ? (
          <div className="p-4 text-center text-[#858585]">
            <p>No files or folders in workspace.</p>
            <button
              onClick={onOpenNewProject || onOpenTemplates}
              className="mt-3 px-3 py-1.5 bg-[#007acc] text-white rounded font-medium text-xs hover:bg-[#0062a3]"
            >
              Start New Project
            </button>
          </div>
        ) : (
          renderTree(files, 0)
        )}
      </div>

      {/* VS Code Outline Symbols Section */}
      {activeFile && (
        <div className="border-t border-[#333333] bg-[#222222] max-h-48 flex flex-col shrink-0">
          <div
            onClick={() => setIsOutlineExpanded(!isOutlineExpanded)}
            className="px-3 py-1.5 bg-[#1e1e1e] flex items-center justify-between text-[11px] font-bold text-[#888888] hover:text-white cursor-pointer select-none border-b border-[#2d2d2d]"
          >
            <div className="flex items-center gap-1.5">
              {isOutlineExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              <span className="uppercase tracking-wider">OUTLINE</span>
              <span className="text-[10px] text-[#666666]">({symbols.length})</span>
            </div>
            <span className="text-[10px] font-mono text-sky-400 truncate max-w-[120px]">{activeFile.name}</span>
          </div>

          {isOutlineExpanded && (
            <div className="flex-1 overflow-y-auto p-1 space-y-0.5 text-xs font-mono">
              {symbols.length === 0 ? (
                <div className="p-2 text-[10px] text-[#666666] italic text-center">
                  No symbols found in {activeFile.name}
                </div>
              ) : (
                symbols.map((sym, sIdx) => {
                  let kindColor = 'text-amber-400';
                  let kindLabel = '𝑓';
                  if (sym.kind === 'class') { kindColor = 'text-sky-400'; kindLabel = '𝙲'; }
                  else if (sym.kind === 'interface') { kindColor = 'text-purple-400'; kindLabel = '𝙸'; }
                  else if (sym.kind === 'variable') { kindColor = 'text-emerald-400'; kindLabel = '𝑣'; }
                  else if (sym.kind === 'enum') { kindColor = 'text-rose-400'; kindLabel = '𝙴'; }

                  return (
                    <button
                      key={sIdx}
                      onClick={() => onJumpToLine?.(sym.line)}
                      className="w-full flex items-center justify-between px-2 py-1 rounded hover:bg-[#333333] text-left text-[#cccccc] hover:text-white transition-colors group text-[11px]"
                      title={`Jump to line ${sym.line}`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className={`font-bold text-xs ${kindColor} w-3 text-center`}>{kindLabel}</span>
                        <span className="truncate group-hover:text-white text-white font-medium">{sym.name}</span>
                        {sym.detail && <span className="text-[9px] text-[#666666] truncate font-sans">{sym.detail}</span>}
                      </div>
                      <span className="text-[9px] text-[#666666] group-hover:text-sky-400 font-mono">
                        :{sym.line}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* Bottom Action Cards: Start New Project / Switch Template */}
      <div className="p-2 border-t border-[#333333] bg-[#1e1e1e] space-y-1.5 safe-bottom">
        <button
          onClick={onOpenNewProject || onOpenTemplates}
          className="w-full py-1.5 px-2.5 rounded bg-[#007acc] hover:bg-[#0062a3] text-white font-medium flex items-center justify-center gap-1.5 text-xs transition-colors shadow-sm"
        >
          <Plus size={14} />
          <span>Start New Project...</span>
        </button>
        <button
          onClick={onOpenTemplates}
          className="w-full py-1.5 px-2.5 rounded bg-gradient-to-r from-sky-900/40 to-blue-900/40 border border-sky-600/40 hover:border-sky-400 text-sky-300 font-medium flex items-center justify-center gap-1.5 text-xs transition-colors"
        >
          <Layers size={13} />
          <span>Browse Starter Templates</span>
        </button>
      </div>
    </div>
  );
};
