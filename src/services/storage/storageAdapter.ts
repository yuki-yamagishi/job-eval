import { UserProfile } from "@/types/profile";
import { JobAnalysisResult } from "@/types/job";
import { StorageAdapter } from "@/types/storage";
import { DEFAULT_USER_PROFILE } from "@/core/constants/defaultProfile";

const STORAGE_KEYS = {
  PROFILE: "jobeval_user_profile_v1",
  JOBS: "jobeval_saved_jobs_v1",
};

/**
 * Web LocalStorage implementation of StorageAdapter
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
  }

  async deleteJob(id: string): Promise<void> {
    const jobs = await this.loadJobs();
    const filtered = jobs.filter((j) => j.metadata.id !== id);
    localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(filtered));
  }

  async exportMarkdownFile(filename: string, content: string): Promise<boolean> {
    try {
      // Browser blob download
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
