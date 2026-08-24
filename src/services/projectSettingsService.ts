import { fileSystemService } from './fileSystem';

export interface ProjectSettings {
  tabSize?: number;
  wordWrap?: 'on' | 'off';
  fontSize?: number;
  fontFamily?: string;
  formatter?: 'prettier' | 'builtin' | 'none';
  formatOnSave?: boolean;
  theme?: string;
  minimap?: boolean;
  lineNumbers?: 'on' | 'off';
  env?: Record<string, string>;
  excludeFromSearch?: string[];
  pythonPath?: string;
  defaultRunner?: string;
  lintOnSave?: boolean;
}

const SETTINGS_FILE_PATH = '.pocketcode/settings.json';

class ProjectSettingsService {
  private cache: ProjectSettings | null = null;
  private projectId: string = '';

  /** Load per-project settings from .pocketcode/settings.json */
  async load(): Promise<ProjectSettings> {
    const currentProjectId = fileSystemService.getCurrentProjectId?.() ?? 'default';

    // Invalidate cache on project switch
    if (currentProjectId !== this.projectId) {
      this.cache = null;
      this.projectId = currentProjectId;
    }

    if (this.cache) return this.cache;

    try {
      const file = fileSystemService.getFileByPath(SETTINGS_FILE_PATH);
      if (file && file.content) {
        const parsed = JSON.parse(file.content) as ProjectSettings;
        this.cache = parsed;
        return parsed;
      }
    } catch (e) {
      console.warn('[ProjectSettings] Failed to parse .pocketcode/settings.json:', e);
    }
    this.cache = {};
    return {};
  }

  /** Save settings to .pocketcode/settings.json */
  async save(settings: ProjectSettings): Promise<void> {
    this.cache = settings;
    const content = JSON.stringify(settings, null, 2);

    // Ensure .pocketcode folder exists
    let folder = fileSystemService.getFileByPath('.pocketcode');
    if (!folder) {
      folder = await fileSystemService.createFile('.pocketcode', true, null, '');
    }

    const existing = fileSystemService.getFileByPath('.pocketcode/settings.json');
    if (existing) {
      fileSystemService.updateFileContent(existing.id, content);
    } else {
      await fileSystemService.createFile('settings.json', false, folder.id, content);
    }

    await fileSystemService.saveWorkspace();
    window.dispatchEvent(new CustomEvent('pocketcode:project-settings-changed', { detail: settings }));
  }

  /** Get a single setting value, with global settings fallback */
  async get<K extends keyof ProjectSettings>(
    key: K,
    globalFallback?: ProjectSettings[K]
  ): Promise<ProjectSettings[K] | undefined> {
    const settings = await this.load();
    return settings[key] ?? globalFallback;
  }

  invalidateCache() {
    this.cache = null;
  }

  /** Merge project settings over global settings, returning a merged EditorSettings-compatible object */
  async mergeWithGlobal(globalSettings: any): Promise<any> {
    const proj = await this.load();
    return {
      ...globalSettings,
      ...(proj.tabSize !== undefined && { tabSize: proj.tabSize }),
      ...(proj.wordWrap !== undefined && { wordWrap: proj.wordWrap }),
      ...(proj.fontSize !== undefined && { fontSize: proj.fontSize }),
      ...(proj.fontFamily !== undefined && { fontFamily: proj.fontFamily }),
      ...(proj.formatOnSave !== undefined && { formatOnSave: proj.formatOnSave }),
      ...(proj.theme !== undefined && { theme: proj.theme }),
      ...(proj.minimap !== undefined && { minimap: proj.minimap }),
      ...(proj.lineNumbers !== undefined && { lineNumbers: proj.lineNumbers }),
    };
  }
}

export const projectSettingsService = new ProjectSettingsService();
