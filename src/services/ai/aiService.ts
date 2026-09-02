import { JobAnalysisResult, AgentSource, EvaluationTriggerReason, EvaluationHistoryItem } from "@/types/job";
import { UserProfile } from "@/types/profile";
import { AiProvider } from "./aiProvider";
import { MockAiProvider } from "./mockAiProvider";
import { GeminiAiProvider } from "./geminiProvider";
import { generateJobMarkdown } from "@/core/markdown/markdownGenerator";

export { MockAiProvider } from "./mockAiProvider";
export { GeminiAiProvider, testGeminiConnection, fetchAvailableGeminiModels } from "./geminiProvider";
export type { AiProvider } from "./aiProvider";

const mockProvider: AiProvider = new MockAiProvider();
const geminiProvider: AiProvider = new GeminiAiProvider();

/**
 * Helper to construct fallback job text from jobDetails if originalJobText is absent
 */
export function constructJobTextFallback(job: JobAnalysisResult): string {
  if (job.originalJobText && job.originalJobText.trim().length > 20) {
    return job.originalJobText;
  }

  const parts: string[] = [
    `企業名: ${job.metadata.company}`,
    `職種: ${job.metadata.title}`,
    job.metadata.salaryMin ? `給与: ${job.metadata.salaryMin}万円〜${job.metadata.salaryMax || ""}万円` : "",
    job.jobDetails?.location ? `勤務地: ${job.jobDetails.location}` : "",
    "必須要件:",
    ...(job.jobDetails?.mustRequirements || []).map((m) => `- ${m}`),
    "歓迎要件:",
    ...(job.jobDetails?.wantRequirements || []).map((w) => `- ${w}`),
    "業務内容:",
    ...(job.jobDetails?.jobDescription || []).map((d) => `- ${d}`),
    job.jobDetails?.selectionProcess ? `選考フロー: ${job.jobDetails.selectionProcess}` : "",
  ];

  return parts.filter(Boolean).join("\n");
}

/**
 * Unified AI analysis service that dispatches to Gemini or Mock provider
 */
export async function analyzeJobWithProfile(
  text: string,
  source: AgentSource,
  profile: UserProfile,
  customProvider?: AiProvider
): Promise<JobAnalysisResult> {
  if (customProvider) {
    return customProvider.analyzeJob(text, source, profile);
  }

  const hasApiKey = Boolean(profile.apiSettings?.geminiApiKey?.trim());

  if (hasApiKey) {
    try {
      return await geminiProvider.analyzeJob(text, source, profile);
    } catch (error) {
      console.warn("Gemini API error, falling back to mock engine:", error);
      // Re-throw or fall back depending on context
      throw error;
    }
  }

  // Fallback to local mock engine
  return mockProvider.analyzeJob(text, source, profile);
}

/**
 * Re-evaluates an existing job using its original text against the latest UserProfile,
 * preserving its ID, status, notes, and recording previous evaluations in evaluationHistory.
 */
export async function reEvaluateJobFromOriginalText(
  previousJob: JobAnalysisResult,
  profile: UserProfile,
  triggerReason: EvaluationTriggerReason = "profile_update",
  summaryNote?: string,
  customProvider?: AiProvider
): Promise<JobAnalysisResult> {
  const jobText = constructJobTextFallback(previousJob);
  const source = previousJob.metadata.agentSource || "その他";

  // 1. Execute fresh full analysis
  const freshResult = await analyzeJobWithProfile(jobText, source, profile, customProvider);

  // 2. Snapshot current previous evaluation into history
  const previousSnapshot: EvaluationHistoryItem = {
    id: `eval-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    date: new Date().toISOString(),
    triggerReason,
    score: previousJob.metadata.matchScore,
    judgment: previousJob.metadata.judgment,
    scoreBreakdown: { ...previousJob.scoreBreakdown },
    positives: previousJob.positives ? [...previousJob.positives.slice(0, 3)] : [],
    concerns: previousJob.concerns ? [...previousJob.concerns.slice(0, 3)] : [],
    summaryNote: summaryNote || (triggerReason === "profile_update" ? "プロファイル条件更新に伴うAI再評価" : "最新条件でのAI再評価"),
  };

  const updatedEvaluationHistory: EvaluationHistoryItem[] = [
    previousSnapshot,
    ...(previousJob.evaluationHistory || []),
  ];

  // 3. Keep original metadata ID, status, dateAnalyzed, tags
  const updatedMetadata = {
    ...freshResult.metadata,
    id: previousJob.metadata.id,
    status: previousJob.metadata.status,
    rejectReason: previousJob.metadata.rejectReason,
    dateAnalyzed: previousJob.metadata.dateAnalyzed,
    agentSource: previousJob.metadata.agentSource,
    tags: Array.from(new Set([...previousJob.metadata.tags, ...freshResult.metadata.tags])),
  };

  // 4. Generate updated Markdown document including history
  const updatedMarkdown = generateJobMarkdown({
    metadata: updatedMetadata,
    scoreBreakdown: freshResult.scoreBreakdown,
    positives: freshResult.positives,
    concerns: freshResult.concerns,
    agentQuestions: freshResult.agentQuestions,
    appealPoints: freshResult.appealPoints,
    qualificationAdvice: freshResult.qualificationAdvice,
    careerTrajectory: freshResult.careerTrajectory || previousJob.careerTrajectory,
    evaluationHistory: updatedEvaluationHistory,
    mustRequirements: freshResult.jobDetails.mustRequirements,
    wantRequirements: freshResult.jobDetails.wantRequirements,
    jobDescription: freshResult.jobDetails.jobDescription,
    selectionProcess: freshResult.jobDetails.selectionProcess,
  });

  return {
    ...freshResult,
    metadata: updatedMetadata,
    originalJobText: jobText,
    evaluationHistory: updatedEvaluationHistory,
    feedbackHistory: previousJob.feedbackHistory,
    markdownContent: updatedMarkdown,
  };
}

/**
 * Unified AI re-evaluation service with user feedback
 */
export async function reEvaluateJobWithProfile(
  previousResult: JobAnalysisResult,
  userFeedback: string,
  profile: UserProfile,
  customProvider?: AiProvider
): Promise<JobAnalysisResult> {
  if (customProvider) {
    return customProvider.reEvaluateJob(previousResult, userFeedback, profile);
  }

  const hasApiKey = Boolean(profile.apiSettings?.geminiApiKey?.trim());

  if (hasApiKey) {
    try {
      return await geminiProvider.reEvaluateJob(previousResult, userFeedback, profile);
    } catch (error) {
      console.warn("Gemini API error during re-evaluation:", error);
      throw error;
    }
  }

  return mockProvider.reEvaluateJob(previousResult, userFeedback, profile);
}

/**
 * Unified AI service to generate career trajectory on-demand for existing jobs
 */
export async function generateCareerTrajectoryWithProfile(
  jobResult: JobAnalysisResult,
  profile: UserProfile,
  customProvider?: AiProvider
): Promise<import("@/types/job").CareerTrajectory> {
  if (customProvider) {
    return customProvider.generateCareerTrajectory(jobResult, profile);
  }

  const hasApiKey = Boolean(profile.apiSettings?.geminiApiKey?.trim());

  if (hasApiKey) {
    try {
      return await geminiProvider.generateCareerTrajectory(jobResult, profile);
    } catch (error) {
      console.warn("Gemini API error during career trajectory generation:", error);
      throw error;
    }
  }

  return mockProvider.generateCareerTrajectory(jobResult, profile);
}
