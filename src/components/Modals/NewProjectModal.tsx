import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, FolderPlus, GitFork, FileArchive, FolderGit2,
  X, Sparkles, Code2, ArrowRight, Trash2, Check,
  Gamepad2, Layers, Terminal, Database, Loader2,
  Download, Edit2, Copy, Search, FolderUp, RefreshCw
} from 'lucide-react';
import { PROJECT_TEMPLATES } from '../../services/templates';
import { fileSystemService } from '../../services/fileSystem';
import { ProjectMetadata } from '../../types';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: (projectName: string) => void;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  onProjectCreated
}) => {
  const [activeTab, setActiveTab] = useState<'recent' | 'blank' | 'template' | 'github' | 'import'>('recent');
  
  // Blank project state
  const [projectName, setProjectName] = useState('My-Mobile-App');
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');

  // GitHub clone state
  const [repoUrl, setRepoUrl] = useState('');
  const [isCloning, setIsCloning] = useState(false);
  const [cloneStatus, setCloneStatus] = useState('');
  const [cloneError, setCloneError] = useState('');

  // Recent projects state & management
  const [recentProjects, setRecentProjects] = useState<ProjectMetadata[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState('');
  const folderInputRef = useRef<HTMLInputElement>(null);

  const refreshProjectsList = async () => {
    const list = await fileSystemService.listProjects();
    setRecentProjects(list);
  };

  useEffect(() => {
    if (isOpen) {
      refreshProjectsList();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreateBlank = async () => {
    if (!projectName.trim()) return;
    const clean = projectName.trim();
    await fileSystemService.createNewProject(clean, undefined, selectedLanguage);
    onProjectCreated(clean);
    onClose();
  };

  const handleCreateFromTemplate = async (templateId: string, templateName: string) => {
    await fileSystemService.createNewProject(templateName, templateId);
    onProjectCreated(templateName);
    onClose();
  };

  const handleCloneRepo = async () => {
    if (!repoUrl.trim() || isCloning) return;
    setIsCloning(true);
    setCloneError('');
    setCloneStatus('Connecting to GitHub API...');

    try {
      await fileSystemService.cloneGitRepository(repoUrl, (msg) => {
        setCloneStatus(msg);
      });
      onProjectCreated(fileSystemService.getCurrentProjectName());
      onClose();
    } catch (err: any) {
      setCloneError(err.message || 'Failed to clone repository');
    } finally {
      setIsCloning(false);
    }
  };

  const handleImportZip = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await fileSystemService.importWorkspaceZip(file);
    onProjectCreated(file.name.replace(/\.zip$/i, ''));
    onClose();
  };

  const handleImportFolder = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const filesList = e.target.files;
    if (!filesList || filesList.length === 0) return;

    const firstPath = (filesList[0] as any).webkitRelativePath || filesList[0].name;
    const folderName = firstPath.split('/')[0] || 'Imported-Folder';

    const filesData: { path: string; content: string }[] = [];
    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i];
      const relPath = (file as any).webkitRelativePath || file.name;
      // Strip root directory prefix from relative path
      const strippedPath = relPath.includes('/') ? relPath.substring(relPath.indexOf('/') + 1) : relPath;
      
      const isMedia = file.type.startsWith('image/') || file.type.startsWith('audio/');
      const content = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        if (isMedia) {
          reader.readAsDataURL(file);
        } else {
          reader.readAsText(file);
        }
        reader.onload = () => resolve(String(reader.result || ''));
      });
      filesData.push({ path: strippedPath, content });
    }

    await fileSystemService.importDirectoryFiles(filesData, folderName);
    onProjectCreated(folderName);
    onClose();
  };

  const handleSwitchProject = async (projectId: string, name: string) => {
    await fileSystemService.switchProject(projectId);
    onProjectCreated(name);
    onClose();
  };

  const handleDeleteProject = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    const wasActive = projectId === fileSystemService.getCurrentProjectId();
    await fileSystemService.deleteProject(projectId);
    await refreshProjectsList();
    if (wasActive) {
      onProjectCreated(fileSystemService.getCurrentProjectName());
    }
  };

  const handleDuplicateProject = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    // B8 fix: duplicateProject returns the new project; use that name rather than
    // calling getCurrentProjectName() which may still report the old project.
    const newProject = await fileSystemService.duplicateProject(projectId);
    const newName = (newProject as any)?.name || fileSystemService.getCurrentProjectName();
    onProjectCreated(newName);
    onClose();
  };

  const handleExportZip = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    await fileSystemService.downloadProjectZip(projectId);
  };

  const handleSaveRename = async (projectId: string) => {
    if (editingProjectName.trim()) {
      await fileSystemService.renameProject(projectId, editingProjectName.trim());
      await refreshProjectsList();
    }
    setEditingProjectId(null);
    setEditingProjectName('');
  };

  const filteredProjects = recentProjects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const languages = [
    { id: 'javascript', name: 'JavaScript (Node/Web)', ext: '.js', icon: '🟨' },
    { id: 'typescript', name: 'TypeScript', ext: '.ts', icon: '🔷' },
    { id: 'python', name: 'Python (WASM & AI)', ext: '.py', icon: '🐍' },
    { id: 'html', name: 'HTML5 / Web App', ext: '.html', icon: '🌐' },
    { id: 'cpp', name: 'C / C++', ext: '.cpp', icon: '⚡' },
    { id: 'rust', name: 'Rust', ext: '.rs', icon: '🦀' },
    { id: 'go', name: 'Go (Golang)', ext: '.go', icon: '🐹' },
    { id: 'java', name: 'Java', ext: '.java', icon: '☕' },
    { id: 'sql', name: 'SQL Database', ext: '.sql', icon: '📊' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in select-none">
      <div 
        className="w-full max-w-2xl bg-[#252526] border border-[#3c3c3c] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-[#cccccc] animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#1e1e1e] border-b border-[#333333]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-600 to-blue-500 flex items-center justify-center shadow-md">
              <FolderPlus size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">Project Workspace Hub</h2>
              <p className="text-[11px] text-[#888888]">Create, switch, or backup mobile projects just like VS Code</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#888888] hover:text-white hover:bg-[#333333] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center px-4 bg-[#1e1e1e] border-b border-[#333333] overflow-x-auto no-scrollbar gap-2 py-1.5">
          <button
            onClick={() => setActiveTab('recent')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 shrink-0 transition-all ${
              activeTab === 'recent'
                ? 'bg-[#007acc] text-white shadow-sm font-semibold'
                : 'text-[#888888] hover:text-white hover:bg-[#2d2d2d]'
            }`}
          >
            <FolderGit2 size={14} />
            <span>Saved Projects ({recentProjects.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('blank')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 shrink-0 transition-all ${
              activeTab === 'blank'
                ? 'bg-[#007acc] text-white shadow-sm font-semibold'
                : 'text-[#888888] hover:text-white hover:bg-[#2d2d2d]'
            }`}
          >
            <Plus size={14} />
            <span>New Blank Project</span>
          </button>

          <button
            onClick={() => setActiveTab('template')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 shrink-0 transition-all ${
              activeTab === 'template'
                ? 'bg-[#007acc] text-white shadow-sm font-semibold'
                : 'text-[#888888] hover:text-white hover:bg-[#2d2d2d]'
            }`}
          >
            <Sparkles size={14} className="text-amber-400" />
            <span>Starter Templates</span>
          </button>

          <button
            onClick={() => setActiveTab('github')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 shrink-0 transition-all ${
              activeTab === 'github'
                ? 'bg-[#007acc] text-white shadow-sm font-semibold'
                : 'text-[#888888] hover:text-white hover:bg-[#2d2d2d]'
            }`}
          >
            <GitFork size={14} />
            <span>Clone GitHub</span>
          </button>

          <button
            onClick={() => setActiveTab('import')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 shrink-0 transition-all ${
              activeTab === 'import'
                ? 'bg-[#007acc] text-white shadow-sm font-semibold'
                : 'text-[#888888] hover:text-white hover:bg-[#2d2d2d]'
            }`}
          >
            <FileArchive size={14} />
            <span>Import Mobile Files</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* 1. SAVED PROJECTS (RECENT) */}
          {activeTab === 'recent' && (
            <div className="space-y-3">
              {/* Search Bar */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-[#777777]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search saved mobile projects..."
                  className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#007acc] focus:outline-none rounded-lg pl-9 pr-3 py-2 text-xs text-white"
                />
              </div>

              {filteredProjects.length === 0 ? (
                <div className="text-center py-10 text-[#777777]">
                  <FolderGit2 size={36} className="mx-auto mb-2 opacity-50" />
                  <p className="text-xs">No saved projects found</p>
                  <button
                    onClick={() => setActiveTab('blank')}
                    className="mt-3 px-3 py-1.5 bg-[#007acc] text-white rounded-lg text-xs font-medium hover:bg-[#0062a3]"
                  >
                    Create Your First Project
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                  {filteredProjects.map((proj) => {
                    const isCurrent = proj.id === fileSystemService.getCurrentProjectId();
                    const isEditing = editingProjectId === proj.id;

                    return (
                      <div
                        key={proj.id}
                        onClick={() => !isEditing && handleSwitchProject(proj.id, proj.name)}
                        className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between transition-all group ${
                          isCurrent
                            ? 'bg-[#007acc]/20 border-[#007acc] text-white shadow-sm'
                            : 'bg-[#1e1e1e] border-[#333333] hover:border-[#555555] text-[#cccccc]'
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1 overflow-hidden pr-2">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                            isCurrent ? 'bg-[#007acc] text-white' : 'bg-[#2d2d2d] text-sky-400'
                          }`}>
                            <FolderGit2 size={18} />
                          </div>

                          <div className="flex-1 overflow-hidden">
                            {isEditing ? (
                              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="text"
                                  value={editingProjectName}
                                  onChange={(e) => setEditingProjectName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveRename(proj.id);
                                    if (e.key === 'Escape') setEditingProjectId(null);
                                  }}
                                  autoFocus
                                  className="bg-[#2a2d32] text-white border border-[#007acc] rounded px-2 py-0.5 text-xs w-full font-mono focus:outline-none"
                                />
                                <button
                                  onClick={() => handleSaveRename(proj.id)}
                                  className="p-1 text-emerald-400 hover:text-emerald-300"
                                  title="Save Name"
                                >
                                  <Check size={14} />
                                </button>
                                <button
                                  onClick={() => setEditingProjectId(null)}
                                  className="p-1 text-rose-400 hover:text-rose-300"
                                  title="Cancel"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-white truncate">{proj.name}</span>
                                  {isCurrent && (
                                    <span className="text-[9px] bg-[#007acc] text-white px-1.5 py-0.2 rounded font-mono font-bold shrink-0">
                                      ACTIVE
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-[#888888] font-mono mt-0.5 truncate">
                                  {proj.fileCount} files • Saved on mobile • {new Date(proj.lastModified).toLocaleDateString()}
                                </p>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Quick Project Action Buttons */}
                        {!isEditing && (
                          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={(e) => handleExportZip(e, proj.id)}
                              className="p-1.5 rounded text-[#888888] hover:text-sky-400 hover:bg-[#333333] transition-colors"
                              title="Download/Export .ZIP to Mobile Storage"
                            >
                              <Download size={14} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingProjectId(proj.id);
                                setEditingProjectName(proj.name);
                              }}
                              className="p-1.5 rounded text-[#888888] hover:text-white hover:bg-[#333333] transition-colors"
                              title="Rename Project"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={(e) => handleDuplicateProject(e, proj.id)}
                              className="p-1.5 rounded text-[#888888] hover:text-amber-400 hover:bg-[#333333] transition-colors"
                              title="Duplicate Project"
                            >
                              <Copy size={14} />
                            </button>
                            {!isCurrent && (
                              <button
                                onClick={(e) => handleDeleteProject(e, proj.id)}
                                className="p-1.5 rounded text-[#888888] hover:text-red-400 hover:bg-[#333333] transition-colors"
                                title="Delete Project from Mobile"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                            <button
                              onClick={() => handleSwitchProject(proj.id, proj.name)}
                              className="p-1.5 rounded text-[#888888] hover:text-sky-400 hover:bg-[#333333] transition-colors"
                              title="Open Project"
                            >
                              <ArrowRight size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="pt-2 border-t border-[#333333] flex items-center justify-between">
                <span className="text-[11px] text-[#777777]">
                  All projects are persistently saved in mobile IndexedDB storage.
                </span>
                <button
                  onClick={() => fileSystemService.downloadProjectZip()}
                  className="px-2.5 py-1.5 rounded bg-[#333333] hover:bg-[#444444] text-white text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Download size={13} />
                  <span>Export Active .ZIP</span>
                </button>
              </div>
            </div>
          )}

          {/* 2. BLANK PROJECT */}
          {activeTab === 'blank' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#aaaaaa] mb-1.5">
                  Project Workspace Name
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. My-Mobile-App"
                  className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#007acc] focus:outline-none rounded-lg px-3 py-2 text-sm text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#aaaaaa] mb-2">
                  Choose Starter Language & Environment
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {languages.map((lang) => (
                    <div
                      key={lang.id}
                      onClick={() => setSelectedLanguage(lang.id)}
                      className={`p-2.5 rounded-lg border cursor-pointer flex items-center justify-between transition-all ${
                        selectedLanguage === lang.id
                          ? 'bg-[#007acc]/20 border-[#007acc] text-white shadow-sm'
                          : 'bg-[#1e1e1e] border-[#333333] hover:border-[#444444] text-[#cccccc]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">{lang.icon}</span>
                        <div>
                          <p className="text-xs font-semibold">{lang.name}</p>
                          <p className="text-[10px] text-[#888888] font-mono">Starter: main{lang.ext}</p>
                        </div>
                      </div>
                      {selectedLanguage === lang.id && (
                        <div className="w-5 h-5 rounded-full bg-[#007acc] flex items-center justify-center text-white">
                          <Check size={12} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleCreateBlank}
                  className="w-full py-2.5 rounded-lg bg-[#007acc] hover:bg-[#0062a3] active:scale-[0.99] text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  <Plus size={16} />
                  <span>Create & Save Project on Mobile</span>
                </button>
              </div>
            </div>
          )}

          {/* 3. STARTER TEMPLATES */}
          {activeTab === 'template' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PROJECT_TEMPLATES.map((tmpl) => (
                <div
                  key={tmpl.id}
                  onClick={() => handleCreateFromTemplate(tmpl.id, tmpl.name)}
                  className="p-3 rounded-lg bg-[#1e1e1e] border border-[#333333] hover:border-[#007acc] hover:bg-[#2a2d32] cursor-pointer transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] uppercase font-bold text-sky-400 tracking-wider">
                        {tmpl.category}
                      </span>
                      <span className="text-[10px] font-mono text-[#777777] bg-[#252526] px-1.5 py-0.5 rounded">
                        {tmpl.entryFile}
                      </span>
                    </div>
                    <h3 className="text-xs font-bold text-white group-hover:text-sky-300 transition-colors mb-1">
                      {tmpl.name}
                    </h3>
                    <p className="text-[11px] text-[#888888] line-clamp-2 leading-relaxed">
                      {tmpl.description}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center justify-end text-xs text-[#007acc] font-medium gap-1 group-hover:translate-x-1 transition-transform">
                    <span>Create from Template</span>
                    <ArrowRight size={13} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 4. CLONE FROM GITHUB */}
          {activeTab === 'github' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#aaaaaa] mb-1.5">
                  Public GitHub Repository URL
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/facebook/react or owner/repo"
                    className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#007acc] focus:outline-none rounded-lg pl-3 pr-24 py-2 text-sm text-white font-mono"
                    disabled={isCloning}
                  />
                  <div className="absolute right-2 top-2 text-[10px] text-[#777777] uppercase font-bold tracking-wider">
                    GitHub
                  </div>
                </div>
                <p className="text-[11px] text-[#888888] mt-1.5">
                  Downloads all directory structures & code directly from GitHub into your mobile IDE storage.
                </p>
              </div>

              {cloneStatus && (
                <div className="p-2.5 rounded-lg bg-[#1e1e1e] border border-sky-500/30 text-sky-400 text-xs flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin shrink-0" />
                  <span className="truncate">{cloneStatus}</span>
                </div>
              )}

              {cloneError && (
                <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-500/30 text-red-400 text-xs">
                  ❌ {cloneError}
                </div>
              )}

              <button
                onClick={handleCloneRepo}
                disabled={!repoUrl.trim() || isCloning}
                className="w-full py-2.5 rounded-lg bg-[#007acc] hover:bg-[#0062a3] disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
              >
                {isCloning ? <Loader2 size={16} className="animate-spin" /> : <GitFork size={16} />}
                <span>{isCloning ? 'Cloning Repository...' : 'Clone & Save Project'}</span>
              </button>
            </div>
          )}

          {/* 5. IMPORT FROM MOBILE (ZIP OR FOLDER) */}
          {activeTab === 'import' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
              {/* Import ZIP */}
              <div className="p-4 rounded-xl bg-[#1e1e1e] border border-[#333333] flex flex-col items-center justify-between text-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#252526] border border-[#3c3c3c] flex items-center justify-center text-sky-400">
                  <FileArchive size={24} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">Import .ZIP Archive</h3>
                  <p className="text-[11px] text-[#888888] mt-1 leading-relaxed">
                    Unpack an existing zip file from your mobile storage into a new workspace.
                  </p>
                </div>
                <label className="w-full py-2 px-3 rounded-lg bg-[#007acc] hover:bg-[#0062a3] text-white font-semibold text-xs cursor-pointer shadow-md transition-all flex items-center justify-center gap-1.5">
                  <FileArchive size={14} />
                  <span>Select .ZIP File</span>
                  <input
                    type="file"
                    accept=".zip"
                    onChange={handleImportZip}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Import Entire Folder */}
              <div className="p-4 rounded-xl bg-[#1e1e1e] border border-[#333333] flex flex-col items-center justify-between text-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#252526] border border-[#3c3c3c] flex items-center justify-center text-amber-400">
                  <FolderUp size={24} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">Import Device Folder</h3>
                  <p className="text-[11px] text-[#888888] mt-1 leading-relaxed">
                    Select a folder on your phone or PC to import all files and subdirectories.
                  </p>
                </div>
                <label className="w-full py-2 px-3 rounded-lg bg-[#2a2d32] hover:bg-[#333333] border border-[#444444] text-white font-semibold text-xs cursor-pointer shadow-md transition-all flex items-center justify-center gap-1.5">
                  <FolderUp size={14} />
                  <span>Select Folder</span>
                  <input
                    ref={folderInputRef}
                    type="file"
                    /* @ts-ignore */
                    webkitdirectory="true"
                    directory="true"
                    multiple
                    onChange={handleImportFolder}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
