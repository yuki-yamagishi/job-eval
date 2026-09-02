import { useState, useEffect, useCallback } from "react";
import { JobAnalysisResult, JobStatus, EvaluationTriggerReason } from "@/types/job";
import { UserProfile } from "@/types/profile";
import { storageAdapter } from "@/services/storage/storageAdapter";
import {
  getStandardMarkdownFilename,
  parseJobMarkdown,
  parseJobMarkdownToJobResult,
} from "@/core/markdown/markdownGenerator";
import { reEvaluateJobFromOriginalText } from "@/services/ai/aiService";

export interface BatchReEvaluationProgress {
  currentJobId: string;
  currentIndex: number;
  total: number;
  completedJobs: JobAnalysisResult[];
  failedJobIds: string[];
}

export function useJobs() {
  const [jobs, setJobs] = useState<JobAnalysisResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchJobs = useCallback(async () => {
    try {
      const data = await storageAdapter.loadJobs();
      setJobs(data);
    } catch (err) {
      console.error("Failed to load saved jobs", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();

    // Subscribe to real-time updates from other devices / tabs
    if (storageAdapter.subscribeJobs) {
      const unsubscribe = storageAdapter.subscribeJobs((updatedJobs) => {
        setJobs(updatedJobs);
      });
      return () => {
        unsubscribe();
      };
    }
  }, [fetchJobs]);

  const saveJob = useCallback(async (job: JobAnalysisResult) => {
    await storageAdapter.saveJob(job);
    setJobs((prev) => {
      const idx = prev.findIndex((j) => j.metadata.id === job.metadata.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = job;
        return copy;
      }
      return [job, ...prev];
    });
  }, []);

  const updateJobStatus = useCallback(async (id: string, newStatus: JobStatus, rejectReason?: string) => {
    setJobs((prev) => {
      const target = prev.find((j) => j.metadata.id === id);
      if (!target) return prev;

      const updatedMetadata = {
        ...target.metadata,
        status: newStatus,
        rejectReason: rejectReason !== undefined ? rejectReason : target.metadata.rejectReason,
      };
      
      // Update status in markdown Frontmatter
      let updatedMarkdown = target.markdownContent;
      const parsed = parseJobMarkdown(target.markdownContent);
      if (parsed.frontmatterRaw) {
        let updatedFrontmatter = parsed.frontmatterRaw.replace(
          /status:\s*"?[^"\n\r]*"?/,
          `status: "${newStatus}"`
        );
        if (rejectReason) {
          if (/reject_reason:/.test(updatedFrontmatter)) {
            updatedFrontmatter = updatedFrontmatter.replace(
              /reject_reason:\s*"?[^"\n\r]*"?/,
              `reject_reason: "${rejectReason}"`
            );
          } else {
            updatedFrontmatter += `\nreject_reason: "${rejectReason}"`;
          }
        }
        updatedMarkdown = `---\n${updatedFrontmatter}\n---\n\n${parsed.body.trim()}\n`;
      }

      const updatedJob: JobAnalysisResult = {
        ...target,
        metadata: updatedMetadata,
        markdownContent: updatedMarkdown,
      };

      // Persist to storage
      storageAdapter.saveJob(updatedJob);

      return prev.map((j) => (j.metadata.id === id ? updatedJob : j));
    });
  }, []);

  const importJobFromMarkdown = useCallback(async (markdownContent: string): Promise<JobAnalysisResult> => {
    const importedResult = parseJobMarkdownToJobResult(markdownContent);
    await saveJob(importedResult);
    return importedResult;
  }, [saveJob]);

  const deleteJob = useCallback(async (id: string) => {
    await storageAdapter.deleteJob(id);
    setJobs((prev) => prev.filter((j) => j.metadata.id !== id));
  }, []);

  const exportMarkdown = useCallback(async (job: JobAnalysisResult) => {
    const filename = getStandardMarkdownFilename(job.metadata);
    return await storageAdapter.exportMarkdownFile(filename, job.markdownContent);
  }, []);

  /**
   * Re-evaluates a single job with the latest profile and persists changes immediately.
   */
  const reEvaluateJob = useCallback(
    async (
      jobId: string,
      profile: UserProfile,
      triggerReason: EvaluationTriggerReason = "profile_update",
      summaryNote?: string
    ): Promise<JobAnalysisResult> => {
      const currentJobs = await storageAdapter.loadJobs();
      const target = currentJobs.find((j) => j.metadata.id === jobId) || jobs.find((j) => j.metadata.id === jobId);
      if (!target) {
        throw new Error(`求人ID '${jobId}' が見つかりません。`);
      }

      const updated = await reEvaluateJobFromOriginalText(target, profile, triggerReason, summaryNote);
      await saveJob(updated);
      return updated;
    },
    [jobs, saveJob]
  );

  /**
   * Re-evaluates multiple jobs sequentially (1 request per job, max 5)
   * with realtime progress notifications and safe incremental saves.
   */
  const reEvaluateBatchJobs = useCallback(
    async (
      jobIds: string[],
      profile: UserProfile,
      onProgress?: (progress: BatchReEvaluationProgress) => void,
      triggerReason: EvaluationTriggerReason = "profile_update",
      shouldCancel?: () => boolean
    ): Promise<{ completed: JobAnalysisResult[]; failed: string[] }> => {
      const completed: JobAnalysisResult[] = [];
      const failed: string[] = [];

      // Limit to 5 jobs max for rate limiting safety
      const targetIds = jobIds.slice(0, 5);

      for (let i = 0; i < targetIds.length; i++) {
        if (shouldCancel && shouldCancel()) {
          break;
        }

        const jobId = targetIds[i];
        if (onProgress) {
          onProgress({
            currentJobId: jobId,
            currentIndex: i + 1,
            total: targetIds.length,
            completedJobs: completed,
            failedJobIds: failed,
          });
        }

        try {
          const updated = await reEvaluateJob(jobId, profile, triggerReason);
          completed.push(updated);
        } catch (err) {
          console.error(`Batch re-evaluation failed for job ${jobId}:`, err);
          failed.push(jobId);
        }

        if (onProgress) {
          onProgress({
            currentJobId: jobId,
            currentIndex: i + 1,
            total: targetIds.length,
            completedJobs: completed,
            failedJobIds: failed,
          });
        }
      }

      return { completed, failed };
    },
    [reEvaluateJob]
  );

  const recalculateAllJobsWithWeights = useCallback(
    async (weights: import("@/types/profile").ScoringWeights) => {
      const { recalculateScoreWithWeights } = await import("@/core/scoring/scoringEngine");
      
      const currentJobs = await storageAdapter.loadJobs();
      const updatedJobs: JobAnalysisResult[] = currentJobs.map((job) => {
        const hasNg = job.concerns?.some((c) => c.includes("NG条件")) ?? false;
        const { totalScore, judgment } = recalculateScoreWithWeights(job.scoreBreakdown, weights, hasNg);

        const updatedMetadata = {
          ...job.metadata,
          matchScore: totalScore,
          judgment,
        };

        let updatedMarkdown = job.markdownContent;
        const parsed = parseJobMarkdown(job.markdownContent);
        if (parsed.frontmatterRaw) {
          let updatedFrontmatter = parsed.frontmatterRaw
            .replace(/match_score:\s*\d+/, `match_score: ${totalScore}`)
            .replace(/judgment:\s*"?[^"\n\r]*"?/, `judgment: "${judgment}"`);

          let updatedBody = parsed.body
            .replace(/# 【[^】]+】/, `# 【${judgment}】`)
            .replace(/- \*\*総合スコア\*\*:\s*\*\*\d+\s*\/\s*100\*\*/, `- **総合スコア**: **${totalScore} / 100**`);

          updatedMarkdown = `---\n${updatedFrontmatter}\n---\n\n${updatedBody.trim()}\n`;
        }

        return {
          ...job,
          metadata: updatedMetadata,
          markdownContent: updatedMarkdown,
        };
      });

      for (const updatedJob of updatedJobs) {
        await storageAdapter.saveJob(updatedJob);
      }

      setJobs(updatedJobs);
      return updatedJobs;
    },
    []
  );

  return {
    jobs,
    isLoading,
    fetchJobs,
    saveJob,
    updateJobStatus,
    importJobFromMarkdown,
    deleteJob,
    exportMarkdown,
    recalculateAllJobsWithWeights,
    reEvaluateJob,
    reEvaluateBatchJobs,
  };
}
