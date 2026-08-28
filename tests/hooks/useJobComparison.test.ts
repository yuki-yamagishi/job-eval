import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useJobComparison } from "@/hooks/useJobComparison";
import { JobAnalysisResult } from "@/types/job";

describe("useJobComparison Hook", () => {
  const mockJobs: JobAnalysisResult[] = [
    {
      metadata: {
        id: "job-1",
        company: "企業A",
        title: "エンジニアA",
        agentSource: "レバテックキャリア",
        dateAnalyzed: "2026-08-29",
        matchScore: 90,
        judgment: "S (即応募推奨)",
        status: "未検討",
        tags: ["AWS"],
      },
      scoreBreakdown: {
        skillMatchRatio: 90,
        conditionMatchRatio: 90,
        careerGrowthRatio: 90,
        environmentRiskRatio: 90,
      },
      positives: ["ポジティブA"],
      concerns: ["懸念A"],
      agentQuestions: ["質問A"],
      appealPoints: ["アピールA"],
      jobDetails: {
        mustRequirements: ["要件A"],
        wantRequirements: [],
        jobDescription: [],
        location: "東京",
        selectionProcess: "書類選考",
      },
      markdownContent: "MD 1",
    },
    {
      metadata: {
        id: "job-2",
        company: "企業B",
        title: "エンジニアB",
        agentSource: "ビズリーチ",
        dateAnalyzed: "2026-08-29",
        matchScore: 80,
        judgment: "A (即応募推奨)",
        status: "応募済",
        tags: ["Go"],
      },
      scoreBreakdown: {
        skillMatchRatio: 80,
        conditionMatchRatio: 80,
        careerGrowthRatio: 80,
        environmentRiskRatio: 80,
      },
      positives: ["ポジティブB"],
      concerns: ["懸念B"],
      agentQuestions: ["質問B"],
      appealPoints: ["アピールB"],
      jobDetails: {
        mustRequirements: ["要件B"],
        wantRequirements: [],
        jobDescription: [],
        location: "東京",
        selectionProcess: "書類選考",
      },
      markdownContent: "MD 2",
    },
  ];

  it("manages job selection and limits to max compare limit", () => {
    const { result } = renderHook(() => useJobComparison(mockJobs, 2));

    expect(result.current.selectedJobIds).toEqual([]);
    expect(result.current.canCompare).toBe(false);

    // Select job-1
    act(() => {
      result.current.toggleSelectJob("job-1");
    });
    expect(result.current.selectedJobIds).toEqual(["job-1"]);
    expect(result.current.selectedJobs.length).toBe(1);
    expect(result.current.canCompare).toBe(false);

    // Select job-2
    act(() => {
      result.current.toggleSelectJob("job-2");
    });
    expect(result.current.selectedJobIds).toEqual(["job-1", "job-2"]);
    expect(result.current.selectedJobs.length).toBe(2);
    expect(result.current.canCompare).toBe(true);

    // Unselect job-1
    act(() => {
      result.current.toggleSelectJob("job-1");
    });
    expect(result.current.selectedJobIds).toEqual(["job-2"]);
    expect(result.current.canCompare).toBe(false);
  });

  it("clears selection on clearSelection", () => {
    const { result } = renderHook(() => useJobComparison(mockJobs, 2));

    act(() => {
      result.current.toggleSelectJob("job-1");
      result.current.clearSelection();
    });

    expect(result.current.selectedJobIds).toEqual([]);
  });
});
