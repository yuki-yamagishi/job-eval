import { JobAnalysisResult, AgentSource } from "@/types/job";
import { UserProfile } from "@/types/profile";
import { AiProvider } from "./aiProvider";
import { MockAiProvider } from "./mockAiProvider";
import { GeminiAiProvider } from "./geminiProvider";

export { MockAiProvider } from "./mockAiProvider";
export { GeminiAiProvider, testGeminiConnection, fetchAvailableGeminiModels } from "./geminiProvider";
export type { AiProvider } from "./aiProvider";

const mockProvider: AiProvider = new MockAiProvider();
const geminiProvider: AiProvider = new GeminiAiProvider();

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
      console.warn("Gemini API re-evaluation error, falling back to mock engine:", error);
      throw error;
    }
  }

  return mockProvider.reEvaluateJob(previousResult, userFeedback, profile);
}
