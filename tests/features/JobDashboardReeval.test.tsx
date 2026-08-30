import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { JobDashboard } from "@/components/dashboard/JobDashboard";
import { JobAnalysisResult } from "@/types/job";

describe("JobDashboard Re-evaluation Features", () => {
  const mockJobs: JobAnalysisResult[] = [
    {
      metadata: {
        id: "job-001",
        company: "株式会社アルファ",
        title: "クラウドアーキテクト",
        agentSource: "レバテックキャリア",
        dateAnalyzed: "2026-08-29",
        salaryMin: 900,
        salaryMax: 1200,
        matchScore: 80,
        judgment: "A (即応募推奨)",
        status: "応募検討中",
        tags: ["AWS"],
      },
      originalJobText: "株式会社アルファの求人",
      scoreBreakdown: {
        skillMatchRatio: 80,
        conditionMatchRatio: 80,
        careerGrowthRatio: 80,
        environmentRiskRatio: 80,
      },
      positives: ["高年収"],
      concerns: ["稼働高め"],
      agentQuestions: [],
      appealPoints: [],
      jobDetails: {
        mustRequirements: ["AWS 3年"],
        wantRequirements: [],
        jobDescription: ["インフラ設計"],
        location: "東京都",
        selectionProcess: "書類 → 面接",
      },
      markdownContent: "MD 1",
    },
    {
      metadata: {
        id: "job-002",
        company: "株式会社ベータ",
        title: "Goエンジニア",
        agentSource: "ビズリーチ",
        dateAnalyzed: "2026-08-28",
        salaryMin: 800,
        salaryMax: 1000,
        matchScore: 85,
        judgment: "A (即応募推奨)",
        status: "書類通過",
        tags: ["Go"],
      },
      originalJobText: "株式会社ベータの求人",
      scoreBreakdown: {
        skillMatchRatio: 85,
        conditionMatchRatio: 85,
        careerGrowthRatio: 85,
        environmentRiskRatio: 85,
      },
      positives: ["Go開発"],
      concerns: [],
      agentQuestions: [],
      appealPoints: [],
      jobDetails: {
        mustRequirements: ["Go 2年"],
        wantRequirements: [],
        jobDescription: ["API開発"],
        location: "東京都",
        selectionProcess: "書類 → 面接",
      },
      markdownContent: "MD 2",
    },
  ];

  it("triggers individual re-evaluation when clicking action button in table", async () => {
    const handleReEvaluateJob = vi.fn().mockResolvedValue(undefined);
    render(
      <JobDashboard
        savedJobs={mockJobs}
        onReEvaluateJob={handleReEvaluateJob}
      />
    );

    const reEvalButtons = screen.getAllByTitle("最新プロファイルでAI再評価");
    expect(reEvalButtons.length).toBeGreaterThan(0);

    fireEvent.click(reEvalButtons[0]);
    expect(handleReEvaluateJob).toHaveBeenCalledWith("job-001");
  });

  it("opens batch re-evaluation modal when jobs are selected and button is clicked", () => {
    const handleBatch = vi.fn().mockResolvedValue({ completed: [], failed: [] });
    render(
      <JobDashboard
        savedJobs={mockJobs}
        onReEvaluateBatchJobs={handleBatch}
      />
    );

    // Select 2 jobs
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[1]);

    // Batch button should appear
    const batchBtn = screen.getByText(/選択求人を再評価 \(2件\)/);
    expect(batchBtn).toBeDefined();

    // Click batch button
    fireEvent.click(batchBtn);

    // Modal should be open
    expect(screen.getByText("選択求人の一括AI再評価")).toBeDefined();
    expect(screen.getByText(/再評価対象の求人 \(2件\)/)).toBeDefined();
    expect(screen.getByText("再評価を開始 (2件)")).toBeDefined();
  });

  it("executes batch re-evaluation and updates modal states", async () => {
    const handleBatch = vi.fn().mockImplementation(async (ids, onProgress) => {
      if (onProgress) {
        onProgress({
          currentJobId: "job-001",
          currentIndex: 1,
          total: 2,
          completedJobs: [mockJobs[0]],
          failedJobIds: [],
        });
      }
      return { completed: [mockJobs[0], mockJobs[1]], failed: [] };
    });

    render(
      <JobDashboard
        savedJobs={mockJobs}
        onReEvaluateBatchJobs={handleBatch}
      />
    );

    // Select job and open modal
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]);

    const batchBtn = screen.getByText(/選択求人を再評価/);
    fireEvent.click(batchBtn);

    // Start execution
    const startBtn = screen.getByText(/再評価を開始/);
    await waitFor(async () => {
      fireEvent.click(startBtn);
    });

    expect(handleBatch).toHaveBeenCalledTimes(1);
  });
});
