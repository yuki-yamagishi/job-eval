import { UserProfile } from "./profile";
import { JobAnalysisResult } from "./job";

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
}
