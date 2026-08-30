import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { JobDashboard } from "@/components/dashboard/JobDashboard";
import { JobAnalysisResult } from "@/types/job";

describe("JobDashboard Component", () => {
  const mockJobs: JobAnalysisResult[] = [
    {
      metadata: {
        id: "job-001",
        company: "株式会社アルファ",
        title: "リードクラウドアーキテクト",
        agentSource: "レバテックキャリア",
        dateAnalyzed: "2026-08-29",
        salaryMin: 900,
        salaryMax: 1200,
        matchScore: 92,
        judgment: "S (即応募推奨)",
        status: "応募済",
        tags: ["AWS", "Azure"],
      },
      scoreBreakdown: {
        skillMatchRatio: 95,
        conditionMatchRatio: 90,
        careerGrowthRatio: 90,
        environmentRiskRatio: 90,
      },
      positives: ["高待遇", "フルリモート"],
      concerns: ["リリース前稼働"],
      agentQuestions: ["オンコール頻度"],
      appealPoints: ["クラウド設計実績"],
      jobDetails: {
        mustRequirements: ["Azure 3年以上"],
        wantRequirements: ["AZ-305"],
        jobDescription: ["全社クラウド刷新"],
        location: "東京都港区",
        selectionProcess: "書類 → 面接",
      },
      markdownContent: "Markdown Content 1",
    },
    {
      metadata: {
        id: "job-002",
        company: "株式会社ベータ",
        title: "シニアバックエンドエンジニア",
        agentSource: "ビズリーチ",
        dateAnalyzed: "2026-08-28",
        salaryMin: 800,
        salaryMax: 1000,
        matchScore: 85,
        judgment: "A (即応募推奨)",
        status: "書類通過",
        tags: ["Go", "Kubernetes"],
      },
      scoreBreakdown: {
        skillMatchRatio: 85,
        conditionMatchRatio: 85,
        careerGrowthRatio: 85,
        environmentRiskRatio: 85,
      },
      positives: ["マイクロサービス化"],
      concerns: ["特になし"],
      agentQuestions: ["チーム体制"],
      appealPoints: ["Go開発実績"],
      jobDetails: {
        mustRequirements: ["Go 2年以上"],
        wantRequirements: ["Kubernetes運用"],
        jobDescription: ["API基盤開発"],
        location: "東京都渋谷区",
        selectionProcess: "書類 → 一次 → 最終",
      },
      markdownContent: "Markdown Content 2",
    },
  ];

  it("renders empty state when no saved jobs exist", () => {
    render(<JobDashboard savedJobs={[]} />);
    expect(screen.getByText("保存された求人ファイルがまだありません")).toBeDefined();
  });

  it("renders job list table with company names, scores, and statuses (FR-501, FR-502)", () => {
    render(<JobDashboard savedJobs={mockJobs} />);

    expect(screen.getByText("株式会社アルファ")).toBeDefined();
    expect(screen.getByText("リードクラウドアーキテクト")).toBeDefined();
    expect(screen.getByText("92点")).toBeDefined();

    expect(screen.getByText("株式会社ベータ")).toBeDefined();
    expect(screen.getByText("シニアバックエンドエンジニア")).toBeDefined();
    expect(screen.getByText("85点")).toBeDefined();
  });

  it("filters jobs based on search query", () => {
    render(<JobDashboard savedJobs={mockJobs} />);

    const searchInput = screen.getByPlaceholderText(/企業名、職種、技術タグ/);
    fireEvent.change(searchInput, { target: { value: "アルファ" } });

    expect(screen.getByText("株式会社アルファ")).toBeDefined();
    expect(screen.queryByText("株式会社ベータ")).toBeNull();
  });

  it("triggers status update callback when selecting different status (FR-502)", () => {
    const handleUpdateStatus = vi.fn();
    render(<JobDashboard savedJobs={mockJobs} onUpdateStatus={handleUpdateStatus} />);

    // Find the status select within the table row
    const statusSelects = screen.getAllByDisplayValue("応募済");
    expect(statusSelects.length).toBeGreaterThan(0);
    fireEvent.change(statusSelects[0], { target: { value: "内定" } });

    expect(handleUpdateStatus).toHaveBeenCalledWith("job-001", "内定");
  });

  it("opens comparison matrix modal when selecting 2 jobs (FR-503)", () => {
    render(<JobDashboard savedJobs={mockJobs} />);

    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[1]);

    const compareBtn = screen.getByText(/選択.*求人を比較 \(2件\)/);
    expect(compareBtn).toBeDefined();

    fireEvent.click(compareBtn);

    // Modal should be visible
    expect(screen.getByText(/複数求人の比較マトリクス \(FR-503\)/)).toBeDefined();
    expect(screen.getAllByText("主なポジティブ要素").length).toBe(2);
  });

  it("calls onSelectJobForPreview when preview button is clicked", () => {
    const handlePreview = vi.fn();
    render(<JobDashboard savedJobs={mockJobs} onSelectJobForPreview={handlePreview} />);

    const previewButtons = screen.getAllByText("再表示");
    fireEvent.click(previewButtons[0]);

    expect(handlePreview).toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({ id: "job-001" })
    }));
  });

  it("switches scoring lens in dashboard filter bar", () => {
    render(<JobDashboard savedJobs={mockJobs} />);

    // Find the lens selector by option text
    const lensSelect = screen.getByDisplayValue(/保存時基準/);
    expect(lensSelect).toBeDefined();

    // Switch to Reskilling preset
    fireEvent.change(lensSelect, { target: { value: "reskilling" } });

    // Verify recalculated score is rendered for job-001 (breakdown: 95, 90, 90, 90)
    // 95*0.1 + 90*0.2 + 90*0.45 + 90*0.25 = 9.5 + 18 + 40.5 + 22.5 = 90.5 -> 91点
    expect(screen.getByText("91点")).toBeDefined();
  });
});
