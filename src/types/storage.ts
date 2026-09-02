import { UserProfile } from "./profile";
import { JobAnalysisResult } from "./job";
import { SyncStatusInfo, CloudSyncConfig } from "./sync";

export interface StorageAdapter {
  // Profile methods
  loadProfile(): Promise<UserProfile>;
  saveProfile(profile: UserProfile): Promise<void>;
  resetProfile(): Promise<UserProfile>;

  // Jobs persistence methods
  loadJobs(): Promise<JobAnalysisResult[]>;
  saveJob(job: JobAnalysisResult): Promise<void>;
  deleteJob(id: string): Promise<void>;

  // Export / Import
  exportMarkdownFile(filename: string, content: string): Promise<boolean>;

  // Real-time synchronization methods (Optional/Pluggable)
  subscribeJobs?: (callback: (jobs: JobAnalysisResult[]) => void) => () => void;
  subscribeProfile?: (callback: (profile: UserProfile) => void) => () => void;
  getSyncStatus?: () => SyncStatusInfo;
  configureSync?: (config: CloudSyncConfig) => Promise<void>;
  subscribeSyncStatus?: (callback: (status: SyncStatusInfo) => void) => () => void;
}
