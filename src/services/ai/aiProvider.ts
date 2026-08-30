import { JobAnalysisResult, AgentSource } from "@/types/job";
import { UserProfile } from "@/types/profile";

export interface AiProvider {
  name: string;
  analyzeJob(
    jobText: string,
    source: AgentSource,
    profile: UserProfile
  ): Promise<JobAnalysisResult>;
  reEvaluateJob(
    previousResult: JobAnalysisResult,
    userFeedback: string,
    profile: UserProfile
  ): Promise<JobAnalysisResult>;
}
