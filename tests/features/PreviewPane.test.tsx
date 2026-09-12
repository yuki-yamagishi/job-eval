import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
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

  it("renders re-evaluate with profile button and triggers callback", async () => {
    const handleReEvalProfile = vi.fn().mockResolvedValue(undefined);
    render(
      <PreviewPane
        analysisResult={mockResult}
        isAnalyzing={false}
        onReEvaluateWithProfile={handleReEvalProfile}
      />
    );

    const reEvalBtn = screen.getByText("最新プロファイルで再評価");
    expect(reEvalBtn).toBeDefined();

    await act(async () => {
      fireEvent.click(reEvalBtn);
    });
    expect(handleReEvalProfile).toHaveBeenCalledTimes(1);
  });

  it("renders evaluation history timeline and score diff badge when evaluationHistory exists", () => {
    const resultWithHistory: JobAnalysisResult = {
      ...mockResult,
      metadata: {
        ...mockResult.metadata,
        matchScore: 90,
      },
      evaluationHistory: [
        {
          id: "eval-001",
          date: "2026-08-20T10:00:00.000Z",
          triggerReason: "profile_update",
          score: 75,
          judgment: "B (要確認・検討)",
          scoreBreakdown: {
            skillMatchRatio: 70,
            conditionMatchRatio: 75,
            careerGrowthRatio: 80,
            environmentRiskRatio: 75,
          },
          positives: ["クラウド案件"],
          concerns: ["資格未取得"],
          summaryNote: "Azureスキル追加前の評価",
        },
      ],
    };

    render(<PreviewPane analysisResult={resultWithHistory} isAnalyzing={false} />);

    // Score diff badge (+15pt ↗ 前回75点)
    expect(screen.getByText(/\+15pt \(前回75点\)/)).toBeDefined();

    // History Timeline Accordion Trigger
    const historyBtn = screen.getByText("履歴を展開");
    expect(historyBtn).toBeDefined();

    // Open History Accordion
    fireEvent.click(historyBtn);
    expect(screen.getByText(/Azureスキル追加前の評価/)).toBeDefined();
    expect(screen.getByText("75点")).toBeDefined();
  });

  it("renders corporate benefit research button and calls onResearchCorporateBenefits callback", async () => {
    const handleResearch = vi.fn().mockResolvedValue(undefined);
    render(
      <PreviewPane
        analysisResult={mockResult}
        isAnalyzing={false}
        onResearchCorporateBenefits={handleResearch}
      />
    );

    const researchBtn = screen.getByText("福利厚生をWeb調査");
    expect(researchBtn).toBeDefined();

    await act(async () => {
      fireEvent.click(researchBtn);
    });
    expect(handleResearch).toHaveBeenCalledTimes(1);
  });

  it("renders corporate benefit research card when benefitResearch exists", () => {
    const resultWithBenefits: JobAnalysisResult = {
      ...mockResult,
      benefitResearch: {
        healthInsurance: {
          name: "関東ITソフトウェア健康保険組合 (ITS健保)",
          benefits: ["保養所・施設割引", "付加給付金制度"],
          confidence: "high",
        },
        corporateDC: {
          hasDC: true,
          matchingContribution: true,
          details: "確定拠出年金あり、マッチング拠出も可能",
        },
        workEnvironment: {
          annualHolidays: "125日",
          paidLeaveRate: "80%",
          sideJobAllowed: true,
        },
        summaryAdvice: "福利厚生の水準は極めて良好です。",
        sources: [
          { title: "採用FAQページ", url: "https://example.com/faq" },
        ],
        searchedAt: "2026-09-06T12:00:00Z",
      },
    };

    render(
      <PreviewPane
        analysisResult={resultWithBenefits}
        isAnalyzing={false}
      />
    );

    expect(screen.getByText(/企業・福利厚生Webリサーチ/)).toBeDefined();
    expect(screen.getByText(/関東ITソフトウェア健康保険組合 \(ITS健保\)/)).toBeDefined();
    expect(screen.getByText(/保養所・施設割引/)).toBeDefined();
    expect(screen.getByText(/確定拠出年金あり、マッチング拠出も可能/)).toBeDefined();
    expect(screen.getByText("採用FAQページ")).toBeDefined();
  });

  it("updates health insurance manually via direct text input and calls onUpdateJob (Scenario 4: researched card)", async () => {
    const handleUpdateJob = vi.fn();
    const resultWithBenefits: JobAnalysisResult = {
      ...mockResult,
      benefitResearch: {
        companyName: "テスト企業",
        researchedAt: "2026-09-06T12:00:00Z",
        healthInsurance: {
          type: "its",
          name: "関東ITソフトウェア健康保険組合 (ITS健保)",
          benefits: ["保養所・施設割引"],
          confidence: "high",
          takeHomeAdvantage: "高い（標準以上）",
        },
        specialBenefits: [],
        sources: [],
        disclaimer: "",
      },
    };

    render(
      <PreviewPane
        analysisResult={resultWithBenefits}
        isAnalyzing={false}
        onUpdateJob={handleUpdateJob}
      />
    );

    // 1. Click "健保名を直接編集" button
    const editBtn = screen.getByTitle("健保名を直接テキスト編集");
    expect(editBtn).toBeDefined();
    fireEvent.click(editBtn);

    // 2. Form is displayed with input and quick presets
    const input = screen.getByPlaceholderText(/サイバーエージェント健康保険組合/);
    expect(input).toBeDefined();

    // 3. Test empty input validation
    fireEvent.change(input, { target: { value: "   " } });
    const saveBtn = screen.getByText("保存");
    await act(async () => {
      fireEvent.click(saveBtn);
    });
    expect(handleUpdateJob).not.toHaveBeenCalled();
    expect(screen.getByText(/健保名を入力してください/)).toBeDefined();

    // 4. Enter custom corporate health insurance name
    fireEvent.change(input, { target: { value: "サイバーエージェント健康保険組合" } });
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    expect(handleUpdateJob).toHaveBeenCalledTimes(1);
    const updatedJob = handleUpdateJob.mock.calls[0][0] as JobAnalysisResult;
    expect(updatedJob.benefitResearch?.healthInsurance.name).toBe("サイバーエージェント健康保険組合");
    expect(["corporate", "other"]).toContain(updatedJob.benefitResearch?.healthInsurance.type);
    expect(updatedJob.markdownContent).toContain("サイバーエージェント健康保険組合");
  });

  it("sets health insurance using quick preset chips in direct editing mode", async () => {
    const handleUpdateJob = vi.fn();
    const resultWithBenefits: JobAnalysisResult = {
      ...mockResult,
      benefitResearch: {
        companyName: "テスト企業",
        researchedAt: "2026-09-06T12:00:00Z",
        healthInsurance: {
          type: "other",
          name: "出版健康保険組合",
          benefits: [],
          confidence: "medium",
        },
      },
    };

    render(
      <PreviewPane
        analysisResult={resultWithBenefits}
        isAnalyzing={false}
        onUpdateJob={handleUpdateJob}
      />
    );

    // Click edit
    fireEvent.click(screen.getByTitle("健保名を直接テキスト編集"));

    // Click quick preset chip "TJK健保"
    const tjkChip = screen.getByRole("button", { name: "TJK健保" });
    fireEvent.click(tjkChip);

    // Click save
    await act(async () => {
      fireEvent.click(screen.getByText("保存"));
    });

    expect(handleUpdateJob).toHaveBeenCalledTimes(1);
    const updatedJob = handleUpdateJob.mock.calls[0][0] as JobAnalysisResult;
    expect(updatedJob.benefitResearch?.healthInsurance.type).toBe("tjk");
    expect(updatedJob.benefitResearch?.healthInsurance.name).toBe("東京都情報サービス産業健康保険組合");
  });

  it("sets health insurance manually from unresearched banner and calls onUpdateJob (Scenario 4: unresearched banner)", async () => {
    const handleUpdateJob = vi.fn();

    render(
      <PreviewPane
        analysisResult={mockResult} // mockResult has no benefitResearch
        isAnalyzing={false}
        onUpdateJob={handleUpdateJob}
      />
    );

    // Find the select dropdown with title "健保を手動で設定"
    const select = screen.getByTitle("健保を手動で設定");
    expect(select).toBeDefined();

    // Select ITS
    await act(async () => {
      fireEvent.change(select, { target: { value: "its" } });
    });

    expect(handleUpdateJob).toHaveBeenCalledTimes(1);
    const updatedJob = handleUpdateJob.mock.calls[0][0] as JobAnalysisResult;
    expect(updatedJob.benefitResearch?.healthInsurance.type).toBe("its");
    expect(updatedJob.benefitResearch?.healthInsurance.name).toContain("関東ITソフトウェア");
    expect(updatedJob.markdownContent).toContain("[ITS健保]");
  });
});
