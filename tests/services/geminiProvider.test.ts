import { describe, it, expect } from "vitest";
import { GeminiAiProvider } from "@/services/ai/geminiProvider";

describe("GeminiAiProvider", () => {
  const provider = new GeminiAiProvider();

  it("transforms valid raw Gemini JSON into JobAnalysisResult and Markdown", () => {
    const mockRawJson = {
      company: "株式会社AIイノベーション",
      title: "シニアMLエンジニア",
      salary_min: 900,
      salary_max: 1300,
      location: "東京都渋谷区",
      is_remote: true,
      match_score: 92,
      judgment: "S (即応募推奨)",
      score_breakdown: {
        skill_match_ratio: 95,
        condition_match_ratio: 90,
        career_growth_ratio: 90,
        environment_risk_ratio: 90,
      },
      tags: ["Python", "PyTorch", "LLM", "FullRemote"],
      positives: ["最先端LLM基盤開発に携われる", "フルリモート・フルフレックス"],
      concerns: ["リリース前の稼働確認が必要"],
      agent_questions: ["GPUクラスタの規模と予算", "チーム内リードの裁量範囲"],
      appeal_points: ["大規模モデルのチューニング実績", "Python高速化の知見"],
      must_requirements: ["Python実務 5年以上", "機械学習基盤設計 3年以上"],
      want_requirements: ["OSSコントリビューション経験"],
      job_description: ["社内LLMプラットフォームの開発・運用"],
      selection_process: "書類選考 → 一次面接 → 最終役員面接",
    };

    const result = provider.transformToJobAnalysisResult(mockRawJson, "ビズリーチ");

    expect(result.metadata.company).toBe("株式会社AIイノベーション");
    expect(result.metadata.matchScore).toBe(92);
    expect(result.metadata.judgment).toBe("S (即応募推奨)");
    expect(result.positives.length).toBe(2);
    expect(result.concerns.length).toBe(1);
    expect(result.agentQuestions.length).toBe(2);
    expect(result.appealPoints.length).toBe(2);

    // Markdown content assertion
    expect(result.markdownContent).toContain("# 【S (即応募推奨)】株式会社AIイノベーション - シニアMLエンジニア");
    expect(result.markdownContent).toContain("agent_source: ビズリーチ");
    expect(result.markdownContent).toContain("salary_min: 900");
  });

  it("handles incomplete/partial raw JSON safely with defaults", () => {
    const partialRaw = {
      company: "株式会社スタートアップ",
      title: "エンジニア",
    };

    const result = provider.transformToJobAnalysisResult(partialRaw, "その他");

    expect(result.metadata.company).toBe("株式会社スタートアップ");
    expect(result.metadata.title).toBe("エンジニア");
    expect(result.metadata.matchScore).toBe(75);
    expect(result.metadata.judgment).toBe("B (要確認・検討)");
    expect(result.markdownContent).toBeDefined();
  });

  it("extracts qualification_advice correctly into result and markdown", () => {
    const rawWithAdvice = {
      company: "テスト株式会社",
      title: "クラウドエンジニア",
      qualification_advice: {
        required_certifications: ["AWS SAA"],
        recommended_certifications: ["AWS SAP", "CKA"],
        advice: "AWSの実務未経験を補うためプロフェッショナル資格の取得を推奨。",
      },
    };

    const result = provider.transformToJobAnalysisResult(rawWithAdvice, "doda");
    expect(result.qualificationAdvice).toBeDefined();
    expect(result.qualificationAdvice?.requiredCertifications).toEqual(["AWS SAA"]);
    expect(result.qualificationAdvice?.recommendedCertifications).toEqual(["AWS SAP", "CKA"]);
    expect(result.markdownContent).toContain("## 🎯 資格・スキルギャップ補強アクション");
  });
});
