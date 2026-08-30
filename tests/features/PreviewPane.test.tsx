import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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

  it("handles user feedback input and triggers onReEvaluate callback", async () => {
    const handleReEvaluate = vi.fn().mockResolvedValue(undefined);
    render(
      <PreviewPane
        analysisResult={mockResult}
        isAnalyzing={false}
        onReEvaluate={handleReEvaluate}
      />
    );

    // Open feedback form
    const openBtn = screen.getByText("＋ フィードバックを入力");
    fireEvent.click(openBtn);

    const textarea = screen.getByPlaceholderText(/必須要件のPythonは独学/);
    fireEvent.change(textarea, { target: { value: "AWSの実務経験が3年あります。" } });

    const submitBtn = screen.getByText("🚀 フィードバックを反映して再評価");
    await waitFor(async () => {
      fireEvent.click(submitBtn);
    });

    expect(handleReEvaluate).toHaveBeenCalledWith("AWSの実務経験が3年あります。");
  });

  it("renders CareerTrajectory card when careerTrajectory is present", () => {
    const resultWithTrajectory: JobAnalysisResult = {
      ...mockResult,
      careerTrajectory: {
        acquiredSkills: ["マルチクラウドIaC基盤設計", "SRE推進"],
        nextCareerOptions: ["スタッフエンジニア", "CTO / VPoE"],
        marketValueProjection: "想定市場年収: 1,200万円 〜 1,500万円",
        careerRisksOrLockin: "保守比率の増加に注意",
        overallOutlook: "将来のCTOキャリアに直結する有望なポジションです。",
      },
    };

    render(<PreviewPane analysisResult={resultWithTrajectory} isAnalyzing={false} />);
    expect(screen.getByText(/入社後のキャリア展望 & 次のキャリアパス/)).toBeDefined();
    expect(screen.getByText(/マルチクラウドIaC基盤設計/)).toBeDefined();
    expect(screen.getByText("スタッフエンジニア")).toBeDefined();
    expect(screen.getByText("想定市場年収: 1,200万円 〜 1,500万円")).toBeDefined();
  });

  it("triggers onGenerateCareerTrajectory when generate button is clicked on older job", async () => {
    const handleGenerate = vi.fn().mockResolvedValue(undefined);
    render(
      <PreviewPane
        analysisResult={mockResult}
        isAnalyzing={false}
        onGenerateCareerTrajectory={handleGenerate}
      />
    );

    const generateBtn = screen.getByText(/キャリア展望をAI生成/);
    await waitFor(async () => {
      fireEvent.click(generateBtn);
    });

    expect(handleGenerate).toHaveBeenCalledWith(mockResult);
  });

  it("triggers onGenerateCareerTrajectory when regenerate button is clicked on existing trajectory", async () => {
    const handleGenerate = vi.fn().mockResolvedValue(undefined);
    const resultWithTrajectory: JobAnalysisResult = {
      ...mockResult,
      careerTrajectory: {
        acquiredSkills: ["IaC"],
        nextCareerOptions: ["VPoE"],
        marketValueProjection: "1200万",
        careerRisksOrLockin: "保守",
        overallOutlook: "良好",
      },
    };

    render(
      <PreviewPane
        analysisResult={resultWithTrajectory}
        isAnalyzing={false}
        onGenerateCareerTrajectory={handleGenerate}
      />
    );

    const regenerateBtn = screen.getByText("再生成");
    await waitFor(async () => {
      fireEvent.click(regenerateBtn);
    });

    expect(handleGenerate).toHaveBeenCalledWith(resultWithTrajectory);
  });

  it("switches scoring lens and recalculates score in real-time", () => {
    // mockResult breakdown: skill=95, condition=90, career=90, env=85
    render(<PreviewPane analysisResult={mockResult} isAnalyzing={false} />);

    // Default lens is current -> 90
    expect(screen.getByText("90")).toBeDefined();

    // Click Reskilling lens (skill: 10%, condition: 20%, growth: 45%, env: 25%)
    // 95*0.1 + 90*0.2 + 90*0.45 + 85*0.25 = 9.5 + 18 + 40.5 + 21.25 = 89.25 -> 89
    const reskillingPill = screen.getByText(/リスキリング重視/);
    fireEvent.click(reskillingPill);

    expect(screen.getByText("89")).toBeDefined();
    expect(screen.getByText("⚡ 視点シミュレーション中")).toBeDefined();

    // Click Culture lens (skill: 20%, condition: 30%, growth: 10%, env: 40%)
    // 95*0.2 + 90*0.3 + 90*0.1 + 85*0.4 = 19 + 27 + 9 + 34 = 89
    const culturePill = screen.getByText(/カルチャー・WLB重視/);
    fireEvent.click(culturePill);

    expect(screen.getByText("89")).toBeDefined();
  });
});
