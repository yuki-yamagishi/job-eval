import { UserProfile } from "@/types/profile";
import { JobAnalysisResult } from "@/types/job";
import { StorageAdapter } from "@/types/storage";
import { SyncStatusInfo, CloudSyncConfig } from "@/types/sync";
import { DEFAULT_USER_PROFILE } from "@/core/constants/defaultProfile";
import { cloudSyncService } from "@/services/sync/cloudSyncService";

const STORAGE_KEYS = {
  PROFILE: "jobeval_user_profile_v1",
  JOBS: "jobeval_saved_jobs_v1",
};

/**
 * Web LocalStorage implementation of StorageAdapter with File System Access API & Real-time Cloud Sync
 */
export class LocalStorageAdapter implements StorageAdapter {
  async loadProfile(): Promise<UserProfile> {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PROFILE);
      if (stored) {
        return JSON.parse(stored) as UserProfile;
      }
    } catch (e) {
      console.warn("Failed to load profile from localStorage, using default", e);
    }
    // Seed default profile if none exists
    await this.saveProfile(DEFAULT_USER_PROFILE);
    return DEFAULT_USER_PROFILE;
  }

  async saveProfile(profile: UserProfile): Promise<void> {
    try {
      const payload: UserProfile = {
        ...profile,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(payload));
      cloudSyncService.notifyProfileChanged(payload);
    } catch (e) {
      console.error("Failed to save profile to localStorage", e);
      throw new Error("プロファイルの保存に失敗しました");
    }
  }

  async resetProfile(): Promise<UserProfile> {
    await this.saveProfile(DEFAULT_USER_PROFILE);
    return DEFAULT_USER_PROFILE;
  }

  async loadJobs(): Promise<JobAnalysisResult[]> {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.JOBS);
      if (stored) {
        return JSON.parse(stored) as JobAnalysisResult[];
      }
    } catch (e) {
      console.warn("Failed to load saved jobs from localStorage", e);
    }
    return [];
  }

  async saveJob(job: JobAnalysisResult): Promise<void> {
    const jobs = await this.loadJobs();
    const existingIndex = jobs.findIndex((j) => j.metadata.id === job.metadata.id);

    if (existingIndex >= 0) {
      jobs[existingIndex] = job;
    } else {
      jobs.unshift(job);
    }

    localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(jobs));
    cloudSyncService.notifyJobsChanged(jobs);
  }

  async deleteJob(id: string): Promise<void> {
    const jobs = await this.loadJobs();
    const filtered = jobs.filter((j) => j.metadata.id !== id);
    localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(filtered));
    cloudSyncService.notifyJobsChanged(filtered);
  }

  // Real-time synchronization methods
  subscribeJobs(callback: (jobs: JobAnalysisResult[]) => void): () => void {
    return cloudSyncService.onJobsChange(callback);
  }

  subscribeProfile(callback: (profile: UserProfile) => void): () => void {
    return cloudSyncService.onProfileChange(callback);
  }

  getSyncStatus(): SyncStatusInfo {
    return cloudSyncService.getStatus();
  }

  async configureSync(config: CloudSyncConfig): Promise<void> {
    return cloudSyncService.configure(config);
  }

  subscribeSyncStatus(callback: (status: SyncStatusInfo) => void): () => void {
    return cloudSyncService.onStatusChange(callback);
  }

  /**
   * Export Markdown file to Obsidian Vault or Local Folder
   * Uses File System Access API if available, falls back to Blob download
   */
  async exportMarkdownFile(filename: string, content: string): Promise<boolean> {
    try {
      // 1. Try File System Access API (allows user to select Obsidian Vault folder directly)
      const windowWithFSA = window as unknown as {
        showSaveFilePicker?: (options: {
          suggestedName?: string;
          types?: { description: string; accept: Record<string, string[]> }[];
        }) => Promise<{
          createWritable: () => Promise<{
            write: (data: string) => Promise<void>;
            close: () => Promise<void>;
          }>;
        }>;
      };

      if (typeof windowWithFSA.showSaveFilePicker === "function") {
        try {
          const fileHandle = await windowWithFSA.showSaveFilePicker({
            suggestedName: filename,
            types: [
              {
                description: "Markdown Document (*.md)",
                accept: { "text/markdown": [".md"] },
              },
            ],
          });
          const writableStream = await fileHandle.createWritable();
          await writableStream.write(content);
          await writableStream.close();
          return true;
        } catch (pickerErr: unknown) {
          if (pickerErr instanceof Error && pickerErr.name === "AbortError") {
            // User cancelled file picker
            return false;
          }
          console.warn("File Picker failed, falling back to Blob download", pickerErr);
        }
      }

      // 2. Standard UTF-8 Blob Download fallback
      const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return true;
    } catch (e) {
      console.error("Export markdown failed", e);
      return false;
    }
  }
}

// Export singleton instance
export const storageAdapter: StorageAdapter = new LocalStorageAdapter();
