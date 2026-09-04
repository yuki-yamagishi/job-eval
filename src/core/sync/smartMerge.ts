/**
 * Cloud SSoT Snapshot Engine
 * Pure deterministic snapshot application for Cloud Single Source of Truth (SSoT).
 * Replaces complex multi-master distributed merges with clean snapshot mirroring.
 */

import { JobAnalysisResult } from "@/types/job";
import { UserProfile } from "@/types/profile";

/**
 * Applies cloud jobs snapshot over local jobs.
 * Since Cloud is the Single Source of Truth (SSoT), the cloud snapshot is authoritative.
 * All deletions and modifications in the cloud completely replace local state.
 */
export function applyJobsSnapshot(
  _localJobs: JobAnalysisResult[],
  cloudJobs: JobAnalysisResult[]
): JobAnalysisResult[] {
  if (!Array.isArray(cloudJobs)) return _localJobs || [];
  return [...cloudJobs];
}

/**
 * Applies cloud profile snapshot over local profile.
 * If cloudProfile is provided, it completely replaces localProfile.
 * Safeguard: If local has a configured Gemini API key while cloud does not,
 * the local API key is preserved for user convenience.
 */
export function applyProfileSnapshot(
  localProfile: UserProfile | null | undefined,
  cloudProfile: UserProfile
): UserProfile {
  if (!cloudProfile) return localProfile || ({} as UserProfile);
  if (!localProfile) return cloudProfile;

  const localApiKey = localProfile.apiSettings?.geminiApiKey?.trim();
  const cloudApiKey = cloudProfile.apiSettings?.geminiApiKey?.trim();
  const effectiveApiKey = cloudApiKey || localApiKey || "";

  return {
    ...cloudProfile,
    apiSettings: {
      ...cloudProfile.apiSettings,
      geminiApiKey: effectiveApiKey,
    },
  };
}

// Backward-compatibility aliases
export const mergeJobs = applyJobsSnapshot;
export const mergeProfile = applyProfileSnapshot;
