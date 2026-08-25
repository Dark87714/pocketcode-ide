import { Project, FileItem, ProjectSettings } from '../types';
import { normalizePath } from '../utils/pathUtils';
import { persistenceService } from './persistenceService';

export type ProjectChangeListener = (project: Project) => void;

/**
 * ProjectStore
 * Central state store and single source of truth for active project, files, and settings.
 */
export class ProjectStore {
  private currentProject: Project = {
    projectId: 'default_project',
    name: 'My Pocket Workspace',
    files: [],
    settings: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
    formatVersion: 1
  };

  private listeners: Set<ProjectChangeListener> = new Set();
  private dirtyFiles: Set<string> = new Set();

  /**
   * Subscribe to project state changes
   */
  subscribe(listener: ProjectChangeListener): () => void {
    this.listeners.add(listener);
    listener(this.currentProject);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.currentProject.updatedAt = Date.now();
    this.listeners.forEach(l => l(this.currentProject));
  }

  getProject(): Project {
    return this.currentProject;
  }

  getProjectId(): string {
    return this.currentProject.projectId;
  }

  getProjectName(): string {
    return this.currentProject.name;
  }

  getFiles(): FileItem[] {
    return this.currentProject.files;
  }

  getSettings(): ProjectSettings {
    return this.currentProject.settings;
  }

  setProject(project: Project, notify: boolean = true): void {
    this.currentProject = project;
    this.dirtyFiles.clear();
    if (notify) this.notify();
  }

  setProjectName(name: string): void {
    const clean = name.trim() || 'My Project';
    this.currentProject.name = clean;
    this.notify();
  }

  setFiles(files: FileItem[]): void {
    this.currentProject.files = files;
    this.notify();
  }

  updateSettings(settings: Partial<ProjectSettings>): void {
    this.currentProject.settings = {
      ...this.currentProject.settings,
      ...settings
    };
    this.notify();
  }

  /**
   * Flatten file hierarchy into a list
   */
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
    traverse(this.currentProject.files);
    return flat;
  }

  /**
   * Lookup file by ID
   */
  getFileById(id: string): FileItem | undefined {
    const search = (items: FileItem[]): FileItem | undefined => {
      for (const item of items) {
        if (item.id === id) return item;
        if (item.children) {
          const found = search(item.children);
          if (found) return found;
        }
      }
      return undefined;
    };
    return search(this.currentProject.files);
  }

  /**
   * Lookup file by canonical normalized path
   */
  getFileByPath(path: string): FileItem | undefined {
    const target = normalizePath(path);
    const search = (items: FileItem[]): FileItem | undefined => {
      for (const item of items) {
        if (normalizePath(item.path) === target) return item;
        if (item.children) {
          const found = search(item.children);
          if (found) return found;
        }
      }
      return undefined;
    };
    return search(this.currentProject.files);
  }

  /**
   * Dirty file tracking for auto-save & crash snapshots
   */
  markDirty(fileId: string, isDirty: boolean = true): void {
    if (isDirty) {
      this.dirtyFiles.add(fileId);
    } else {
      this.dirtyFiles.delete(fileId);
    }
  }

  isDirty(): boolean {
    return this.dirtyFiles.size > 0;
  }

  getDirtyFileIds(): string[] {
    return Array.from(this.dirtyFiles);
  }

  clearDirty(): void {
    this.dirtyFiles.clear();
  }

  /**
   * Save current project to IndexedDB persistence
   */
  async persist(createSnapshot: boolean = true): Promise<void> {
    await persistenceService.saveProject(this.currentProject, createSnapshot);
    this.clearDirty();
  }
}

export const projectStore = new ProjectStore();
