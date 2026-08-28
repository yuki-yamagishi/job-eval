import { JobAnalysisResult, AgentSource } from "@/types/job";
import { UserProfile } from "@/types/profile";
import { AiProvider } from "./aiProvider";
import { calculateJobMatchScore, ScoreInput } from "@/core/scoring/scoringEngine";
import { generateJobMarkdown } from "@/core/markdown/markdownGenerator";

/**
 * Mock AI Provider for testing and offline local development
 */
export class MockAiProvider implements AiProvider {
  name = "MockAiProvider";

  async analyzeJob(
    text: string,
    source: AgentSource,
    profile: UserProfile
  ): Promise<JobAnalysisResult> {
    // Simulate inference delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 1. Extract metadata from raw text
    const companyMatch = text.match(/(?:企業名|会社名|募集企業)[:\s]*([^\n]+)/);
    const company = companyMatch ? companyMatch[1].trim() : "株式会社サンプルテクノロジーズ";

    const titleMatch = text.match(/(?:ポジション|職種|募集職種)[:\s]*([^\n]+)/);
    const title = titleMatch ? titleMatch[1].trim() : "クラウドアーキテクト / バックエンドリード";

    const salaryMinMatch = text.match(/(\d{3,4})万円?(?:〜|～|-)/);
    const salaryMaxMatch = text.match(/(?:〜|～|-)\s*(\d{3,4})万円?/);
    const salaryMin = salaryMinMatch ? parseInt(salaryMinMatch[1], 10) : 800;
    const salaryMax = salaryMaxMatch ? parseInt(salaryMaxMatch[1], 10) : 1100;

    const isRemote = text.includes("フルリモート") || text.includes("リモート可") || text.includes("在宅");

    // Extract Must / Want requirements
    const mustReqs = [
      "パブリッククラウド (Azure / AWS) の設計・構築経験 3年以上",
      "Go / Python 等を用いたWebアプリケーション開発経験",
      "CI/CDパイプラインの構築・運用経験",
    ];

    const wantReqs = [
      "クラウド認定資格 (AZ-305, AZ-400等) 保有",
      "マイクロサービスアーキテクチャの設計・移行実績",
      "オープンソースへのコントリビューション経験",
    ];

    // 2. Score with core scoring engine
    const scoreInput: ScoreInput = {
      jobTitle: title,
      salaryMin,
      salaryMax,
      location: "東京都港区",
      isRemote,
      requiredSkills: ["Azure", "AWS", "Go", "Python", "CI/CD"],
      preferredSkills: ["AZ-305", "Kubernetes", "Terraform"],
      jobDescriptionText: text,
    };

    const scoringResult = calculateJobMatchScore(scoreInput, profile);

    // 3. Positives, Concerns, Agent Questions, Appeal Points
    const positives = [
      `ユーザーの得意技術 (${profile.skills.slice(0, 3).map((s) => s.name).join(", ")}) と高い親和性。`,
      "既存インフラからモダンクラウドネイティブ基盤への全面移行期であり、裁量が大きい。",
      "評価制度が明文化されており、技術スペシャリスト向けの上位ラダーが存在する。",
    ];

    const concerns: string[] = [];
    if (scoringResult.details.ngTriggered.length > 0) {
      concerns.push(`【注意】NG条件に抵触: ${scoringResult.details.ngTriggered.join(", ")}`);
    }
    concerns.push("「残業月平均20〜30時間」と記載があるが、リリース前後の負荷実態を確認推奨。");
    concerns.push("チーム内のSRE専任者の有無、および夜間対応・オンコール発生頻度の確認が必要。");

    const agentQuestions = [
      "クラウド移行プロジェクトにおける現在のフェーズと、直近1年の具体的なマイルストーン。",
      "オンコールの発生頻度と、当番手当・代休取得の実態。",
      "今回の募集が「増員」か「欠員補充」か、組織拡大に伴う背景。",
    ];

    const appealPoints = [
      `専門性のアピール: ${profile.skills.slice(0, 2).map((s) => s.name).join(" / ")} における設計・構築実績を前面に訴求。`,
      "モダン言語での開発経験: インフラ構築だけでなくバックエンド開発も主導できるクロスオーバー能力を強調。",
    ];

    const today = new Date().toISOString().split("T")[0];
    const jobId = `job-${today.replace(/-/g, "")}-${Math.floor(100 + Math.random() * 900)}`;

    const metadata = {
      id: jobId,
      company,
      title,
      agentSource: source,
      dateAnalyzed: today,
      salaryMin,
      salaryMax,
      matchScore: scoringResult.totalScore,
      judgment: scoringResult.judgment,
      status: "応募検討中" as const,
      tags: ["AWS", "Azure", "Go", "FullRemote"],
    };

    const markdownContent = generateJobMarkdown({
      metadata,
      scoreBreakdown: scoringResult.breakdown,
      positives,
      concerns,
      agentQuestions,
      appealPoints,
      mustRequirements: mustReqs,
      wantRequirements: wantReqs,
      jobDescription: [
        "全社基幹システムのクラウドネイティブ化およびマイクロサービス化推進",
        "IaC (Terraform) によるインフラ構成管理とCI/CD基盤の刷新",
        "開発組織全体の生産性向上およびアーキテクチャ標準化の策定",
      ],
    });

    return {
      metadata,
      scoreBreakdown: scoringResult.breakdown,
      positives,
      concerns,
      agentQuestions,
      appealPoints,
      jobDetails: {
        mustRequirements: mustReqs,
        wantRequirements: wantReqs,
        jobDescription: [
          "全社基幹システムのクラウドネイティブ化推進",
          "IaC (Terraform) によるインフラ構成管理",
        ],
        location: "東京都港区（フルリモート可）",
        selectionProcess: "書類選考 → 一次面接 → 最終面接",
      },
      markdownContent,
    };
  }
}

// Default provider instance
const defaultProvider: AiProvider = new MockAiProvider();

export async function analyzeJobWithProfile(
  text: string,
  source: AgentSource,
  profile: UserProfile,
  provider: AiProvider = defaultProvider
): Promise<JobAnalysisResult> {
  return provider.analyzeJob(text, source, profile);
}
