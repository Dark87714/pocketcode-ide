import { get, set } from 'idb-keyval';
import JSZip from 'jszip';
import { FileItem, ProjectTemplate, ProjectMetadata } from '../types';
import { PROJECT_TEMPLATES } from './templates';

const STORAGE_KEY = 'pocketcode_workspace_files_v3';
const BACKUP_STORAGE_KEY = 'pocketcode_workspace_backup_v3';
const TABS_STORAGE_KEY = 'pocketcode_open_tabs_v3';
const ACTIVE_TAB_STORAGE_KEY = 'pocketcode_active_tab_v3';
const PROJECTS_INDEX_KEY = 'pocketcode_projects_index_v3';
const ACTIVE_PROJECT_ID_KEY = 'pocketcode_active_project_id_v3';
const ACTIVE_PROJECT_NAME_KEY = 'pocketcode_active_project_name_v3';

export function getLanguageFromFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'js':
    case 'jsx':
    case 'mjs':
      return 'javascript';
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'html':
    case 'htm':
      return 'html';
    case 'css':
      return 'css';
    case 'json':
      return 'json';
    case 'py':
      return 'python';
    case 'md':
    case 'markdown':
      return 'markdown';
    case 'sql':
      return 'sql';
    case 'rs':
      return 'rust';
    case 'go':
      return 'go';
    case 'cpp':
    case 'cc':
    case 'c':
    case 'h':
    case 'hpp':
      return 'cpp';
    case 'java':
      return 'java';
    case 'sh':
    case 'bash':
      return 'shell';
    case 'yaml':
    case 'yml':
      return 'yaml';
    case 'xml':
    case 'svg':
      return 'xml';
    default:
      return 'plaintext';
  }
}

export class FileSystemService {
  private files: FileItem[] = [];
  private currentProjectId = 'default_project';
  private currentProjectName = 'My Pocket Workspace';
  private untitledCounter = 1;

  async loadWorkspace(): Promise<FileItem[]> {
    // 1. Check active project ID and active project name
    const activeId = localStorage.getItem(ACTIVE_PROJECT_ID_KEY) || 'default_project';
    this.currentProjectId = activeId;

    // Instantly restore saved project name from localStorage cache
    const savedName = localStorage.getItem(`${ACTIVE_PROJECT_NAME_KEY}_${activeId}`) || (activeId === 'default_project' ? localStorage.getItem(ACTIVE_PROJECT_NAME_KEY) : null);
    if (savedName && savedName.trim()) {
      this.currentProjectName = savedName.trim();
    }

    const projectStorageKey = `${STORAGE_KEY}_${activeId}`;

    // 2. Read from localStorage synchronous cache first for instant 0ms startup
    try {
      const backupJson = localStorage.getItem(`${BACKUP_STORAGE_KEY}_${activeId}`) || (activeId === 'default_project' ? localStorage.getItem(BACKUP_STORAGE_KEY) : null);
      if (backupJson) {
        const backup = JSON.parse(backupJson);
        if (Array.isArray(backup) && backup.length > 0) {
          const { files: migrated } = this.migrateWorkspaceData(backup);
          this.files = migrated;
          this.syncProjectsIndex().catch(() => {});
          return this.files;
        }
      }
    } catch (e) {}

    // 3. Try IndexedDB if localStorage was not cached
    try {
      const stored = await get<FileItem[]>(projectStorageKey);
      if (stored && Array.isArray(stored) && stored.length > 0) {
        const { files: migrated } = this.migrateWorkspaceData(stored);
        this.files = migrated;
        this.saveToLocalStorage();
        this.syncProjectsIndex().catch(() => {});
        return this.files;
      }
    } catch (e) {
      console.warn('Failed to load from IndexedDB:', e);
    }

    // 4. Try legacy storage keys (v2, v1) for cross-version data migration ONLY for default_project
    if (activeId === 'default_project') {
      try {
        const legacyKeys = [
          STORAGE_KEY,
          'pocketcode_workspace_files_v2',
          'pocketcode_workspace_files',
          'vscode_mobile_files_v1'
        ];
        for (const key of legacyKeys) {
          const legacyStored = await get<any[]>(key);
          if (legacyStored && Array.isArray(legacyStored) && legacyStored.length > 0) {
            const { files: migrated } = this.migrateWorkspaceData(legacyStored);
            this.files = migrated;
            await this.saveWorkspace(true);
            await this.syncProjectsIndex();
            return this.files;
          }
        }
      } catch (e) {}
    }

    // 5. Default initial workspace
    const initialUntitled: FileItem = {
      id: `file_untitled_${Date.now()}`,
      name: 'Untitled-1.js',
      path: 'Untitled-1.js',
      content: '// Welcome to PocketCode (VS Code Mobile)\n// Start writing code directly here, or start a New Project from the menu.\n\nconsole.log("Hello, World!");\n',
      language: 'javascript',
      isFolder: false
    };
    this.files = [initialUntitled];
    await this.saveWorkspace(true);
    await this.syncProjectsIndex();
    return this.files;
  }

  /**
   * Workspace Data Migration & Self-Repair Framework (BUG-010)
   */
  migrateWorkspaceData(rawFiles: any[]): { files: FileItem[]; repairedCount: number } {
    let repairedCount = 0;

    const sanitizeNode = (item: any): FileItem => {
      const isFolder = Boolean(item.isFolder);
      const name = String(item.name || (isFolder ? 'folder' : 'untitled.txt'));
      const path = String(item.path || name);
      const id = String(item.id || `file_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
      const language = item.language || getLanguageFromFilename(name);
      const content = typeof item.content === 'string' ? item.content : '';

      const node: FileItem = {
        id,
        name,
        path,
        content,
        language,
        isFolder
      };

      if (item.parentId) node.parentId = item.parentId;
      if (typeof item.isExpanded === 'boolean') node.isExpanded = item.isExpanded;
      if (typeof item.isModified === 'boolean') node.isModified = item.isModified;

      if (isFolder && Array.isArray(item.children)) {
        node.children = item.children.map((c: any) => {
          c.parentId = id;
          return sanitizeNode(c);
        });
      }

      if (!item.id || !item.language || (isFolder && !node.children)) {
        repairedCount++;
      }

      return node;
    };

    const sanitizedFiles = Array.isArray(rawFiles)
      ? rawFiles.map(f => sanitizeNode(f))
      : [];

    return { files: sanitizedFiles, repairedCount };
  }

  getCurrentProjectId(): string {
    return this.currentProjectId;
  }

  getCurrentProjectName(): string {
    return this.currentProjectName;
  }

  setCurrentProjectName(name: string): void {
    const clean = name.trim();
    if (!clean) return;
    this.currentProjectName = clean;
    try {
      localStorage.setItem(`${ACTIVE_PROJECT_NAME_KEY}_${this.currentProjectId}`, clean);
      localStorage.setItem(ACTIVE_PROJECT_NAME_KEY, clean);
    } catch (e) {}
    this.syncProjectsIndex().catch(() => {});
  }

  async listProjects(): Promise<ProjectMetadata[]> {
    try {
      const stored = await get<ProjectMetadata[]>(PROJECTS_INDEX_KEY);
      if (stored && Array.isArray(stored)) {
        return stored;
      }
    } catch (e) {}

    return [
      {
        id: this.currentProjectId,
        name: this.currentProjectName,
        createdAt: Date.now(),
        lastModified: Date.now(),
        fileCount: this.getAllFlatFiles().length,
        description: 'Active Workspace'
      }
    ];
  }

  async syncProjectsIndex(): Promise<void> {
    try {
      const projects = await this.listProjects();
      const existing = projects.find(p => p.id === this.currentProjectId);
      const flatCount = this.getAllFlatFiles().length;

      if (existing) {
        existing.lastModified = Date.now();
        existing.fileCount = flatCount;
        if (this.currentProjectName && this.currentProjectName !== 'My Pocket Workspace' && this.currentProjectName !== 'New Project') {
          existing.name = this.currentProjectName;
        } else if (existing.name) {
          this.currentProjectName = existing.name;
        }
      } else {
        projects.unshift({
          id: this.currentProjectId,
          name: this.currentProjectName,
          createdAt: Date.now(),
          lastModified: Date.now(),
          fileCount: flatCount,
          description: 'Custom Project'
        });
      }
      await set(PROJECTS_INDEX_KEY, projects);
      localStorage.setItem(`${ACTIVE_PROJECT_NAME_KEY}_${this.currentProjectId}`, this.currentProjectName);
      localStorage.setItem(ACTIVE_PROJECT_NAME_KEY, this.currentProjectName);
    } catch (e) {}
  }

  /**
   * Create a fresh new project (blank or from template)
   */
  async createNewProject(
    name: string,
    templateId?: string,
    initialLanguage: string = 'javascript'
  ): Promise<{ projectId: string; files: FileItem[] }> {
    // Flush current project edits before switching to new project
    await this.saveWorkspace(true);

    const projectId = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const cleanName = name.trim() || 'New Project';
    this.currentProjectId = projectId;
    this.currentProjectName = cleanName;
    try {
      localStorage.setItem(ACTIVE_PROJECT_ID_KEY, projectId);
      localStorage.setItem(ACTIVE_PROJECT_NAME_KEY, cleanName);
      localStorage.setItem(`${ACTIVE_PROJECT_NAME_KEY}_${projectId}`, cleanName);
    } catch (e) {}

    if (templateId) {
      const template = PROJECT_TEMPLATES.find(t => t.id === templateId) || PROJECT_TEMPLATES[0];
      this.files = this.createFilesFromTemplate(template);
    } else {
      const extMap: Record<string, string> = {
        javascript: 'js',
        typescript: 'ts',
        python: 'py',
        html: 'html',
        css: 'css',
        cpp: 'cpp',
        rust: 'rs',
        go: 'go',
        java: 'java',
        sql: 'sql'
      };
      const ext = extMap[initialLanguage] || 'js';
      const starterFile: FileItem = {
        id: `file_${Date.now()}_main`,
        name: ext === 'py' ? 'main.py' : ext === 'html' ? 'index.html' : `main.${ext}`,
        path: ext === 'py' ? 'main.py' : ext === 'html' ? 'index.html' : `main.${ext}`,
        content: ext === 'py' 
          ? `# ${name}\ndef main():\n    print("Hello from ${name}!")\n\nif __name__ == "__main__":\n    main()\n`
          : ext === 'html'
          ? `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>${name}</title>\n</head>\n<body>\n  <h1>${name}</h1>\n</body>\n</html>`
          : `// ${name}\nconsole.log("Hello from ${name}!");\n`,
        language: initialLanguage,
        isFolder: false
      };
      this.files = [starterFile];
    }

    await this.saveWorkspace(true);
    await this.syncProjectsIndex();
    return { projectId, files: this.files };
  }

  /**
   * Switch between saved projects
   */
  async switchProject(projectId: string): Promise<FileItem[]> {
    if (this.currentProjectId === projectId) {
      return this.files;
    }

    // Flush current project edits before switching
    await this.saveWorkspace(true);

    this.currentProjectId = projectId;
    localStorage.setItem(ACTIVE_PROJECT_ID_KEY, projectId);

    const projects = await this.listProjects();
    const proj = projects.find(p => p.id === projectId);
    if (proj) {
      this.currentProjectName = proj.name;
      try {
        localStorage.setItem(ACTIVE_PROJECT_NAME_KEY, proj.name);
        localStorage.setItem(`${ACTIVE_PROJECT_NAME_KEY}_${projectId}`, proj.name);
      } catch (e) {}
    }

    const projectStorageKey = `${STORAGE_KEY}_${projectId}`;
    try {
      const stored = await get<FileItem[]>(projectStorageKey);
      if (stored && Array.isArray(stored) && stored.length > 0) {
        this.files = stored;
        return this.files;
      }
    } catch (e) {}

    // Fallback: check localStorage project-specific backup
    try {
      const backupJson = localStorage.getItem(`${BACKUP_STORAGE_KEY}_${projectId}`);
      if (backupJson) {
        const backup = JSON.parse(backupJson);
        if (Array.isArray(backup) && backup.length > 0) {
          const { files: migrated } = this.migrateWorkspaceData(backup);
          this.files = migrated;
          return this.files;
        }
      }
    } catch (e) {}

    return this.loadWorkspace();
  }

  /**
   * Rename a saved project
   */
  async renameProject(projectId: string, newName: string): Promise<void> {
    const cleanName = newName.trim();
    if (!cleanName) return;

    if (this.currentProjectId === projectId) {
      this.currentProjectName = cleanName;
      try {
        localStorage.setItem(ACTIVE_PROJECT_NAME_KEY, cleanName);
        localStorage.setItem(`${ACTIVE_PROJECT_NAME_KEY}_${projectId}`, cleanName);
      } catch (e) {}
    }

    const projects = await this.listProjects();
    const existing = projects.find(p => p.id === projectId);
    if (existing) {
      existing.name = cleanName;
      existing.lastModified = Date.now();
      await set(PROJECTS_INDEX_KEY, projects);
    }
  }

  /**
   * Duplicate an existing project
   */
  async duplicateProject(projectId: string): Promise<{ projectId: string; files: FileItem[] }> {
    // Flush current project first
    await this.saveWorkspace(true);

    const projects = await this.listProjects();
    const existing = projects.find(p => p.id === projectId);
    const baseName = existing ? existing.name : 'Project';
    const newName = `${baseName} (Copy)`;

    let sourceFiles: FileItem[] = [];
    if (projectId === this.currentProjectId) {
      sourceFiles = JSON.parse(JSON.stringify(this.files));
    } else {
      const stored = await get<FileItem[]>(`${STORAGE_KEY}_${projectId}`);
      sourceFiles = stored ? JSON.parse(JSON.stringify(stored)) : [];
    }

    const newProjectId = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    this.currentProjectId = newProjectId;
    this.currentProjectName = newName;
    this.files = sourceFiles;
    try {
      localStorage.setItem(ACTIVE_PROJECT_ID_KEY, newProjectId);
      localStorage.setItem(ACTIVE_PROJECT_NAME_KEY, newName);
      localStorage.setItem(`${ACTIVE_PROJECT_NAME_KEY}_${newProjectId}`, newName);
    } catch (e) {}

    await this.saveWorkspace(true);
    await this.syncProjectsIndex();
    return { projectId: newProjectId, files: this.files };
  }

  /**
   * Delete a project
   */
  async deleteProject(projectId: string): Promise<void> {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }

    try {
      const projects = await this.listProjects();
      const filtered = projects.filter(p => p.id !== projectId);
      await set(PROJECTS_INDEX_KEY, filtered);
      await set(`${STORAGE_KEY}_${projectId}`, null);
      localStorage.removeItem(`${BACKUP_STORAGE_KEY}_${projectId}`);
      localStorage.removeItem(`${ACTIVE_PROJECT_NAME_KEY}_${projectId}`);

      if (this.currentProjectId === projectId) {
        if (filtered.length > 0) {
          await this.switchProject(filtered[0].id);
        } else {
          await this.createNewProject('My Pocket Workspace');
        }
      }
    } catch (e) {}
  }

  /**
   * Clone a public GitHub repository
   */
  async cloneGitRepository(
    repoUrl: string,
    onProgress?: (text: string) => void
  ): Promise<{ projectId: string; files: FileItem[] }> {
    onProgress?.('Parsing GitHub repository URL...');
    const cleanUrl = repoUrl.trim().replace(/\.git$/i, '').replace(/\/+$/, '');
    const match = cleanUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      throw new Error('Please enter a valid GitHub repository URL (e.g. https://github.com/owner/repo)');
    }

    const owner = match[1];
    const repo = match[2];
    const projectName = repo;

    onProgress?.(`Fetching directory tree for ${owner}/${repo}...`);
    // Try main branch first, then master
    let treeData: any = null;
    try {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`);
      if (res.ok) {
        treeData = await res.json();
      } else {
        const res2 = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/master?recursive=1`);
        if (res2.ok) {
          treeData = await res2.json();
        }
      }
    } catch (err: any) {
      throw new Error(`Failed to connect to GitHub API: ${err.message}`);
    }

    if (!treeData || !treeData.tree || !Array.isArray(treeData.tree)) {
      throw new Error(`Could not load files from ${owner}/${repo}. Check if repo is public.`);
    }

    const blobNodes = treeData.tree.filter((node: any) => node.type === 'blob');
    if (blobNodes.length > 30) {
      onProgress?.(`⚠️ Large repository (${blobNodes.length} files). Fetching first 30 files...`);
    } else {
      onProgress?.(`Downloading ${blobNodes.length} files from repository...`);
    }
    const newRoot: FileItem[] = [];
    const filesToFetch = blobNodes.slice(0, 30);

    for (let i = 0; i < filesToFetch.length; i++) {
      const node = filesToFetch[i];
      const filePath = node.path;
      onProgress?.(`Downloading [${i + 1}/${filesToFetch.length}] ${filePath}...`);

      let fileContent = '';
      try {
        const rawRes = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${filePath}`);
        if (rawRes.ok) {
          fileContent = await rawRes.text();
        }
      } catch (e) {}

      // Add to tree hierarchy
      const parts = filePath.split('/').filter(Boolean);
      let currentChildren = newRoot;
      let currentPath = '';

      for (let p = 0; p < parts.length; p++) {
        const part = parts[p];
        const isLast = p === parts.length - 1;
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        if (isLast) {
          currentChildren.push({
            id: `file_${currentPath.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
            name: part,
            path: currentPath,
            content: fileContent,
            language: getLanguageFromFilename(part),
            isFolder: false
          });
        } else {
          let folder = currentChildren.find(item => item.isFolder && item.name === part);
          if (!folder) {
            folder = {
              id: `folder_${currentPath.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
              name: part,
              path: currentPath,
              content: '',
              language: '',
              isFolder: true,
              isExpanded: true,
              children: []
            };
            currentChildren.push(folder);
          }
          if (!folder.children) folder.children = [];
          currentChildren = folder.children;
        }
      }
    }

    await this.saveWorkspace(true);
    const projectId = `proj_gh_${Date.now()}`;
    this.currentProjectId = projectId;
    this.currentProjectName = projectName;
    this.files = newRoot;
    localStorage.setItem(ACTIVE_PROJECT_ID_KEY, projectId);
    await this.saveWorkspace(true);
    await this.syncProjectsIndex();
    onProgress?.(`✅ Successfully cloned ${projectName}!`);

    return { projectId, files: this.files };
  }

  async createUntitledFile(customExtension = 'js'): Promise<FileItem> {
    const filename = `Untitled-${this.untitledCounter++}.${customExtension}`;
    const newFile: FileItem = {
      id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: filename,
      path: filename,
      content: '',
      language: getLanguageFromFilename(filename),
      isFolder: false
    };
    this.files.push(newFile);
    await this.saveWorkspace();
    return newFile;
  }

  private saveTimeout: any = null;

  async saveWorkspace(immediate: boolean = false): Promise<void> {
    const targetProjectId = this.currentProjectId;
    const targetFiles = this.files;

    this.saveToLocalStorage();

    const doSave = async () => {
      const projectStorageKey = `${STORAGE_KEY}_${targetProjectId}`;
      try {
        await set(projectStorageKey, targetFiles);
      } catch (e) {
        console.error('Failed to save to IndexedDB:', e);
      }
    };

    if (immediate) {
      if (this.saveTimeout) {
        clearTimeout(this.saveTimeout);
        this.saveTimeout = null;
      }
      await doSave();
    } else {
      if (this.saveTimeout) clearTimeout(this.saveTimeout);
      this.saveTimeout = setTimeout(() => {
        this.saveTimeout = null;
        doSave();
      }, 50);
    }
  }

  saveToLocalStorage(): void {
    try {
      localStorage.setItem(`${BACKUP_STORAGE_KEY}_${this.currentProjectId}`, JSON.stringify(this.files));
      if (this.currentProjectName) {
        localStorage.setItem(`${ACTIVE_PROJECT_NAME_KEY}_${this.currentProjectId}`, this.currentProjectName);
        localStorage.setItem(ACTIVE_PROJECT_NAME_KEY, this.currentProjectName);
      }
      localStorage.setItem(ACTIVE_PROJECT_ID_KEY, this.currentProjectId);
    } catch (e) {}
  }

  createFilesFromTemplate(template: ProjectTemplate): FileItem[] {
    const rootItems: FileItem[] = [];

    Object.entries(template.files).forEach(([filepath, content]) => {
      const parts = filepath.split('/').filter(Boolean);
      let currentChildren = rootItems;
      let currentPath = '';

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLast = i === parts.length - 1;
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        if (isLast) {
          currentChildren.push({
            id: `file_${currentPath.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
            name: part,
            path: currentPath,
            content: content,
            language: getLanguageFromFilename(part),
            isFolder: false
          });
        } else {
          let existingFolder = currentChildren.find(item => item.isFolder && item.name === part);
          if (!existingFolder) {
            existingFolder = {
              id: `folder_${currentPath.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
              name: part,
              path: currentPath,
              content: '',
              language: '',
              isFolder: true,
              isExpanded: true,
              children: []
            };
            currentChildren.push(existingFolder);
          }
          if (!existingFolder.children) {
            existingFolder.children = [];
          }
          currentChildren = existingFolder.children;
        }
      }
    });

    return rootItems;
  }

  async loadTemplate(template: string | ProjectTemplate): Promise<FileItem[]> {
    const templateObj = typeof template === 'string'
      ? (PROJECT_TEMPLATES.find(t => t.id === template) || PROJECT_TEMPLATES[0])
      : template;
    this.files = this.createFilesFromTemplate(templateObj);
    await this.saveWorkspace(true);
    return this.files;
  }

  getFiles(): FileItem[] {
    return this.files;
  }

  getFileById(id: string): FileItem | undefined {
    const findInTree = (items: FileItem[]): FileItem | undefined => {
      for (const item of items) {
        if (item.id === id) return item;
        if (item.children) {
          const res = findInTree(item.children);
          if (res) return res;
        }
      }
      return undefined;
    };
    return findInTree(this.files);
  }

  getFileByPath(path: string): FileItem | undefined {
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const findInTree = (items: FileItem[]): FileItem | undefined => {
      for (const item of items) {
        if (item.path === cleanPath || item.path === path) return item;
        if (item.children) {
          const res = findInTree(item.children);
          if (res) return res;
        }
      }
      return undefined;
    };
    return findInTree(this.files);
  }

  async createFile(
    rawPath: string,
    isFolder: boolean = false,
    targetFolderId: string | null = null,
    initialContent: string = ''
  ): Promise<FileItem> {
    const cleanInput = rawPath.replace(/^[/\\]+/, '').replace(/[/\\]+$/, '');
    if (!cleanInput) {
      throw new Error('Invalid file or folder path');
    }

    let targetArray = this.files;
    let parentPath = '';

    if (targetFolderId) {
      const targetFolder = this.getFileById(targetFolderId);
      if (targetFolder && targetFolder.isFolder) {
        if (!targetFolder.children) targetFolder.children = [];
        targetArray = targetFolder.children;
        parentPath = targetFolder.path;
        targetFolder.isExpanded = true;
      }
    }

    // If cleanInput starts with parentPath, strip it so we don't duplicate path hierarchy
    let relativePath = cleanInput;
    if (parentPath && (relativePath === parentPath || relativePath.startsWith(parentPath + '/'))) {
      relativePath = relativePath.slice(parentPath.length).replace(/^[/\\]+/, '');
    }

    const parts = relativePath.split(/[/\\]+/).filter(Boolean);
    if (parts.length === 0) {
      throw new Error('Invalid file or folder path');
    }

    let currentChildren = targetArray;
    let accumulatedPath = parentPath;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      accumulatedPath = accumulatedPath ? `${accumulatedPath}/${part}` : part;

      if (isLast) {
        const newItem: FileItem = {
          id: `${isFolder ? 'folder' : 'file'}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: part,
          path: accumulatedPath,
          content: isFolder ? '' : initialContent,
          language: isFolder ? '' : getLanguageFromFilename(part),
          isFolder,
          isExpanded: isFolder ? true : undefined,
          children: isFolder ? [] : undefined,
          parentId: targetFolderId
        };
        currentChildren.push(newItem);
        this.saveWorkspace(false);
        return newItem;
      } else {
        let existing = currentChildren.find(item => item.isFolder && item.name === part);
        if (!existing) {
          existing = {
            id: `folder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: part,
            path: accumulatedPath,
            content: '',
            language: '',
            isFolder: true,
            isExpanded: true,
            children: []
          };
          currentChildren.push(existing);
        }
        if (!existing.children) existing.children = [];
        existing.isExpanded = true;
        currentChildren = existing.children;
      }
    }

    return currentChildren[currentChildren.length - 1];
  }

  async createFolder(rawPath: string, targetFolderId: string | null = null): Promise<FileItem> {
    return this.createFile(rawPath, true, targetFolderId, '');
  }

  async toggleFolder(folderId: string): Promise<boolean> {
    return this.toggleFolderExpand(folderId);
  }

  async toggleFolderExpand(folderId: string): Promise<boolean> {
    const folder = this.getFileById(folderId);
    if (folder && folder.isFolder) {
      folder.isExpanded = !folder.isExpanded;
      await this.saveWorkspace();
      return !!folder.isExpanded;
    }
    return false;
  }

  async updateFileContent(id: string, content: string): Promise<void> {
    const file = this.getFileById(id);
    if (file && !file.isFolder) {
      file.content = content;
      file.isModified = true;
      await this.saveWorkspace();
    }
  }

  async renameFile(id: string, newName: string): Promise<void> {
    const file = this.getFileById(id);
    if (file) {
      file.name = newName;
      const parts = file.path.split('/');
      parts[parts.length - 1] = newName;
      const newPath = parts.join('/');
      file.path = newPath;
      if (!file.isFolder) {
        file.language = getLanguageFromFilename(newName);
      } else {
        const updateChildrenPaths = (parent: FileItem, prefix: string) => {
          if (parent.children) {
            parent.children.forEach(child => {
              child.path = `${prefix}/${child.name}`;
              if (child.isFolder) {
                updateChildrenPaths(child, child.path);
              }
            });
          }
        };
        updateChildrenPaths(file, newPath);
      }
      await this.saveWorkspace();
    }
  }

  async deleteFile(id: string): Promise<void> {
    const deleteFromList = (items: FileItem[]): boolean => {
      const idx = items.findIndex(item => item.id === id);
      if (idx !== -1) {
        items.splice(idx, 1);
        return true;
      }
      for (const item of items) {
        if (item.children && deleteFromList(item.children)) {
          return true;
        }
      }
      return false;
    };

    deleteFromList(this.files);
    await this.saveWorkspace();
  }

  getAllFlatFiles(includeFolders: boolean = false): FileItem[] {
    const flat: FileItem[] = [];
    const traverse = (items: FileItem[]) => {
      for (const item of items) {
        if (!item.isFolder || includeFolders) {
          flat.push(item);
        }
        if (item.children && item.children.length > 0) {
          traverse(item.children);
        }
      }
    };
    traverse(this.files);
    return flat;
  }

  async exportWorkspaceZip(): Promise<Blob> {
    const zip = new JSZip();
    const flatFiles = this.getAllFlatFiles();
    flatFiles.forEach(file => {
      zip.file(file.path, file.content);
    });
    return await zip.generateAsync({ type: 'blob' });
  }

  async downloadProjectZip(projectId?: string): Promise<void> {
    const targetId = projectId || this.currentProjectId;
    let filesToZip = this.files;
    let projectName = this.currentProjectName;

    if (projectId && projectId !== this.currentProjectId) {
      const projectStorageKey = `${STORAGE_KEY}_${projectId}`;
      const stored = await get<FileItem[]>(projectStorageKey);
      if (stored && Array.isArray(stored)) {
        filesToZip = stored;
      }
      const projects = await this.listProjects();
      const p = projects.find(item => item.id === projectId);
      if (p) projectName = p.name;
    }

    const zip = new JSZip();
    const flat: FileItem[] = [];
    const traverse = (items: FileItem[]) => {
      for (const item of items) {
        if (!item.isFolder) {
          flat.push(item);
        }
        if (item.children && item.children.length > 0) {
          traverse(item.children);
        }
      }
    };
    traverse(filesToZip);
    flat.forEach(file => {
      zip.file(file.path, file.content);
    });

    const blob = await zip.generateAsync({ type: 'blob' });
    const cleanName = (projectName || 'project').replace(/[^a-zA-Z0-9_-]/g, '_');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cleanName}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async importDirectoryFiles(files: { path: string; content: string }[], folderName: string): Promise<FileItem[]> {
    const newRoot: FileItem[] = [];

    for (const file of files) {
      const parts = file.path.split('/').filter(Boolean);
      let currentChildren = newRoot;
      let currentPath = '';

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLast = i === parts.length - 1;
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        if (isLast) {
          currentChildren.push({
            id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: part,
            path: currentPath,
            content: file.content,
            language: getLanguageFromFilename(part),
            isFolder: false
          });
        } else {
          let folder = currentChildren.find(item => item.isFolder && item.name === part);
          if (!folder) {
            folder = {
              id: `folder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              name: part,
              path: currentPath,
              content: '',
              language: '',
              isFolder: true,
              isExpanded: true,
              children: []
            };
            currentChildren.push(folder);
          }
          if (!folder.children) folder.children = [];
          currentChildren = folder.children;
        }
      }
    }

    // Flush active project before creating imported folder project
    await this.saveWorkspace(true);

    const projectId = `proj_folder_${Date.now()}`;
    this.currentProjectId = projectId;
    this.currentProjectName = folderName;
    this.files = newRoot;
    localStorage.setItem(ACTIVE_PROJECT_ID_KEY, this.currentProjectId);
    await this.saveWorkspace(true);
    await this.syncProjectsIndex();
    return this.files;
  }

  async importWorkspaceZip(file: File): Promise<FileItem[]> {
    const zip = new JSZip();
    const contents = await zip.loadAsync(file);
    const newRoot: FileItem[] = [];

    for (const [relativePath, zipEntry] of Object.entries(contents.files)) {
      if (!zipEntry.dir) {
        const text = await zipEntry.async('string');
        const parts = relativePath.split('/').filter(Boolean);
        let currentChildren = newRoot;
        let currentPath = '';

        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          const isLast = i === parts.length - 1;
          currentPath = currentPath ? `${currentPath}/${part}` : part;

          if (isLast) {
            currentChildren.push({
              id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              name: part,
              path: currentPath,
              content: text,
              language: getLanguageFromFilename(part),
              isFolder: false
            });
          } else {
            let folder = currentChildren.find(item => item.isFolder && item.name === part);
            if (!folder) {
              folder = {
                id: `folder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name: part,
                path: currentPath,
                content: '',
                language: '',
                isFolder: true,
                isExpanded: true,
                children: []
              };
              currentChildren.push(folder);
            }
            if (!folder.children) folder.children = [];
            currentChildren = folder.children;
          }
        }
      }
    }

    // Flush active project before creating imported zip project
    await this.saveWorkspace(true);

    const projectName = file.name.replace(/\.zip$/i, '');
    this.currentProjectId = `proj_zip_${Date.now()}`;
    this.currentProjectName = projectName;
    this.files = newRoot;
    localStorage.setItem(ACTIVE_PROJECT_ID_KEY, this.currentProjectId);
    await this.saveWorkspace(true);
    await this.syncProjectsIndex();
    return this.files;
  }

  // Persistent Tab Session Management
  saveOpenTabs(tabs: { fileId: string; name: string; path: string; language: string }[], activeFileId: string | null): void {
    try {
      localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(tabs));
      if (activeFileId) {
        localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, activeFileId);
      }
    } catch (e) {}
  }

  getSavedOpenTabs(): { tabs: any[]; activeFileId: string | null } {
    try {
      const tabsJson = localStorage.getItem(TABS_STORAGE_KEY);
      const activeId = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
      const tabs = tabsJson ? JSON.parse(tabsJson) : [];
      return { tabs: Array.isArray(tabs) ? tabs : [], activeFileId: activeId };
    } catch (e) {
      return { tabs: [], activeFileId: null };
    }
  }
}

export const fileSystemService = new FileSystemService();
