/**
 * Smart Merge & Conflict Resolution Engine
 * Pure deterministic algorithms for merging Job Analysis Results and User Profiles across devices.
 */

import { JobAnalysisResult, EvaluationHistoryItem } from "@/types/job";
import { UserProfile, SkillItem, CertificationItem } from "@/types/profile";

/**
 * Helper to safely extract a timestamp (ms) from date strings
 */
function getJobTimestamp(job: JobAnalysisResult): number {
  if (job?.metadata?.updatedAt) {
    const t = new Date(job.metadata.updatedAt).getTime();
    if (!isNaN(t)) return t;
  }
  if (job?.metadata?.dateAnalyzed) {
    const t = new Date(job.metadata.dateAnalyzed).getTime();
    if (!isNaN(t)) return t;
  }
  return 0;
}

/**
 * Merge evaluation history items without duplicates
 */
function mergeEvaluationHistories(
  localHistory?: EvaluationHistoryItem[],
  remoteHistory?: EvaluationHistoryItem[]
): EvaluationHistoryItem[] | undefined {
  if (!localHistory && !remoteHistory) return undefined;
  if (!localHistory) return remoteHistory;
  if (!remoteHistory) return localHistory;

  const historyMap = new Map<string, EvaluationHistoryItem>();

  for (const item of [...localHistory, ...remoteHistory]) {
    const key = `${item.id || ""}_${item.date}_${item.triggerReason}_${item.score}`;
    if (!historyMap.has(key)) {
      historyMap.set(key, item);
    }
  }

  return Array.from(historyMap.values()).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

/**
 * Smartly merge two job arrays by ID with Last-Write-Wins (LWW) conflict resolution.
 * Guarantees zero data loss (Union of unique jobs).
 */
export function mergeJobs(
  localJobs: JobAnalysisResult[],
  remoteJobs: JobAnalysisResult[]
): JobAnalysisResult[] {
  if (!localJobs || localJobs.length === 0) return remoteJobs || [];
  if (!remoteJobs || remoteJobs.length === 0) return localJobs || [];

  const jobMap = new Map<string, JobAnalysisResult>();

  // 1. Add all local jobs to map
  for (const job of localJobs) {
    if (job?.metadata?.id) {
      jobMap.set(job.metadata.id, job);
    }
  }

  // 2. Merge remote jobs
  for (const remoteJob of remoteJobs) {
    if (!remoteJob?.metadata?.id) continue;

    const id = remoteJob.metadata.id;
    const existingJob = jobMap.get(id);

    if (!existingJob) {
      // New job unique to remote device -> Add
      jobMap.set(id, remoteJob);
    } else {
      // Existing job in both devices -> Compare timestamps (LWW)
      const localTime = getJobTimestamp(existingJob);
      const remoteTime = getJobTimestamp(remoteJob);

      const latestJob = remoteTime > localTime ? remoteJob : existingJob;
      const mergedHistory = mergeEvaluationHistories(
        existingJob.evaluationHistory,
        remoteJob.evaluationHistory
      );

      jobMap.set(id, {
        ...latestJob,
        evaluationHistory: mergedHistory,
      });
    }
  }

  // 3. Return as array sorted by latest analysis/updated date descending
  return Array.from(jobMap.values()).sort((a, b) => getJobTimestamp(b) - getJobTimestamp(a));
}

/**
 * Smartly merge two UserProfiles.
 * Merges skill sets and certifications without loss, and preserves API keys.
 */
export function mergeProfile(
  localProfile: UserProfile,
  remoteProfile: UserProfile
): UserProfile {
  if (!localProfile) return remoteProfile;
  if (!remoteProfile) return localProfile;

  const localTime = localProfile.updatedAt ? new Date(localProfile.updatedAt).getTime() : 0;
  const remoteTime = remoteProfile.updatedAt ? new Date(remoteProfile.updatedAt).getTime() : 0;

  // Choose the newer profile as the base
  const baseProfile = remoteTime > localTime ? remoteProfile : localProfile;
  const secondaryProfile = remoteTime > localTime ? localProfile : remoteProfile;

  // Merge Skills without duplicates (by name/id)
  const skillMap = new Map<string, SkillItem>();
  for (const skill of [...(secondaryProfile.skills || []), ...(baseProfile.skills || [])]) {
    const key = (skill.name || skill.id || "").toLowerCase().trim();
    if (key) {
      skillMap.set(key, skill);
    }
  }

  // Merge Certifications without duplicates (by name/id)
  const certMap = new Map<string, CertificationItem>();
  for (const cert of [
    ...(secondaryProfile.certifications || []),
    ...(baseProfile.certifications || []),
  ]) {
    const key = (cert.name || cert.id || "").toLowerCase().trim();
    if (key) {
      certMap.set(key, cert);
    }
  }

  // Preserve Gemini API key if present on either device
  const mergedApiKey =
    baseProfile.apiSettings?.geminiApiKey?.trim() ||
    secondaryProfile.apiSettings?.geminiApiKey?.trim() ||
    "";

  return {
    ...baseProfile,
    skills: Array.from(skillMap.values()),
    certifications: Array.from(certMap.values()),
    apiSettings: {
      ...baseProfile.apiSettings,
      geminiApiKey: mergedApiKey,
    },
    updatedAt: new Date(Math.max(localTime, remoteTime, Date.now())).toISOString(),
  };
}
