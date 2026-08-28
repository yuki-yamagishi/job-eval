import { useState, useMemo, useCallback } from "react";
import { JobAnalysisResult } from "@/types/job";

/**
 * Custom hook to manage multi-job selection and comparison matrix (FR-503)
 */
export function useJobComparison(jobs: JobAnalysisResult[], maxCompare: number = 3) {
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  const toggleSelectJob = useCallback((id: string) => {
    setSelectedJobIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= maxCompare) {
        alert(`比較できる求人は最大${maxCompare}件までです。`);
        return prev;
      }
      return [...prev, id];
    });
  }, [maxCompare]);

  const clearSelection = useCallback(() => {
    setSelectedJobIds([]);
  }, []);

  const selectedJobs = useMemo(() => {
    return jobs.filter((j) => selectedJobIds.includes(j.metadata.id));
  }, [jobs, selectedJobIds]);

  const canCompare = selectedJobIds.length >= 2;

  return {
    selectedJobIds,
    selectedJobs,
    isCompareOpen,
    setIsCompareOpen,
    toggleSelectJob,
    clearSelection,
    canCompare,
  };
}
