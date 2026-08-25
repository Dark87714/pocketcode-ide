import { get, set, del } from 'idb-keyval';
import { Project, ProjectMetadata, RecoverySnapshot, GitStashItem, SaveStatus } from '../types';

const PROJECTS_INDEX_KEY = 'pocketcode_projects_index_v4';
const ACTIVE_PROJECT_KEY = 'pocketcode_active_project_id_v4';
const RECOVERY_PREFIX = 'pocketcode_recovery_';
const STASHES_PREFIX = 'pocketcode_stashes_';

export type SaveStatusListener = (status: SaveStatus, error?: string) => void;

/**
 * PersistenceService
 * Robust IndexedDB-first storage manager with transactional save queue, mutex, and recovery snapshots.
 */
export class PersistenceService {
  private saveQueue: Promise<void> = Promise.resolve();
  private listeners: Set<SaveStatusListener> = new Set();
  private currentStatus: SaveStatus = 'saved';
  private lastSaveError: string | null = null;
  private lastSavedTimestamp: number = Date.now();

  /**
   * Subscribe to save status changes (e.g. for UI status indicators)
   */
  onSaveStatusChange(listener: SaveStatusListener): () => void {
    this.listeners.add(listener);
    listener(this.currentStatus, this.lastSaveError || undefined);
    return () => this.listeners.delete(listener);
  }

  private setStatus(status: SaveStatus, error?: string) {
    this.currentStatus = status;
    this.lastSaveError = error || null;
    if (status === 'saved') {
      this.lastSavedTimestamp = Date.now();
    }
    this.listeners.forEach(l => l(status, error));
  }

  getStatus(): SaveStatus {
    return this.currentStatus;
  }

  getLastSavedTimestamp(): number {
    return this.lastSavedTimestamp;
  }

  /**
   * Transactional project save queued through mutex to eliminate race conditions
   */
  async saveProject(project: Project, createSnapshot: boolean = true): Promise<void> {
    this.setStatus('saving');

    // Chain onto mutex queue
    this.saveQueue = this.saveQueue.then(async () => {
      try {
        const storageKey = `pocketcode_proj_${project.projectId}`;
        project.updatedAt = Date.now();

        // 1. Save full project record to IndexedDB
        await set(storageKey, project);

        // 2. Update projects index list
        await this.updateProjectIndexEntry({
          id: project.projectId,
          name: project.name,
          createdAt: project.createdAt,
          lastModified: project.updatedAt,
          fileCount: project.files.length,
          description: project.description,
          schemaVersion: project.formatVersion
        });

        // 3. Save auto-recovery snapshot
        if (createSnapshot) {
          await this.saveRecoverySnapshot({
            projectId: project.projectId,
            projectName: project.name,
            timestamp: Date.now(),
            files: project.files,
            reason: 'autosave'
          });
        }

        this.setStatus('saved');
      } catch (err: any) {
        const msg = err?.message || 'Storage write failed (IndexedDB Quota or Access error)';
        console.error('[PersistenceService] Save project error:', err);
        this.setStatus('error', msg);
        throw err;
      }
    });

    return this.saveQueue;
  }

  /**
   * Load project from IndexedDB
   */
  async loadProject(projectId: string): Promise<Project | null> {
    try {
      const storageKey = `pocketcode_proj_${projectId}`;
      const project = await get<Project>(storageKey);
      if (project && project.projectId) {
        return project;
      }
      return null;
    } catch (err) {
      console.error('[PersistenceService] Failed to load project from IndexedDB:', err);
      return null;
    }
  }

  /**
   * Delete a project and its associated stashes/snapshots from IndexedDB
   */
  async deleteProject(projectId: string): Promise<void> {
    try {
      await del(`pocketcode_proj_${projectId}`);
      await del(`${RECOVERY_PREFIX}${projectId}`);
      await del(`${STASHES_PREFIX}${projectId}`);

      // Remove from projects list
      const list = await this.listProjects();
      const filtered = list.filter(p => p.id !== projectId);
      await set(PROJECTS_INDEX_KEY, filtered);
    } catch (err) {
      console.error('[PersistenceService] Failed to delete project:', err);
      throw err;
    }
  }

  /**
   * List all projects metadata
   */
  async listProjects(): Promise<ProjectMetadata[]> {
    try {
      const list = await get<ProjectMetadata[]>(PROJECTS_INDEX_KEY);
      return Array.isArray(list) ? list : [];
    } catch (err) {
      console.warn('[PersistenceService] Failed to fetch projects index:', err);
      return [];
    }
  }

  /**
   * Update or insert project in index
   */
  private async updateProjectIndexEntry(meta: ProjectMetadata): Promise<void> {
    try {
      const list = await this.listProjects();
      const existingIdx = list.findIndex(p => p.id === meta.id);
      if (existingIdx !== -1) {
        list[existingIdx] = { ...list[existingIdx], ...meta };
      } else {
        list.unshift(meta);
      }
      await set(PROJECTS_INDEX_KEY, list);
    } catch (err) {
      console.warn('[PersistenceService] Failed to update project index:', err);
    }
  }

  /**
   * Active Project ID tracking
   */
  async getActiveProjectId(): Promise<string> {
    try {
      const id = await get<string>(ACTIVE_PROJECT_KEY);
      return id || 'default_project';
    } catch {
      return 'default_project';
    }
  }

  async setActiveProjectId(projectId: string): Promise<void> {
    try {
      await set(ACTIVE_PROJECT_KEY, projectId);
    } catch (err) {
      console.warn('[PersistenceService] Failed to set active project ID:', err);
    }
  }

  /**
   * Recovery Snapshots
   */
  async saveRecoverySnapshot(snapshot: RecoverySnapshot): Promise<void> {
    try {
      await set(`${RECOVERY_PREFIX}${snapshot.projectId}`, snapshot);
    } catch (err) {
      console.warn('[PersistenceService] Failed to write recovery snapshot:', err);
    }
  }

  async getRecoverySnapshot(projectId: string): Promise<RecoverySnapshot | null> {
    try {
      const snap = await get<RecoverySnapshot>(`${RECOVERY_PREFIX}${projectId}`);
      return snap || null;
    } catch {
      return null;
    }
  }

  async clearRecoverySnapshot(projectId: string): Promise<void> {
    try {
      await del(`${RECOVERY_PREFIX}${projectId}`);
    } catch (err) {
      console.warn('[PersistenceService] Failed to clear recovery snapshot:', err);
    }
  }

  /**
   * Git Stashes Storage
   */
  async saveGitStash(projectId: string, stash: GitStashItem): Promise<void> {
    try {
      const key = `${STASHES_PREFIX}${projectId}`;
      const stashes = await this.getGitStashes(projectId);
      stashes.unshift(stash);
      await set(key, stashes.slice(0, 30)); // retain up to 30 stashes
    } catch (err) {
      console.error('[PersistenceService] Failed to save git stash:', err);
      throw err;
    }
  }

  async getGitStashes(projectId: string): Promise<GitStashItem[]> {
    try {
      const key = `${STASHES_PREFIX}${projectId}`;
      const stashes = await get<GitStashItem[]>(key);
      return Array.isArray(stashes) ? stashes : [];
    } catch {
      return [];
    }
  }

  async deleteGitStash(projectId: string, stashId: string): Promise<void> {
    try {
      const key = `${STASHES_PREFIX}${projectId}`;
      const stashes = await this.getGitStashes(projectId);
      const filtered = stashes.filter(s => s.id !== stashId);
      await set(key, filtered);
    } catch (err) {
      console.error('[PersistenceService] Failed to delete git stash:', err);
    }
  }
}

export const persistenceService = new PersistenceService();
