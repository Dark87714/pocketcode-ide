import { realGitService, RealGitStatus } from './realGitService';
import { GitCommit } from '../types';

/**
 * GitService (Legacy Interface Adapter)
 * Re-routes all calls directly to RealGitService (isomorphic-git) to ensure a single, consistent source of truth.
 */
export class GitService {
  async getStatus(): Promise<RealGitStatus> {
    return realGitService.getStatus();
  }

  async stageFile(filepath: string): Promise<void> {
    return realGitService.stageFile(filepath);
  }

  async stageAll(): Promise<void> {
    return realGitService.stageAll();
  }

  async unstageFile(filepath: string): Promise<void> {
    return realGitService.unstageFile(filepath);
  }

  async unstageAll(): Promise<void> {
    return realGitService.unstageAll();
  }

  async commit(message: string): Promise<string> {
    return realGitService.commit(message);
  }

  async getCommits(depth: number = 20): Promise<GitCommit[]> {
    return realGitService.getCommits(depth);
  }

  async getBranches(): Promise<string[]> {
    return realGitService.getBranches();
  }

  async createBranch(name: string): Promise<void> {
    return realGitService.createBranch(name);
  }

  async checkoutBranch(name: string): Promise<void> {
    return realGitService.checkoutBranch(name);
  }

  async stash(message?: string): Promise<string> {
    return realGitService.stash(message);
  }

  async popStash(stashId?: string) {
    return realGitService.popStash(stashId);
  }

  async listStashes() {
    return realGitService.listStashes();
  }

  async dropStash(stashId: string) {
    return realGitService.dropStash(stashId);
  }

  async push(remote = 'origin', branch = 'main', onProgress?: (msg: string) => void) {
    return realGitService.push(remote, branch, onProgress);
  }

  async pull(remote = 'origin', branch = 'main', onProgress?: (msg: string) => void) {
    return realGitService.pull(remote, branch, onProgress);
  }
}

export const gitService = new GitService();
