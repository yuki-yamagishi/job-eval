import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PreviewPane } from "@/components/pane/PreviewPane";
import { JobAnalysisResult } from "@/types/job";

describe("PreviewPane Component", () => {
  const mockResult: JobAnalysisResult = {
    metadata: {
      id: "job-001",
      company: "テスト企業",
      title: "リードエンジニア",
      agentSource: "レバテックキャリア",
      dateAnalyzed: "2026-08-29",
      matchScore: 90,
      judgment: "S (即応募推奨)",
      status: "未検討",
      tags: ["Go", "AWS"],
    },
    scoreBreakdown: {
      skillMatchRatio: 95,
      conditionMatchRatio: 90,
      careerGrowthRatio: 90,
      environmentRiskRatio: 85,
    },
    positives: ["高待遇", "フルリモート"],
    concerns: ["リリース前の稼働"],
    agentQuestions: ["オンコールの頻度は？"],
    appealPoints: ["クラウド設計実績"],
    jobDetails: {
      mustRequirements: ["Go 3年以上"],
      wantRequirements: ["AWS 認定"],
      jobDescription: ["基幹システム刷新"],
      location: "東京都",
      selectionProcess: "書類 → 面接",
    },
    markdownContent: `# 【S (即応募推奨)】テスト企業 - リードエンジニア
## 📊 AI適合度判定サマリー
- 総合スコア: 90 / 100`,
  };

  it("renders empty state placeholder when no result provided", () => {
    render(<PreviewPane analysisResult={null} isAnalyzing={false} />);
    expect(screen.getByText("解析結果のリアルタイムプレビュー")).toBeDefined();
  });

  it("renders analyzing loading spinner when isAnalyzing is true", () => {
    render(<PreviewPane analysisResult={null} isAnalyzing={true} />);
    expect(screen.getByText("AIが求人票を構造化 & 評価中...")).toBeDefined();
  });

  it("renders rich view mode by default with score card and quick copy buttons", () => {
    render(<PreviewPane analysisResult={mockResult} isAnalyzing={false} />);

    expect(screen.getAllByText("テスト企業").length).toBeGreaterThan(0);
    expect(screen.getByText("リードエンジニア")).toBeDefined();
    expect(screen.getByText("90")).toBeDefined();
    expect(screen.getByText("S (即応募推奨)")).toBeDefined();
    expect(screen.getByText("質問のみコピー")).toBeDefined();
    expect(screen.getByText("アピール点コピー")).toBeDefined();
    expect(screen.getByText("Obsidian/Vault保存")).toBeDefined();
  });

  it("switches to split editor mode and raw mode on tab click", () => {
    render(<PreviewPane analysisResult={mockResult} isAnalyzing={false} />);

    // Click split mode
    const splitButton = screen.getByText("スプリット編集");
    fireEvent.click(splitButton);
    expect(screen.getByText(/Markdown エディタ/)).toBeDefined();
    expect(screen.getByText(/リアルタイム同期プレビュー/)).toBeDefined();

    // Click raw mode
    const rawButton = screen.getByText("Markdown");
    fireEvent.click(rawButton);
    expect(screen.getByText("Raw Frontmatter + Markdown")).toBeDefined();
  });

  it("triggers save callback with updated content", () => {
    const handleSave = vi.fn();
    render(<PreviewPane analysisResult={mockResult} isAnalyzing={false} onSaveMarkdown={handleSave} />);

    const saveBtn = screen.getByText("Obsidian/Vault保存");
    fireEvent.click(saveBtn);
    expect(handleSave).toHaveBeenCalledTimes(1);
    expect(handleSave).toHaveBeenCalledWith(mockResult.markdownContent);
  });

  it("renders qualification advice card when qualificationAdvice is present", () => {
    const resultWithAdvice: JobAnalysisResult = {
      ...mockResult,
      qualificationAdvice: {
        requiredCertifications: ["AWS SAA"],
        recommendedCertifications: ["AWS SAP", "AZ-305"],
        advice: "AWSの実務経験を資格でアピールすることを推奨。",
      },
    };

    render(<PreviewPane analysisResult={resultWithAdvice} isAnalyzing={false} />);
    expect(screen.getByText("資格・スキルギャップ補強アクション (求人最適化アドバイス)")).toBeDefined();
    expect(screen.getByText("AWS SAA")).toBeDefined();
    expect(screen.getByText("🎯 AWS SAP")).toBeDefined();
    expect(screen.getByText(/AWSの実務経験を資格でアピールすることを推奨/)).toBeDefined();
  });
});
