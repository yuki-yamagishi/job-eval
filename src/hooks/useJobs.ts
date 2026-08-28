import { useState, useEffect, useCallback } from "react";
import { JobAnalysisResult } from "@/types/job";
import { storageAdapter } from "@/services/storage/storageAdapter";
import { getStandardMarkdownFilename } from "@/core/markdown/markdownGenerator";

export function useJobs() {
  const [jobs, setJobs] = useState<JobAnalysisResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchJobs = async () => {
      try {
        const data = await storageAdapter.loadJobs();
        if (isMounted) setJobs(data);
      } catch (err) {
        console.error("Failed to load saved jobs", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchJobs();
    return () => {
      isMounted = false;
    };
  }, []);

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
    saveJob,
    deleteJob,
    exportMarkdown,
  };
}
