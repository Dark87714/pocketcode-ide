import React, { useState, useEffect } from 'react';
import { 
  Plus, FolderPlus, GitFork, FileArchive, FolderGit2,
  X, Sparkles, Code2, ArrowRight, Trash2, Check,
  Gamepad2, Layers, Terminal, Database, Loader2
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
  const [activeTab, setActiveTab] = useState<'blank' | 'template' | 'github' | 'zip' | 'recent'>('blank');
  
  // Blank project state
  const [projectName, setProjectName] = useState('My-Awesome-Project');
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');

  // GitHub clone state
  const [repoUrl, setRepoUrl] = useState('');
  const [isCloning, setIsCloning] = useState(false);
  const [cloneStatus, setCloneStatus] = useState('');
  const [cloneError, setCloneError] = useState('');

  // Recent projects state
  const [recentProjects, setRecentProjects] = useState<ProjectMetadata[]>([]);

  useEffect(() => {
    if (isOpen) {
      fileSystemService.listProjects().then(setRecentProjects);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreateBlank = async () => {
    if (!projectName.trim()) return;
    await fileSystemService.createNewProject(projectName, undefined, selectedLanguage);
    onProjectCreated(projectName);
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
      const res = await fileSystemService.cloneGitRepository(repoUrl, (msg) => {
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

  const handleSwitchProject = async (projectId: string, name: string) => {
    await fileSystemService.switchProject(projectId);
    onProjectCreated(name);
    onClose();
  };

  const handleDeleteProject = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    await fileSystemService.deleteProject(projectId);
    const updated = await fileSystemService.listProjects();
    setRecentProjects(updated);
  };

  const languages = [
    { id: 'javascript', name: 'JavaScript (Node/Web)', ext: '.js', icon: '🟨' },
    { id: 'python', name: 'Python (WASM & AI)', ext: '.py', icon: '🐍' },
    { id: 'typescript', name: 'TypeScript', ext: '.ts', icon: '🔷' },
    { id: 'html', name: 'HTML5 / Web App', ext: '.html', icon: '🌐' },
    { id: 'cpp', name: 'C / C++', ext: '.cpp', icon: '⚡' },
    { id: 'rust', name: 'Rust', ext: '.rs', icon: '🦀' },
    { id: 'go', name: 'Go (Golang)', ext: '.go', icon: '🐹' },
    { id: 'java', name: 'Java', ext: '.java', icon: '☕' },
    { id: 'sql', name: 'SQL Database', ext: '.sql', icon: '📊' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in select-none">
      <div 
        className="w-full max-w-2xl bg-[#252526] border border-[#3c3c3c] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-[#cccccc] animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#1e1e1e] border-b border-[#333333]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-sky-600 to-blue-500 flex items-center justify-center shadow-md">
              <FolderPlus size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">Start New Project</h2>
              <p className="text-[11px] text-[#888888]">Create a clean workspace, choose a template, or clone from GitHub</p>
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
            onClick={() => setActiveTab('blank')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 shrink-0 transition-all ${
              activeTab === 'blank'
                ? 'bg-[#007acc] text-white shadow-sm font-semibold'
                : 'text-[#888888] hover:text-white hover:bg-[#2d2d2d]'
            }`}
          >
            <Plus size={14} />
            <span>Blank Project</span>
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
            <span>Clone from GitHub</span>
          </button>

          <button
            onClick={() => setActiveTab('zip')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 shrink-0 transition-all ${
              activeTab === 'zip'
                ? 'bg-[#007acc] text-white shadow-sm font-semibold'
                : 'text-[#888888] hover:text-white hover:bg-[#2d2d2d]'
            }`}
          >
            <FileArchive size={14} />
            <span>Import ZIP</span>
          </button>

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
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* 1. BLANK PROJECT */}
          {activeTab === 'blank' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#aaaaaa] mb-1.5">
                  Project Name
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. My-Web-App"
                  className="w-full bg-[#1e1e1e] border border-[#3c3c3c] focus:border-[#007acc] focus:outline-none rounded-lg px-3 py-2 text-sm text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#aaaaaa] mb-2">
                  Choose Starting Language & Environment
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
                  <span>Create & Launch Project</span>
                </button>
              </div>
            </div>
          )}

          {/* 2. STARTER TEMPLATES */}
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
                    <span>Use Template</span>
                    <ArrowRight size={13} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 3. CLONE FROM GITHUB */}
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
                  Downloads files and directory structures directly via GitHub API into PocketCode.
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
                <span>{isCloning ? 'Cloning Repository...' : 'Clone & Open Project'}</span>
              </button>
            </div>
          )}

          {/* 4. IMPORT ZIP */}
          {activeTab === 'zip' && (
            <div className="space-y-4 text-center py-6">
              <div className="w-14 h-14 rounded-2xl bg-[#1e1e1e] border border-[#3c3c3c] flex items-center justify-center mx-auto text-[#007acc]">
                <FileArchive size={28} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Import Existing Project (.ZIP)</h3>
                <p className="text-xs text-[#888888] max-w-sm mx-auto mt-1">
                  Upload a zip archive from your computer or phone to unpack and edit full directory structures.
                </p>
              </div>
              <div>
                <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#007acc] hover:bg-[#0062a3] text-white font-semibold text-xs cursor-pointer shadow-md transition-all">
                  <FileArchive size={16} />
                  <span>Choose .ZIP File...</span>
                  <input
                    type="file"
                    accept=".zip"
                    onChange={handleImportZip}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}

          {/* 5. RECENT SAVED PROJECTS */}
          {activeTab === 'recent' && (
            <div className="space-y-2">
              {recentProjects.length === 0 ? (
                <p className="text-xs text-[#777777] text-center py-8">No saved projects yet</p>
              ) : (
                recentProjects.map((proj) => {
                  const isCurrent = proj.id === fileSystemService.getCurrentProjectId();
                  return (
                    <div
                      key={proj.id}
                      onClick={() => handleSwitchProject(proj.id, proj.name)}
                      className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between transition-all ${
                        isCurrent
                          ? 'bg-[#007acc]/20 border-[#007acc] text-white shadow-sm'
                          : 'bg-[#1e1e1e] border-[#333333] hover:border-[#444444] text-[#cccccc]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#2d2d2d] flex items-center justify-center text-sky-400">
                          <FolderGit2 size={16} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{proj.name}</span>
                            {isCurrent && (
                              <span className="text-[10px] bg-[#007acc] text-white px-1.5 py-0.2 rounded font-mono">
                                ACTIVE
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-[#888888] font-mono mt-0.5">
                            {proj.fileCount} files • Modified {new Date(proj.lastModified).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!isCurrent && (
                          <button
                            onClick={(e) => handleDeleteProject(e, proj.id)}
                            className="p-1.5 rounded text-[#888888] hover:text-red-400 hover:bg-[#333333] transition-colors"
                            title="Delete project"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                        <ArrowRight size={14} className="text-[#888888]" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
