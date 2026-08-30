import { describe, it, expect } from "vitest";
import {
  cleanJobText,
  buildJobAnalysisPrompt,
  buildJobReEvaluationPrompt,
  buildCareerTrajectoryPrompt,
  GEMINI_JOB_ANALYSIS_SCHEMA,
} from "@/core/prompt/jobAnalysisPrompt";
import { TEST_MOCK_PROFILE } from "../fixtures/sampleProfile";

describe("jobAnalysisPrompt", () => {
  it("cleans up excess whitespace and newlines properly", () => {
    const raw = "  企業名:  テスト株式会社  \n\n\n\n\n職種:  アーキテクト  \t\t\n";
    const cleaned = cleanJobText(raw);
    expect(cleaned).toBe("企業名: テスト株式会社\n\n職種: アーキテクト");
  });

  it("builds prompt embedding user profile, skills, and NG conditions", () => {
    const { systemInstruction, userPrompt } = buildJobAnalysisPrompt(
      "募集職種: クラウドエンジニア",
      "レバテックキャリア",
      TEST_MOCK_PROFILE
    );

    // System instruction checks
    expect(systemInstruction).toContain("AI転職アドバイザー");
    expect(systemInstruction).toContain("スキル合致度 (40%)");

    // User prompt checks
    expect(userPrompt).toContain(TEST_MOCK_PROFILE.name);
    expect(userPrompt).toContain("Azure");
    expect(userPrompt).toContain("希望年収レンジ: 800万円 〜 1100万円");
    expect(userPrompt).toContain("客先常駐");
    expect(userPrompt).toContain("レバテックキャリア");
  });

  it("includes valid JSON schema with required fields and qualification_advice", () => {
    expect(GEMINI_JOB_ANALYSIS_SCHEMA.type).toBe("object");
    expect(GEMINI_JOB_ANALYSIS_SCHEMA.required).toContain("company");
    expect(GEMINI_JOB_ANALYSIS_SCHEMA.required).toContain("match_score");
    expect(GEMINI_JOB_ANALYSIS_SCHEMA.required).toContain("judgment");
    expect(GEMINI_JOB_ANALYSIS_SCHEMA.required).toContain("score_breakdown");
    expect(GEMINI_JOB_ANALYSIS_SCHEMA.required).toContain("agent_questions");
    expect(GEMINI_JOB_ANALYSIS_SCHEMA.required).toContain("appeal_points");
    expect(GEMINI_JOB_ANALYSIS_SCHEMA.properties.qualification_advice).toBeDefined();
    expect(GEMINI_JOB_ANALYSIS_SCHEMA.properties.qualification_advice.required).toContain("recommended_certifications");
  });

  it("separates acquired vs planned certifications and experienced vs learning skills", () => {
    const customProfile = {
      ...TEST_MOCK_PROFILE,
      skills: [
        { id: "s-1", name: "Go", category: "language" as const, status: "experienced" as const },
        { id: "s-2", name: "Rust", category: "language" as const, status: "learning" as const },
      ],
      certifications: [
        { id: "c-1", name: "AZ-305", issuer: "Microsoft", status: "acquired" as const, yearAcquired: 2024 },
        { id: "c-2", name: "AZ-400", issuer: "Microsoft", status: "studying" as const, targetPeriod: "2026年Q3" },
      ],
    };

    const { userPrompt } = buildJobAnalysisPrompt("求人票本文", "ビズリーチ", customProfile);
    expect(userPrompt).toContain("実務経験技術スタック: Go");
    expect(userPrompt).toContain("学習中・習得予定技術: Rust (独学・学習中)");
    expect(userPrompt).toContain("取得済み認定資格: AZ-305 (2024年取得, 発行元: Microsoft)");
    expect(userPrompt).toContain("学習中・取得目標資格: AZ-400 (現在学習中/受験予定, 目標: 2026年Q3, 発行元: Microsoft)");
  });

  it("builds re-evaluation prompt containing previous score and user feedback", () => {
    const mockPreviousResult: import("@/types/job").JobAnalysisResult = {
      metadata: {
        id: "job-1",
        company: "株式会社テスト",
        title: "SREリード",
        agentSource: "ビズリーチ",
        dateAnalyzed: "2026-08-30",
        matchScore: 78,
        judgment: "B (要確認・検討)",
        status: "応募検討中",
        tags: ["SRE", "Terraform"],
      },
      scoreBreakdown: {
        skillMatchRatio: 75,
        conditionMatchRatio: 80,
        careerGrowthRatio: 80,
        environmentRiskRatio: 75,
      },
      positives: ["Terraformの知見を活かせる"],
      concerns: ["Python実務経験の不足"],
      agentQuestions: ["オンコールの頻度"],
      appealPoints: ["インフラ自動化実績"],
      jobDetails: {
        mustRequirements: ["Python実務3年以上"],
        wantRequirements: [],
        jobDescription: ["全社インフラのSRE推進"],
        location: "東京",
        selectionProcess: "面接2回",
      },
      markdownContent: "# テスト",
    };

    const { systemInstruction, userPrompt } = buildJobReEvaluationPrompt(
      mockPreviousResult,
      "実はPythonは個人開発でFastAPIアプリを複数本運用しており、実務相当の知識があります。",
      TEST_MOCK_PROFILE
    );

    expect(systemInstruction).toContain("再評価（フィードバック反映）の特別指示");
    expect(userPrompt).toContain("前回のAI評価結果");
    expect(userPrompt).toContain("総合適合スコア: 78点");
    expect(userPrompt).toContain("実はPythonは個人開発でFastAPIアプリを複数本運用しており");
  });

  it("builds dedicated career trajectory prompt with position and requirements", () => {
    const mockResult: import("@/types/job").JobAnalysisResult = {
      metadata: {
        id: "job-ct-1",
        company: "株式会社クラウド未来",
        title: "プリンシパルアーキテクト",
        agentSource: "ビズリーチ",
        dateAnalyzed: "2026-08-30",
        matchScore: 92,
        judgment: "S (即応募推奨)",
        status: "応募検討中",
        tags: ["Cloud", "IaC"],
      },
      scoreBreakdown: {
        skillMatchRatio: 90,
        conditionMatchRatio: 90,
        careerGrowthRatio: 95,
        environmentRiskRatio: 90,
      },
      positives: [],
      concerns: [],
      agentQuestions: [],
      appealPoints: [],
      jobDetails: {
        mustRequirements: ["大規模クラウド設計実績 5年以上"],
        wantRequirements: [],
        jobDescription: ["全社クラウドガバナンス策定"],
        location: "東京",
        selectionProcess: "面接",
      },
      markdownContent: "#",
    };

    const { systemInstruction, userPrompt } = buildCareerTrajectoryPrompt(mockResult, TEST_MOCK_PROFILE);
    expect(systemInstruction).toContain("中長期キャリア展望 (Career Trajectory)");
    expect(userPrompt).toContain("企業名: 株式会社クラウド未来");
    expect(userPrompt).toContain("募集職種: プリンシパルアーキテクト");
    expect(userPrompt).toContain("大規模クラウド設計実績 5年以上");
  });
});
