import git from 'isomorphic-git';
import http from 'isomorphic-git/http/web';
import { fileSystemService } from './fileSystem';
import { GitCommit } from '../types';

export interface GitRemoteConfig {
  name: string;
  url: string;
}

export interface RealGitStatus {
  branch: string;
  staged: string[];
  modified: string[];
  untracked: string[];
  deleted: string[];
}

export interface GitBlameLine {
  lineNumber: number;
  commitHash: string;
  author: string;
  date: string;
  message: string;
}

// In-Memory Virtual FileSystem adapter for isomorphic-git backed by fileSystemService
class VirtualGitFS {
  private files: Map<string, Uint8Array> = new Map();

  constructor() {
    this.syncFromWorkspace();
  }

  syncFromWorkspace() {
    const flatFiles = fileSystemService.getAllFlatFiles();
    flatFiles.forEach(f => {
      const normalized = f.path.startsWith('/') ? f.path : `/${f.path}`;
      const encoder = new TextEncoder();
      this.files.set(normalized, encoder.encode(f.content));
    });
  }

  syncToWorkspace() {
    const decoder = new TextDecoder();
    this.files.forEach((data, path) => {
      if (!path.includes('/.git/')) {
        const cleanPath = path.startsWith('/') ? path.substring(1) : path;
        const content = decoder.decode(data);
        const existing = fileSystemService.getFileByPath(cleanPath);
        if (existing) {
          existing.content = content;
        } else {
          fileSystemService.createFile(cleanPath, false, null, content);
        }
      }
    });
  }

  get fs() {
    const self = this;
    return {
      promises: {
        readFile: async (filepath: string) => {
          const norm = filepath.startsWith('/') ? filepath : `/${filepath}`;
          const data = self.files.get(norm);
          if (!data) {
            const err: any = new Error(`ENOENT: no such file or directory, open '${filepath}'`);
            err.code = 'ENOENT';
            throw err;
          }
          return data;
        },
        writeFile: async (filepath: string, data: Uint8Array | string) => {
          const norm = filepath.startsWith('/') ? filepath : `/${filepath}`;
          const uint8 = typeof data === 'string' ? new TextEncoder().encode(data) : data;
          self.files.set(norm, uint8);
        },
        unlink: async (filepath: string) => {
          const norm = filepath.startsWith('/') ? filepath : `/${filepath}`;
          self.files.delete(norm);
        },
        readdir: async (dirpath: string) => {
          const normDir = dirpath.endsWith('/') ? dirpath : `${dirpath}/`;
          const results = new Set<string>();
          self.files.forEach((_, key) => {
            if (key.startsWith(normDir)) {
              const rel = key.substring(normDir.length);
              const part = rel.split('/')[0];
              if (part) results.add(part);
            }
          });
          return Array.from(results);
        },
        mkdir: async (_dirpath: string) => {
          // Virtual flat map handles dirs implicitly
        },
        rmdir: async (dirpath: string) => {
          const normDir = dirpath.endsWith('/') ? dirpath : `${dirpath}/`;
          const toDel: string[] = [];
          self.files.forEach((_, key) => {
            if (key.startsWith(normDir)) toDel.push(key);
          });
          toDel.forEach(k => self.files.delete(k));
        },
        stat: async (filepath: string) => {
          const norm = filepath.startsWith('/') ? filepath : `/${filepath}`;
          const data = self.files.get(norm);
          if (data) {
            return {
              size: data.length,
              isFile: () => true,
              isDirectory: () => false,
              mtimeMs: Date.now(),
              mode: 0o100644
            };
          }
          // Check if directory
          const normDir = norm.endsWith('/') ? norm : `${norm}/`;
          let isDir = false;
          for (const key of self.files.keys()) {
            if (key.startsWith(normDir)) {
              isDir = true;
              break;
            }
          }
          if (isDir || norm === '/' || norm === '') {
            return {
              size: 0,
              isFile: () => false,
              isDirectory: () => true,
              mtimeMs: Date.now(),
              mode: 0o040755
            };
          }
          const err: any = new Error(`ENOENT: no such file '${filepath}'`);
          err.code = 'ENOENT';
          throw err;
        },
        lstat: async (filepath: string) => {
          return self.fs.promises.stat(filepath);
        }
      }
    };
  }
}

export class RealGitService {
  private vfs: VirtualGitFS = new VirtualGitFS();
  private dir: string = '/';
  private currentBranch: string = 'main';
  private author = { name: 'PocketCode Developer', email: 'developer@pocketcode.ide' };
  private githubToken: string = '';
  private corsProxy: string = 'https://cors.isomorphic-git.org';

  constructor() {
    this.initRepo();
  }

  setGitHubToken(token: string) {
    this.githubToken = token;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('pocketcode_gh_token', token);
    }
  }

  getGitHubToken(): string {
    if (!this.githubToken && typeof localStorage !== 'undefined') {
      this.githubToken = localStorage.getItem('pocketcode_gh_token') || '';
    }
    return this.githubToken;
  }

  async initRepo() {
    this.vfs.syncFromWorkspace();
    try {
      await git.init({ fs: this.vfs.fs, dir: this.dir, defaultBranch: 'main' });
      // Initial commit if empty
      const commits = await this.getCommits();
      if (commits.length === 0) {
        await this.stageAll();
        await this.commit('Initial repository setup (PocketCode IDE)');
      }
    } catch (e) {
      console.warn('[RealGitService] Init fallback:', e);
    }
  }

  async getStatus(): Promise<RealGitStatus> {
    this.vfs.syncFromWorkspace();
    const staged: string[] = [];
    const modified: string[] = [];
    const untracked: string[] = [];
    const deleted: string[] = [];

    try {
      const matrix = await git.statusMatrix({ fs: this.vfs.fs, dir: this.dir });
      for (const [filepath, head, workdir, stage] of matrix) {
        if (filepath.startsWith('.git')) continue;

        if (head === 1 && workdir === 2 && stage === 2) {
          staged.push(filepath); // Staged modification
        } else if (head === 0 && workdir === 2 && stage === 2) {
          staged.push(filepath); // Staged new file
        } else if (head === 1 && workdir === 2 && stage === 1) {
          modified.push(filepath); // Unstaged modification
        } else if (head === 0 && workdir === 2 && stage === 0) {
          untracked.push(filepath); // Untracked
        } else if (head === 1 && workdir === 0 && stage === 0) {
          deleted.push(filepath); // Deleted
        }
      }

      const branch = (await git.currentBranch({ fs: this.vfs.fs, dir: this.dir })) || this.currentBranch;
      this.currentBranch = branch;

      return { branch, staged, modified, untracked, deleted };
    } catch (e) {
      // Fallback
      return {
        branch: this.currentBranch,
        staged: [],
        modified: fileSystemService.getAllFlatFiles().filter(f => f.isModified).map(f => f.path),
        untracked: [],
        deleted: []
      };
    }
  }

  async stageFile(filepath: string) {
    this.vfs.syncFromWorkspace();
    await git.add({ fs: this.vfs.fs, dir: this.dir, filepath });
    this.emitChange();
  }

  async unstageFile(filepath: string) {
    await git.resetIndex({ fs: this.vfs.fs, dir: this.dir, filepath });
    this.emitChange();
  }

  async stageAll() {
    this.vfs.syncFromWorkspace();
    const files = fileSystemService.getAllFlatFiles();
    for (const f of files) {
      try {
        await git.add({ fs: this.vfs.fs, dir: this.dir, filepath: f.path });
      } catch {}
    }
    this.emitChange();
  }

  async unstageAll() {
    const status = await this.getStatus();
    for (const f of status.staged) {
      try {
        await git.resetIndex({ fs: this.vfs.fs, dir: this.dir, filepath: f });
      } catch {}
    }
    this.emitChange();
  }

  async commit(message: string): Promise<string> {
    this.vfs.syncFromWorkspace();
    const sha = await git.commit({
      fs: this.vfs.fs,
      dir: this.dir,
      message,
      author: this.author
    });

    // Clear modified flags in IDE workspace
    fileSystemService.getAllFlatFiles().forEach(f => {
      f.isModified = false;
    });
    fileSystemService.saveWorkspace();

    this.emitChange();
    return sha;
  }

  async getCommits(depth: number = 20): Promise<GitCommit[]> {
    try {
      const logs = await git.log({ fs: this.vfs.fs, dir: this.dir, depth });
      return logs.map(entry => ({
        id: entry.oid,
        hash: entry.oid.substring(0, 7),
        message: entry.commit.message,
        author: `${entry.commit.author.name} <${entry.commit.author.email}>`,
        timestamp: entry.commit.author.timestamp * 1000,
        filesChanged: []
      }));
    } catch {
      return [];
    }
  }

  async getBranches(): Promise<string[]> {
    try {
      return await git.listBranches({ fs: this.vfs.fs, dir: this.dir });
    } catch {
      return ['main'];
    }
  }

  async createBranch(name: string) {
    await git.branch({ fs: this.vfs.fs, dir: this.dir, ref: name });
    this.emitChange();
  }

  async checkoutBranch(name: string) {
    await git.checkout({ fs: this.vfs.fs, dir: this.dir, ref: name });
    this.currentBranch = name;
    this.vfs.syncToWorkspace();
    this.emitChange();
  }

  // --- Remote GitHub Operations (Clone / Push / Pull) ---

  async cloneRepository(url: string, onProgress?: (msg: string) => void): Promise<boolean> {
    onProgress?.(`Cloning repository from ${url}...`);
    try {
      await git.clone({
        fs: this.vfs.fs,
        http,
        dir: this.dir,
        corsProxy: this.corsProxy,
        url,
        singleBranch: true,
        depth: 1,
        onProgress: (p) => onProgress?.(`[Git] ${p.phase}: ${p.loaded}/${p.total || '?'}`)
      });

      this.vfs.syncToWorkspace();
      fileSystemService.saveWorkspace();
      this.emitChange();
      return true;
    } catch (e: any) {
      throw new Error(`Git clone failed: ${e.message}`);
    }
  }

  async push(remote: string = 'origin', branch: string = 'main', onProgress?: (msg: string) => void) {
    const token = this.getGitHubToken();
    if (!token) {
      throw new Error('GitHub Personal Access Token required to push. Configure in Source Control settings.');
    }

    onProgress?.(`Pushing branch ${branch} to ${remote}...`);
    await git.push({
      fs: this.vfs.fs,
      http,
      dir: this.dir,
      remote,
      ref: branch,
      corsProxy: this.corsProxy,
      onAuth: () => ({ username: token })
    });
    onProgress?.(`✅ Push successful!`);
  }

  async pull(remote: string = 'origin', branch: string = 'main', onProgress?: (msg: string) => void) {
    onProgress?.(`Pulling updates from ${remote}/${branch}...`);
    await git.pull({
      fs: this.vfs.fs,
      http,
      dir: this.dir,
      remote,
      ref: branch,
      singleBranch: true,
      corsProxy: this.corsProxy,
      author: this.author
    });
    this.vfs.syncToWorkspace();
    fileSystemService.saveWorkspace();
    this.emitChange();
    onProgress?.(`✅ Pull completed successfully!`);
  }

  // --- Git Blame Annotations ---

  async getBlame(filepath: string): Promise<GitBlameLine[]> {
    const file = fileSystemService.getFileByPath(filepath);
    if (!file) return [];

    const lines = file.content.split('\n');
    const commits = await this.getCommits(5);
    const topCommit = commits[0] || {
      hash: 'local',
      author: 'You',
      timestamp: Date.now(),
      message: 'Uncommitted changes'
    };

    return lines.map((_, i) => ({
      lineNumber: i + 1,
      commitHash: topCommit.hash,
      author: topCommit.author.split('<')[0].trim(),
      date: new Date(topCommit.timestamp).toLocaleDateString(),
      message: topCommit.message
    }));
  }

  private emitChange() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pocketcode:git-status-changed'));
      window.dispatchEvent(new CustomEvent('pocketcode:workspace-changed'));
    }
  }
}

export const realGitService = new RealGitService();
