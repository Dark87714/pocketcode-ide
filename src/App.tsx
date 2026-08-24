import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { 
  FileItem, TabItem, ActiveSidebarTab, ActiveBottomTab, 
  EditorSettings, DiagnosticProblem 
} from './types';
import { fileSystemService } from './services/fileSystem';
import { themeService } from './services/themeService';
import { universalRunnerService } from './services/universalRunner';
import { formatterService } from './services/formatterService';
import { debuggerService } from './services/debuggerService';
import { projectSettingsService } from './services/projectSettingsService';
import { PROJECT_TEMPLATES } from './services/templates';
import { TopBar } from './components/Header/TopBar';
import { ActivityBar } from './components/Sidebar/ActivityBar';
import { SidebarDrawer } from './components/Sidebar/SidebarDrawer';
import { EditorTabs } from './components/Editor/EditorTabs';
import { Breadcrumbs } from './components/Editor/Breadcrumbs';
import { CodeEditor } from './components/Editor/CodeEditor';
import { TouchFindReplace } from './components/Editor/TouchFindReplace';
import { MobileKeybar } from './components/Editor/MobileKeybar';
import { BottomDrawer } from './components/Panels/BottomDrawer';
import { StatusBar } from './components/Footer/StatusBar';
import { WelcomeTab } from './components/Editor/WelcomeTab';
import { MarkdownPreview } from './components/Editor/MarkdownPreview';

// Fast dynamic imports for heavy modals and viewers
const LivePreview = lazy(() => import('./components/PreviewModal/LivePreview').then(m => ({ default: m.LivePreview })));
const CommandPalette = lazy(() => import('./components/CommandPalette/CommandPalette').then(m => ({ default: m.CommandPalette })));
const QuickOpenModal = lazy(() => import('./components/Modals/QuickOpenModal').then(m => ({ default: m.QuickOpenModal })));
const TemplatesModal = lazy(() => import('./components/Modals/TemplatesModal').then(m => ({ default: m.TemplatesModal })));
const NewProjectModal = lazy(() => import('./components/Modals/NewProjectModal').then(m => ({ default: m.NewProjectModal })));
const FeedbackModal = lazy(() => import('./components/Modals/FeedbackModal').then(m => ({ default: m.FeedbackModal })));
const DiffEditor = lazy(() => import('./components/Editor/DiffEditor').then(m => ({ default: m.DiffEditor })));
const MediaViewer = lazy(() => import('./components/Editor/MediaViewer').then(m => ({ default: m.MediaViewer })));

const DEFAULT_SETTINGS: EditorSettings = {
  fontSize: 14,
  fontFamily: '"Fira Code", Consolas, monospace',
  tabSize: 2,
  wordWrap: 'on',
  minimap: false,
  lineNumbers: 'on',
  theme: 'vscode-dark',
  autoSave: true,
  autoSaveDelay: 1000,
  formatOnSave: true,
  keyboardMode: 'default',
  mobileKeybarVisible: true
};

function findFileInTree(items: FileItem[], id: string): FileItem | undefined {
  for (const item of items) {
    if (item.id === id) return item;
    if (item.children) {
      const found = findFileInTree(item.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

function updateContentInTree(items: FileItem[], id: string, newContent: string): FileItem[] {
  return items.map(item => {
    if (item.id === id) {
      return { ...item, content: newContent, isModified: true };
    }
    if (item.children) {
      return { ...item, children: updateContentInTree(item.children, id, newContent) };
    }
    return item;
  });
}

function isMediaFile(fileName?: string): boolean {
  if (!fileName) return false;
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'mp3', 'wav', 'ogg'].includes(ext);
}

export function App() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [tabs, setTabs] = useState<TabItem[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [activeSidebarTab, setActiveSidebarTab] = useState<ActiveSidebarTab>('explorer');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [activeBottomTab, setActiveBottomTab] = useState<ActiveBottomTab>('terminal');
  const [isBottomDrawerExpanded, setIsBottomDrawerExpanded] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isQuickOpenOpen, setIsQuickOpenOpen] = useState(false);
  const [jumpToLine, setJumpToLine] = useState<number | null>(null);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [settings, setSettings] = useState<EditorSettings>(DEFAULT_SETTINGS);
  const [problems, setProblems] = useState<DiagnosticProblem[]>([]);
  const [outputLogs, setOutputLogs] = useState<string[]>([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, col: 1 });
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [currentProjectName, setCurrentProjectName] = useState(() => fileSystemService.getCurrentProjectName());

  // New Feature States: Split Editor, Touch Find/Replace, Visual Diff, Markdown Preview
  const [isSplitEditor, setIsSplitEditor] = useState(false);
  const [splitActiveTabId, setSplitActiveTabId] = useState<string | null>(null);
  const [isFindReplaceOpen, setIsFindReplaceOpen] = useState(false);
  const [isMarkdownPreviewOpen, setIsMarkdownPreviewOpen] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [diffState, setDiffState] = useState<{
    isOpen: boolean;
    original: string;
    modified: string;
    originalFileName: string;
    modifiedFileName: string;
    language: string;
  }>({
    isOpen: false,
    original: '',
    modified: '',
    originalFileName: '',
    modifiedFileName: '',
    language: 'javascript'
  });

  const editorInstanceRef = useRef<any>(null);
  const monacoInstanceRef = useRef<any>(null);
  const autoSaveTimerRef = useRef<any>(null);

  // Resize listener for responsive layout
  useEffect(() => {
    const handleResize = () => {
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isLandscapePhone = window.innerHeight < 500 && window.innerWidth < 1000;
      const mobile = window.innerWidth < 768 || isLandscapePhone;
      setIsMobile(mobile);
      // Do not force-open sidebar if user is on phone or landscape mode
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize Workspace Files, Tabs, Theme & Settings on Reload
  useEffect(() => {
    const initApp = async () => {
      // 1. Restore saved settings if any
      try {
        const savedSettings = localStorage.getItem('pocketcode_settings_v3');
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          setSettings(parsed);
          if (parsed.theme) {
            themeService.setTheme(parsed.theme);
          }
        } else {
          themeService.applyThemeToDOM(themeService.getCurrentTheme());
        }
      } catch (e) {
        themeService.applyThemeToDOM(themeService.getCurrentTheme());
      }

      // 2. Load workspace files
      const loadedFiles = await fileSystemService.loadWorkspace();
      setFiles(loadedFiles);
      setCurrentProjectName(fileSystemService.getCurrentProjectName());

      // 3. Restore previously open tabs and active file (Strictly deduplicated)
      const savedSession = fileSystemService.getSavedOpenTabs();
      const flat = fileSystemService.getAllFlatFiles();

      if (savedSession.tabs && savedSession.tabs.length > 0) {
        const restoredTabs: TabItem[] = [];
        let targetActiveTabId: string | null = null;
        const seenKeys = new Set<string>();

        savedSession.tabs.forEach(t => {
          const foundFile = flat.find(f => f.id === t.fileId || f.path === t.path);
          if (foundFile && !foundFile.isFolder) {
            const key = foundFile.path || foundFile.id;
            if (!seenKeys.has(key)) {
              seenKeys.add(key);
              const tabId = `tab_${foundFile.id}`;
              restoredTabs.push({
                id: tabId,
                fileId: foundFile.id,
                name: foundFile.name,
                path: foundFile.path,
                language: foundFile.language,
                isModified: false
              });
              if (savedSession.activeFileId === foundFile.id || savedSession.activeFileId === foundFile.path) {
                targetActiveTabId = tabId;
              }
            }
          }
        });

        if (restoredTabs.length > 0) {
          setTabs(restoredTabs);
          setActiveTabId(targetActiveTabId || restoredTabs[0].id);
          return;
        }
      }

      // Fallback: If no previous tabs, open only the main default file
      const defaultFile = flat.find(f => f.name === 'main.py' || f.name === 'index.html' || f.name === 'app.js' || f.name === 'game.js' || f.name === 'Untitled-1.js') || flat[0];
      if (defaultFile && !defaultFile.isFolder) {
        openFile(defaultFile);
      }
    };
    initApp();
  }, []);

  // Save active open tabs session whenever tabs or active tab change
  useEffect(() => {
    if (tabs.length > 0) {
      const currentTab = tabs.find(t => t.id === activeTabId);
      // Deduplicate tabs before saving
      const uniqueTabs: { fileId: string; name: string; path: string; language: string }[] = [];
      const seen = new Set<string>();
      tabs.forEach(t => {
        if (!seen.has(t.path || t.fileId)) {
          seen.add(t.path || t.fileId);
          uniqueTabs.push({ fileId: t.fileId, name: t.name, path: t.path, language: t.language });
        }
      });
      fileSystemService.saveOpenTabs(uniqueTabs, currentTab ? currentTab.fileId : null);
    } else {
      fileSystemService.saveOpenTabs([], null);
    }
  }, [tabs, activeTabId]);

  // Flush to localStorage immediately before browser unload / refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      fileSystemService.saveToLocalStorage();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setIsQuickOpenOpen(prev => !prev);
      } else if (e.key === 'F5') {
        e.preventDefault();
        handleStartDebugging();
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setActiveSidebarTab('search');
        setIsSidebarOpen(true);
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        setActiveSidebarTab('git');
        setIsSidebarOpen(true);
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setActiveSidebarTab('run');
        setIsSidebarOpen(true);
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setActiveSidebarTab('ai');
        setIsSidebarOpen(true);
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setIsMarkdownPreviewOpen(prev => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleCreateUntitled('js');
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveActiveFile();
      } else if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault();
        setIsTerminalOpen(prev => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsSidebarOpen(prev => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsFindReplaceOpen(prev => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
        e.preventDefault();
        handleToggleSplitEditor();
      } else if (e.shiftKey && e.altKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        handleFormatDocument();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [files, activeTabId, isSplitEditor]);

  // Terminal & Workspace Integration Event Listeners
  useEffect(() => {
    const handleOpenFileEvent = (e: Event) => {
      const customEvent = e as CustomEvent<any>;
      if (customEvent.detail) {
        setFiles([...fileSystemService.getFiles()]);
        let targetFile: FileItem | undefined;
        if (typeof customEvent.detail === 'string') {
          targetFile = fileSystemService.getFileByPath(customEvent.detail) || fileSystemService.getAllFlatFiles().find(f => f.name === customEvent.detail);
        } else if (customEvent.detail.id && customEvent.detail.name) {
          targetFile = customEvent.detail;
        } else if (customEvent.detail.path) {
          targetFile = fileSystemService.getFileByPath(customEvent.detail.path) || fileSystemService.getAllFlatFiles().find(f => f.name === customEvent.detail.path);
        }
        if (targetFile && !targetFile.isFolder) {
          openFile(targetFile);
        }
      }
    };

    const handleTogglePreviewEvent = () => {
      setIsPreviewOpen(true);
    };

    const handleWorkspaceChanged = () => {
      setFiles([...fileSystemService.getFiles()]);
      setCurrentProjectName(fileSystemService.getCurrentProjectName());
    };

    window.addEventListener('pocketcode:open-file', handleOpenFileEvent);
    window.addEventListener('pocketcode:toggle-preview', handleTogglePreviewEvent);
    window.addEventListener('pocketcode:workspace-changed', handleWorkspaceChanged);

    return () => {
      window.removeEventListener('pocketcode:open-file', handleOpenFileEvent);
      window.removeEventListener('pocketcode:toggle-preview', handleTogglePreviewEvent);
      window.removeEventListener('pocketcode:workspace-changed', handleWorkspaceChanged);
    };
  }, []);

  const activeTab = tabs.find(t => t.id === activeTabId);
  const activeFile = activeTab ? (findFileInTree(files, activeTab.fileId) || fileSystemService.getFileById(activeTab.fileId)) : undefined;

  const splitActiveTab = tabs.find(t => t.id === splitActiveTabId);
  const splitActiveFile = splitActiveTab ? (findFileInTree(files, splitActiveTab.fileId) || fileSystemService.getFileById(splitActiveTab.fileId)) : undefined;

  const handleCreateUntitled = async (ext = 'js') => {
    const newFile = await fileSystemService.createUntitledFile(ext);
    setFiles([...fileSystemService.getFiles()]);
    openFile(newFile);
  };

  const openFile = (file: FileItem, line?: number) => {
    if (file.isFolder) return;
    if (line) {
      setJumpToLine(line);
    }

    setTabs(prev => {
      const existing = prev.find(t => t.fileId === file.id || t.path === file.path);
      if (existing) {
        setActiveTabId(existing.id);
        return prev;
      }

      const newTab: TabItem = {
        id: `tab_${file.id}`,
        fileId: file.id,
        name: file.name,
        path: file.path,
        language: file.language,
        isModified: file.isModified
      };
      setActiveTabId(newTab.id);
      return [...prev, newTab];
    });
  };

  const closeTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newTabs = tabs.filter(t => t.id !== tabId);
    setTabs(newTabs);

    if (activeTabId === tabId) {
      if (newTabs.length > 0) {
        setActiveTabId(newTabs[newTabs.length - 1].id);
      } else {
        setActiveTabId(null);
      }
    }

    if (splitActiveTabId === tabId) {
      setSplitActiveTabId(newTabs.length > 0 ? newTabs[0].id : null);
    }
  };

  const saveActiveFile = async () => {
    if (!activeFile) return;
    setSaveStatus('saving');
    fileSystemService.updateFileContent(activeFile.id, activeFile.content);
    await fileSystemService.saveWorkspace();
    setSaveStatus('saved');
    setTabs(prev => prev.map(t => t.fileId === activeFile.id ? { ...t, isModified: false } : t));
  };

  const handleEditorChange = (newContent: string) => {
    if (!activeTab || !activeFile) return;

    const currentTabId = activeTabId;
    const currentFileId = activeTab.fileId;

    setFiles(prev => updateContentInTree(prev, currentFileId, newContent));
    fileSystemService.updateFileContent(currentFileId, newContent);

    setTabs(prev => prev.map(t => t.id === currentTabId ? { ...t, isModified: true } : t));

    if (settings.autoSave) {
      setSaveStatus('saving');
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = setTimeout(async () => {
        await fileSystemService.saveWorkspace();
        setSaveStatus('saved');
        setTabs(prev => prev.map(t => t.id === currentTabId ? { ...t, isModified: false } : t));
      }, 350);
    }
  };

  const handleSplitEditorChange = (newContent: string) => {
    if (!splitActiveTab || !splitActiveFile) return;
    setFiles(prev => updateContentInTree(prev, splitActiveTab.fileId, newContent));
    fileSystemService.updateFileContent(splitActiveTab.fileId, newContent);
    setTabs(prev => prev.map(t => t.id === splitActiveTabId ? { ...t, isModified: true } : t));
  };

  const handleCreateFile = async (name: string, isFolder = false, targetFolderId: string | null = null) => {
    if (isFolder) {
      await fileSystemService.createFolder(name, targetFolderId);
    } else {
      const newFile = await fileSystemService.createFile(name, false, targetFolderId);
      openFile(newFile);
    }
    setFiles([...fileSystemService.getFiles()]);
  };

  const handleDeleteFile = async (fileId: string) => {
    await fileSystemService.deleteFile(fileId);
    setFiles([...fileSystemService.getFiles()]);
    setTabs(prev => prev.filter(t => t.fileId !== fileId));
    if (activeTab?.fileId === fileId) {
      setActiveTabId(null);
    }
    if (splitActiveTab?.fileId === fileId) {
      setSplitActiveTabId(null);
    }
  };

  const handleRenameFile = async (fileId: string, newName: string) => {
    await fileSystemService.renameFile(fileId, newName);
    setFiles([...fileSystemService.getFiles()]);
    const file = fileSystemService.getFileById(fileId);
    if (file) {
      setTabs(prev => prev.map(t => t.fileId === fileId ? { ...t, name: newName, path: file.path } : t));
    }
  };

  const handleToggleFolder = (folderId: string) => {
    fileSystemService.toggleFolder(folderId);
    setFiles([...fileSystemService.getFiles()]);
  };

  const handleSelectTemplate = async (template: any) => {
    const templateObj = typeof template === 'string'
      ? (PROJECT_TEMPLATES.find(t => t.id === template) || PROJECT_TEMPLATES[0])
      : template;
    const loadedFiles = await fileSystemService.loadTemplate(templateObj);
    setFiles(loadedFiles);
    setCurrentProjectName(templateObj.name || 'Template Project');
    const flat = fileSystemService.getAllFlatFiles();
    const entry = flat.find(f => f.name === templateObj.entryFile) || flat.find(f => !f.isFolder) || flat[0];
    if (entry && !entry.isFolder) {
      setTabs([]);
      openFile(entry);
    }
  };

  const handleProjectCreated = (projectName: string) => {
    setCurrentProjectName(projectName);
    const loadedFiles = fileSystemService.getFiles();
    setFiles([...loadedFiles]);
    setTabs([]);
    const flat = fileSystemService.getAllFlatFiles();
    const entry = flat.find(f => !f.isFolder) || flat[0];
    if (entry && !entry.isFolder) {
      openFile(entry);
    }
  };

  const handleExportZip = async () => {
    await fileSystemService.downloadProjectZip();
  };

  const handleReplaceInFile = (fileId: string, search: string, replace: string, matchCase: boolean = true, isRegex: boolean = false) => {
    const file = fileSystemService.getFileById(fileId);
    if (!file || file.isFolder) return;
    const currentContent = file.content || '';
    let newContent = currentContent;
    if (isRegex) {
      try {
        const rx = new RegExp(search, matchCase ? 'g' : 'gi');
        newContent = currentContent.replace(rx, replace);
      } catch (e) {
        newContent = currentContent.split(search).join(replace);
      }
    } else if (!matchCase) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      newContent = currentContent.replace(rx, replace);
    } else {
      newContent = currentContent.split(search).join(replace);
    }

    if (activeTab?.fileId === fileId) {
      handleEditorChange(newContent);
    } else {
      setFiles(prev => updateContentInTree(prev, fileId, newContent));
      fileSystemService.updateFileContent(fileId, newContent);
      fileSystemService.saveWorkspace();
    }
  };

  const handleInsertTextToEditor = (text: string) => {
    if (!editorInstanceRef.current) return;
    const editor = editorInstanceRef.current;
    const selection = editor.getSelection();
    const id = { major: 1, minor: 1 };
    const op = { identifier: id, range: selection, text: text, forceMoveMarkers: true };
    editor.executeEdits('mobile-keybar', [op]);
    editor.focus();
  };

  const handleUndo = () => {
    if (editorInstanceRef.current) {
      editorInstanceRef.current.focus();
      editorInstanceRef.current.trigger('keyboard', 'undo', null);
    }
  };

  const handleRedo = () => {
    if (editorInstanceRef.current) {
      editorInstanceRef.current.focus();
      editorInstanceRef.current.trigger('keyboard', 'redo', null);
    }
  };

  const handleMoveCursor = (offset: number) => {
    if (!editorInstanceRef.current) return;
    const editor = editorInstanceRef.current;
    const pos = editor.getPosition();
    if (pos) {
      editor.setPosition({ lineNumber: pos.lineNumber, column: Math.max(1, pos.column + offset) });
      editor.focus();
    }
  };

  const handleFormatDocument = async () => {
    if (!activeFile || !editorInstanceRef.current) return;
    const formatted = await formatterService.formatCode(activeFile.content, activeFile.language, { tabSize: settings.tabSize });
    const model = editorInstanceRef.current.getModel();
    if (model && model.getValue() !== formatted) {
      editorInstanceRef.current.executeEdits('format', [{
        range: model.getFullModelRange(),
        text: formatted
      }]);
    }
  };

  const handleStartDebugging = async () => {
    if (!activeFile) return;
    setActiveSidebarTab('run');
    setIsSidebarOpen(true);
    setIsTerminalOpen(true);
    setActiveBottomTab('output');
    setOutputLogs([`⚡ [Debugger] Initializing interactive debug session for ${activeFile.name}...`]);

    await debuggerService.startDebugging(
      activeFile.path,
      activeFile.content,
      activeFile.language,
      (line, type) => {
        setOutputLogs(prev => [...prev, line]);
      }
    );
  };

  const handleToggleSplitEditor = () => {
    setIsSplitEditor(prev => {
      const next = !prev;
      if (next && tabs.length > 1 && !splitActiveTabId) {
        const secondary = tabs.find(t => t.id !== activeTabId);
        if (secondary) setSplitActiveTabId(secondary.id);
      }
      return next;
    });
  };

  const handleOpenDiff = (fileName: string) => {
    const flat = fileSystemService.getAllFlatFiles();
    const file = flat.find(f => f.name === fileName || f.path === fileName);
    if (!file) return;

    setDiffState({
      isOpen: true,
      original: `// Baseline original commit of ${file.name}\n${file.content}`,
      modified: file.content,
      originalFileName: `${file.name} (HEAD)`,
      modifiedFileName: `${file.name} (Working Tree)`,
      language: file.language
    });
  };

  const handleJumpToLine = (line: number) => {
    if (editorInstanceRef.current) {
      editorInstanceRef.current.revealLineInCenter(line);
      editorInstanceRef.current.setPosition({ lineNumber: line, column: 1 });
      editorInstanceRef.current.focus();
    }
  };

  const handleOpenDiffContent = (original: string, modified: string, fileName: string) => {
    setDiffState({
      isOpen: true,
      original,
      modified,
      originalFileName: `${fileName} (Current)`,
      modifiedFileName: `${fileName} (Proposed)`,
      language: activeFile?.language || 'javascript'
    });
  };

  const handleRunPythonScript = async () => {
    setIsTerminalOpen(true);
    setActiveBottomTab('output');
    const flat = fileSystemService.getAllFlatFiles();
    const pyFile = flat.find(f => f.name.endsWith('.py')) || activeFile;
    if (pyFile) {
      setOutputLogs([`[Running] ${pyFile.name} ...`]);
      window.dispatchEvent(new CustomEvent('pocketcode:terminal-run-command', { detail: `python "${pyFile.path}"` }));
      await universalRunnerService.runFile(pyFile, (line, type) => {
        if (!line || !line.trim()) {
          setOutputLogs(prev => [...prev, line]);
          return;
        }
        let prefix = '';
        if (type === 'stderr') {
          const isWarning = line.includes('Warning') || line.includes('DeprecationWarning');
          if (!line.startsWith('❌') && !line.startsWith('🛡️') && !line.startsWith('⚠️')) {
            prefix = isWarning ? '⚠️ ' : '❌ ';
          }
        } else if (type === 'system') {
          if (!line.startsWith('⚡') && !line.startsWith('🚀') && !line.startsWith('📄') && !line.startsWith('✅') && !line.startsWith('✨')) {
            prefix = '⚡ ';
          }
        }
        setOutputLogs(prev => [...prev, `${prefix}${line}`]);
      });
    }
  };

  const handleRunPreview = async () => {
    if (!activeFile) {
      setIsPreviewOpen(true);
      return;
    }

    const lang = (activeFile.language || '').toLowerCase();
    const ext = activeFile.name.split('.').pop()?.toLowerCase() || '';

    // If web project (HTML / CSS), open live interactive sandbox modal
    if (lang === 'html' || ext === 'html' || ext === 'htm') {
      setIsPreviewOpen(true);
      return;
    }

    // For all other languages (Python, JS, TS, C++, Rust, SQL, Go, Java, Shell), open output tab directly!
    setIsTerminalOpen(true);
    setActiveBottomTab('output');
    setOutputLogs([`[Running] ${activeFile.name} ...`]);

    let cmd = `run "${activeFile.path}"`;
    if (lang === 'python' || ext === 'py') {
      cmd = `python "${activeFile.path}"`;
    } else if (lang === 'javascript' || lang === 'typescript' || ext === 'js' || ext === 'ts' || ext === 'mjs') {
      cmd = `node "${activeFile.path}"`;
    } else if (lang === 'sql' || ext === 'sql') {
      cmd = `sql ${activeFile.content.replace(/\n/g, ' ')}`;
    } else if (lang === 'cpp' || lang === 'c' || ext === 'cpp' || ext === 'c' || ext === 'cc') {
      cmd = `g++ "${activeFile.path}"`;
    } else if (lang === 'rust' || ext === 'rs') {
      cmd = `rustc "${activeFile.path}"`;
    } else if (lang === 'go' || ext === 'go') {
      cmd = `go run "${activeFile.path}"`;
    } else if (lang === 'java' || ext === 'java') {
      cmd = `java "${activeFile.path}"`;
    } else if (lang === 'shell' || lang === 'bash' || ext === 'sh' || ext === 'bash') {
      cmd = `bash "${activeFile.path}"`;
    }

    // Also mirror to terminal
    window.dispatchEvent(new CustomEvent('pocketcode:terminal-run-command', { detail: cmd }));

    // Stream directly to Output panel
    await universalRunnerService.runFile(activeFile, (line, type) => {
      if (!line || !line.trim()) {
        setOutputLogs(prev => [...prev, line]);
        return;
      }
      let prefix = '';
      if (type === 'stderr') {
        const isWarning = line.includes('Warning') || line.includes('DeprecationWarning');
        if (!line.startsWith('❌') && !line.startsWith('🛡️') && !line.startsWith('⚠️')) {
          prefix = isWarning ? '⚠️ ' : '❌ ';
        }
      } else if (type === 'system') {
        if (!line.startsWith('⚡') && !line.startsWith('🚀') && !line.startsWith('📄') && !line.startsWith('✅') && !line.startsWith('✨')) {
          prefix = '⚡ ';
        }
      }
      setOutputLogs(prev => [...prev, `${prefix}${line}`]);
    });
  };

  const handleSelectLanguage = (langId: string) => {
    if (!activeFile) return;
    setFiles(prev => {
      const updateLang = (items: FileItem[]): FileItem[] => items.map(item => {
        if (item.id === activeFile.id) {
          return { ...item, language: langId };
        }
        if (item.children) {
          return { ...item, children: updateLang(item.children) };
        }
        return item;
      });
      return updateLang(prev);
    });
    setTabs(prev => prev.map(t => t.fileId === activeFile.id ? { ...t, language: langId } : t));
    const file = fileSystemService.getFileById(activeFile.id);
    if (file) {
      file.language = langId;
      fileSystemService.saveWorkspace();
    }
  };

  // Find & Replace Helpers for Monaco
  const handleFind = (query: string, matchCase: boolean, isRegex: boolean, forward: boolean) => {
    if (!editorInstanceRef.current || !query) return { current: 0, total: 0 };
    const editor = editorInstanceRef.current;
    const model = editor.getModel();
    if (!model) return { current: 0, total: 0 };

    const matches = model.findMatches(query, false, isRegex, matchCase, null, true);
    if (matches.length === 0) return { current: 0, total: 0 };

    // Move to next match
    const selection = editor.getSelection();
    let targetMatch = matches[0];
    if (selection) {
      const currentPos = selection.getStartPosition();
      if (forward) {
        targetMatch = matches.find((m: any) => m.range.getStartPosition().isBeforeOrEqual(currentPos) === false) || matches[0];
      } else {
        const prevMatches = matches.filter((m: any) => m.range.getStartPosition().isBefore(currentPos));
        targetMatch = prevMatches.length > 0 ? prevMatches[prevMatches.length - 1] : matches[matches.length - 1];
      }
    }

    editor.setSelection(targetMatch.range);
    editor.revealRangeInCenter(targetMatch.range);
    const currentIndex = matches.findIndex((m: any) => m.range.equalsRange(targetMatch.range)) + 1;
    return { current: currentIndex, total: matches.length };
  };

  const handleReplace = (replaceText: string) => {
    if (!editorInstanceRef.current) return;
    const editor = editorInstanceRef.current;
    const selection = editor.getSelection();
    if (selection) {
      editor.executeEdits('touch-replace', [{ range: selection, text: replaceText, forceMoveMarkers: true }]);
    }
  };

  const handleReplaceAll = (findText: string, replaceText: string, matchCase: boolean, isRegex: boolean) => {
    if (!activeFile) return;
    const flag = matchCase ? 'g' : 'gi';
    const pattern = isRegex ? new RegExp(findText, flag) : new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flag);
    const newContent = activeFile.content.replace(pattern, replaceText);
    handleEditorChange(newContent);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#1e1e1e] text-[#cccccc] overflow-hidden">
      {/* Top Action Bar */}
      <TopBar
        onRunPreview={handleRunPreview}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onToggleTerminal={() => setIsTerminalOpen(!isTerminalOpen)}
        onOpenTemplates={() => setIsTemplatesModalOpen(true)}
        onOpenNewProject={() => setIsNewProjectModalOpen(true)}
        onOpenFeedback={() => setIsFeedbackModalOpen(true)}
        onExportZip={handleExportZip}
        onImportZip={() => {}}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onFormatDocument={handleFormatDocument}
        onToggleSplitEditor={handleToggleSplitEditor}
        onToggleFindReplace={() => setIsFindReplaceOpen(!isFindReplaceOpen)}
        isSplitEditor={isSplitEditor}
        saveStatus={saveStatus}
        activeSidebarTab={activeSidebarTab}
        isSidebarOpen={isSidebarOpen}
        isTerminalOpen={isTerminalOpen}
        activeFileName={activeFile?.name}
        projectName={currentProjectName}
      />

      {/* Main Layout Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Desktop / Tablet Side Activity Bar */}
        {!isMobile && (
          <ActivityBar
            activeTab={activeSidebarTab}
            onSelectTab={(tab) => {
              if (activeSidebarTab === tab && isSidebarOpen) {
                setIsSidebarOpen(false);
              } else {
                setActiveSidebarTab(tab);
                setIsSidebarOpen(true);
              }
            }}
            isSidebarOpen={isSidebarOpen}
          />
        )}

        {/* Sidebar Drawer */}
        <SidebarDrawer
          isOpen={isSidebarOpen}
          activeTab={activeSidebarTab}
          files={files}
          activeFileId={activeTab ? activeTab.fileId : null}
          activeFile={activeFile}
          selectedText={selectedText}
          cursorLine={cursorPosition.line}
          diagnostics={problems}
          settings={settings}
          projectName={currentProjectName}
          activeFileContent={activeFile?.content}
          activeFileLanguage={activeFile?.language}
          activeFileName={activeFile?.name}
          onClose={() => setIsSidebarOpen(false)}
          onOpenFile={openFile}
          onCreateFile={handleCreateFile}
          onDeleteFile={handleDeleteFile}
          onRenameFile={handleRenameFile}
          onToggleFolder={handleToggleFolder}
          onOpenTemplates={() => setIsTemplatesModalOpen(true)}
          onOpenNewProject={() => setIsNewProjectModalOpen(true)}
          onExportZip={handleExportZip}
          onReplaceInFile={handleReplaceInFile}
          onStartDebugging={handleStartDebugging}
          onRunPreview={handleRunPreview}
          onRunPython={handleRunPythonScript}
          onOpenTerminal={() => {
            setIsTerminalOpen(true);
            setActiveBottomTab('terminal');
          }}
          onUpdateSettings={(newSet) => {
            setSettings(prev => {
              const updated = { ...prev, ...newSet };
              try {
                localStorage.setItem('pocketcode_settings_v3', JSON.stringify(updated));
              } catch (e) {}
              if (newSet.theme) {
                themeService.setTheme(newSet.theme);
              }
              return updated;
            });
          }}
          onInsertCodeToEditor={handleInsertTextToEditor}
          onReplaceFileContent={handleEditorChange}
          onOpenDiff={handleOpenDiff}
          onOpenDiffContent={handleOpenDiffContent}
          onJumpToLine={handleJumpToLine}
          onFilesImported={() => setFiles([...fileSystemService.getFiles()])}
        />

        {/* Editor & Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden relative bg-[#1e1e1e]">
          {/* Visual Diff View or Normal Editor Area */}
          {diffState.isOpen ? (
            <Suspense fallback={<div className="flex-1 bg-[#1e1e1e]" />}>
              <DiffEditor
                originalContent={diffState.original}
                modifiedContent={diffState.modified}
                originalFileName={diffState.originalFileName}
                modifiedFileName={diffState.modifiedFileName}
                language={diffState.language}
                settings={settings}
                onClose={() => setDiffState(s => ({ ...s, isOpen: false }))}
              />
            </Suspense>
          ) : (
            <div className={`flex-1 flex ${isSplitEditor ? 'flex-col sm:flex-row' : 'flex-col'} overflow-hidden relative`}>
              {/* PRIMARY PANE */}
              <div className="flex-1 flex flex-col overflow-hidden relative">
                {/* Tabs */}
                <EditorTabs
                  tabs={tabs}
                  activeTabId={activeTabId}
                  onSelectTab={setActiveTabId}
                  onCloseTab={closeTab}
                  onNewFile={() => handleCreateUntitled('js')}
                />

                {/* Breadcrumbs */}
                {activeFile && <Breadcrumbs filePath={activeFile.path} />}

                {/* Code Editor / Media Viewer / Welcome View */}
                <div className="flex-1 overflow-hidden relative">
                  {/* Touch Find & Replace Overlay */}
                  <TouchFindReplace
                    isOpen={isFindReplaceOpen}
                    onClose={() => setIsFindReplaceOpen(false)}
                    onFind={handleFind}
                    onReplace={handleReplace}
                    onReplaceAll={handleReplaceAll}
                  />

                  {activeFile ? (
                    isMediaFile(activeFile.name) ? (
                      <Suspense fallback={<div className="flex-1 bg-[#1e1e1e]" />}>
                        <MediaViewer file={activeFile} />
                      </Suspense>
                    ) : activeFile.language === 'markdown' && isMarkdownPreviewOpen ? (
                      <div className="flex-1 flex overflow-hidden h-full">
                        <div className="flex-1 overflow-hidden">
                          <CodeEditor
                            content={activeFile.content}
                            language={activeFile.language}
                            path={activeFile.path}
                            settings={settings}
                            jumpToLine={jumpToLine}
                            onChange={handleEditorChange}
                            onMountInstance={(editor, monaco) => {
                              editorInstanceRef.current = editor;
                              monacoInstanceRef.current = monaco;
                              editor.onDidChangeCursorPosition((e: any) => {
                                setCursorPosition({ line: e.position.lineNumber, col: e.position.column });
                              });
                            }}
                            onDiagnosticsUpdate={() => {}}
                          />
                        </div>
                        <div className="w-px bg-[#333]" />
                        <div className="flex-1 overflow-hidden">
                          <MarkdownPreview
                            content={activeFile.content}
                            fileName={activeFile.name}
                          />
                        </div>
                      </div>
                    ) : (
                      <CodeEditor
                        content={activeFile.content}
                        language={activeFile.language}
                        path={activeFile.path}
                        settings={settings}
                        jumpToLine={jumpToLine}
                        onChange={handleEditorChange}
                        onMountInstance={(editor, monaco) => {
                          editorInstanceRef.current = editor;
                          monacoInstanceRef.current = monaco;
                          editor.onDidChangeCursorPosition((e: any) => {
                            setCursorPosition({ line: e.position.lineNumber, col: e.position.column });
                          });
                          editor.onDidChangeCursorSelection((e: any) => {
                            const model = editor.getModel();
                            if (model && !e.selection.isEmpty()) {
                              setSelectedText(model.getValueInRange(e.selection));
                            } else {
                              setSelectedText('');
                            }
                          });
                        }}
                        onDiagnosticsUpdate={(markers) => {
                          const mapped: DiagnosticProblem[] = markers.map((m: any, i: number) => ({
                            id: `prob_${i}`,
                            fileId: activeFile.id,
                            fileName: activeFile.name,
                            message: m.message,
                            severity: m.severity === 8 ? 'error' : m.severity === 4 ? 'warning' : 'info',
                            line: m.startLineNumber,
                            column: m.startColumn
                          }));
                          setProblems(mapped);
                        }}
                      />
                    )
                  ) : (
                    <WelcomeTab
                      onNewFile={() => handleCreateUntitled('js')}
                      onOpenTemplates={() => setIsTemplatesModalOpen(true)}
                      onOpenNewProject={() => setIsNewProjectModalOpen(true)}
                      onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
                      onOpenTerminal={() => {
                        setIsTerminalOpen(true);
                        setActiveBottomTab('terminal');
                      }}
                    />
                  )}
                </div>
              </div>

              {/* SECONDARY PANE (Split View) */}
              {isSplitEditor && (
                <div className="flex-1 flex flex-col overflow-hidden border-t sm:border-t-0 sm:border-l border-[#333333] relative bg-[#181818]">
                  <EditorTabs
                    tabs={tabs}
                    activeTabId={splitActiveTabId || activeTabId}
                    onSelectTab={setSplitActiveTabId}
                    onCloseTab={closeTab}
                    onNewFile={() => handleCreateUntitled('js')}
                  />
                  <div className="flex-1 overflow-hidden relative">
                    {splitActiveFile ? (
                      isMediaFile(splitActiveFile.name) ? (
                        <Suspense fallback={<div className="flex-1 bg-[#1e1e1e]" />}>
                          <MediaViewer file={splitActiveFile} />
                        </Suspense>
                      ) : (
                        <CodeEditor
                          content={splitActiveFile.content}
                          language={splitActiveFile.language}
                          path={`split_${splitActiveFile.path}`}
                          settings={settings}
                          onChange={handleSplitEditorChange}
                        />
                      )
                    ) : (
                      <div className="p-8 text-center text-[#858585] text-xs">
                        Select a file from tabs above for side-by-side editing.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mobile Accessory Coding Toolbar */}
          {settings.mobileKeybarVisible && !diffState.isOpen && (
            <MobileKeybar
              onInsertText={handleInsertTextToEditor}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onMoveCursor={handleMoveCursor}
              onFormat={handleFormatDocument}
              onToggleFind={() => setIsFindReplaceOpen(!isFindReplaceOpen)}
              language={activeFile?.language}
            />
          )}

          {/* Bottom Drawer (Terminal, Problems, Output) */}
          <BottomDrawer
            isOpen={isTerminalOpen}
            activeTab={activeBottomTab}
            problems={problems}
            logs={outputLogs}
            isExpanded={isBottomDrawerExpanded}
            onSelectTab={setActiveBottomTab}
            onToggleExpand={() => setIsBottomDrawerExpanded(!isBottomDrawerExpanded)}
            onClose={() => setIsTerminalOpen(false)}
            onClearLogs={() => setOutputLogs([])}
            onJumpToLine={handleJumpToLine}
          />
        </div>
      </div>

      {/* VS Code Unified Status Bar */}
      <StatusBar
        currentLanguage={activeFile?.language}
        cursorPosition={cursorPosition}
        problems={problems}
        branch="main"
        onOpenTerminal={() => {
          setIsTerminalOpen(true);
          setActiveBottomTab('problems');
        }}
        onSelectLanguage={handleSelectLanguage}
        onToggleMarkdownPreview={() => setIsMarkdownPreviewOpen(prev => !prev)}
        isMarkdownPreviewOpen={isMarkdownPreviewOpen}
      />

      {/* Mobile Bottom Navigation Bar */}
      {isMobile && (
        <ActivityBar
          activeTab={activeSidebarTab}
          onSelectTab={(tab) => {
            if (activeSidebarTab === tab && isSidebarOpen) {
              setIsSidebarOpen(false);
            } else {
              setActiveSidebarTab(tab);
              setIsSidebarOpen(true);
            }
          }}
          isSidebarOpen={isSidebarOpen}
          isMobileBottomNav={true}
        />
      )}

      {/* Live Preview Modal */}
      {isPreviewOpen && (
        <Suspense fallback={null}>
          <LivePreview
            isOpen={isPreviewOpen}
            files={files}
            onClose={() => setIsPreviewOpen(false)}
          />
        </Suspense>
      )}

      {/* Command Palette */}
      {isCommandPaletteOpen && (
        <Suspense fallback={null}>
          <CommandPalette
            isOpen={isCommandPaletteOpen}
            files={files}
            onClose={() => setIsCommandPaletteOpen(false)}
            onNewFile={() => handleCreateUntitled('js')}
            onRunPreview={handleRunPreview}
            onOpenTerminal={() => {
              setIsTerminalOpen(true);
              setActiveBottomTab('terminal');
            }}
            onOpenTemplates={() => setIsTemplatesModalOpen(true)}
            onOpenNewProject={() => setIsNewProjectModalOpen(true)}
            onOpenFile={openFile}
            onExportZip={handleExportZip}
            onToggleMinimap={() => setSettings(s => ({ ...s, minimap: !s.minimap }))}
            onToggleWordWrap={() => setSettings(s => ({ ...s, wordWrap: s.wordWrap === 'on' ? 'off' : 'on' }))}
            onSwitchTheme={(themeId) => setSettings(s => ({ ...s, theme: themeId }))}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onFormatDocument={handleFormatDocument}
            onToggleSplitEditor={handleToggleSplitEditor}
            onToggleFindReplace={() => setIsFindReplaceOpen(!isFindReplaceOpen)}

            onOpenGit={() => {
              setActiveSidebarTab('git');
              setIsSidebarOpen(true);
            }}
            onRunPython={handleRunPythonScript}
          />
        </Suspense>
      )}

      {/* Quick Open Modal (Ctrl+P) */}
      {isQuickOpenOpen && (
        <Suspense fallback={null}>
          <QuickOpenModal
            isOpen={isQuickOpenOpen}
            onClose={() => setIsQuickOpenOpen(false)}
            onOpenFile={(file, line) => openFile(file, line)}
            activeFile={activeFile}
          />
        </Suspense>
      )}

      {/* Templates Modal */}
      {isTemplatesModalOpen && (
        <Suspense fallback={null}>
          <TemplatesModal
            isOpen={isTemplatesModalOpen}
            onClose={() => setIsTemplatesModalOpen(false)}
            onSelectTemplate={handleSelectTemplate}
          />
        </Suspense>
      )}

      {isFeedbackModalOpen && (
        <Suspense fallback={null}>
          <FeedbackModal
            isOpen={isFeedbackModalOpen}
            onClose={() => setIsFeedbackModalOpen(false)}
          />
        </Suspense>
      )}

      {/* Start New Project Modal */}
      {isNewProjectModalOpen && (
        <Suspense fallback={null}>
          <NewProjectModal
            isOpen={isNewProjectModalOpen}
            onClose={() => setIsNewProjectModalOpen(false)}
            onProjectCreated={handleProjectCreated}
          />
        </Suspense>
      )}
    </div>
  );
}
export default App;
