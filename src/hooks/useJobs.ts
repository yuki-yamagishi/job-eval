import { useState, useEffect, useCallback } from "react";
import { JobAnalysisResult, JobStatus } from "@/types/job";
import { storageAdapter } from "@/services/storage/storageAdapter";
import { getStandardMarkdownFilename, parseJobMarkdown } from "@/core/markdown/markdownGenerator";

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

  const updateJobStatus = useCallback(async (id: string, newStatus: JobStatus) => {
    setJobs((prev) => {
      const target = prev.find((j) => j.metadata.id === id);
      if (!target) return prev;

      const updatedMetadata = { ...target.metadata, status: newStatus };
      
      // Update status in markdown Frontmatter
      let updatedMarkdown = target.markdownContent;
      const parsed = parseJobMarkdown(target.markdownContent);
      if (parsed.frontmatterRaw) {
        const updatedFrontmatter = parsed.frontmatterRaw.replace(
          /status:\s*"?[^"\n\r]*"?/,
          `status: "${newStatus}"`
        );
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

  const deleteJob = useCallback(async (id: string) => {
    await storageAdapter.deleteJob(id);
    setJobs((prev) => prev.filter((j) => j.metadata.id !== id));
  }, []);

  const exportMarkdown = useCallback(async (job: JobAnalysisResult) => {
    const filename = getStandardMarkdownFilename(job.metadata);
    return await storageAdapter.exportMarkdownFile(filename, job.markdownContent);
  }, []);

  return {
    jobs,
    isLoading,
    fetchJobs,
    saveJob,
    updateJobStatus,
    deleteJob,
    exportMarkdown,
  };
}
