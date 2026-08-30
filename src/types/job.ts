export type AgentSource = 
  | "レバテックキャリア"
  | "ビズリーチ"
  | "doda"
  | "リクルートエージェント"
  | "マイナビIT"
  | "直接応募"
  | "その他";

export type JudgmentRank = "S (即応募推奨)" | "A (即応募推奨)" | "B (要確認・検討)" | "C (見送り推奨)";

export type JobStatus = 
  | "未検討"
  | "応募検討中"
  | "応募済"
  | "書類通過"
  | "一次面接"
  | "最終面接"
  | "内定"
  | "辞退"
  | "見送り";

export interface JobMetadata {
  id: string;
  company: string;
  title: string;
  agentSource: AgentSource;
  url?: string;
  dateAnalyzed: string;
  salaryMin?: number;
  salaryMax?: number;
  matchScore: number;
  judgment: JudgmentRank;
  status: JobStatus;
  rejectReason?: string;
  tags: string[];
}

export interface FeedbackItem {
  date: string;
  feedback: string;
  previousScore: number;
  newScore: number;
}

export interface CareerTrajectory {
  acquiredSkills: string[];          // 2〜3年で身につく市場価値の高いスキル
  nextCareerOptions: string[];       // 次の転職で狙えるポジション・キャリアパス
  marketValueProjection: string;     // 2〜3年後の想定市場価値・年収レンジ
  careerRisksOrLockin?: string;      // 技術的ロックインやキャリア上の留意点
  overallOutlook: string;            // 中長期キャリア展望の総括アドバイス
}

export interface JobAnalysisResult {
  metadata: JobMetadata;
  originalJobText?: string;
  feedbackHistory?: FeedbackItem[];
  scoreBreakdown: {
    skillMatchRatio: number;
    conditionMatchRatio: number;
    careerGrowthRatio: number;
    environmentRiskRatio: number;
  };
  positives: string[];
  concerns: string[];
  agentQuestions: string[];
  appealPoints: string[];
  qualificationAdvice?: {
    requiredCertifications: string[];
    recommendedCertifications: string[];
    advice: string;
  };
  careerTrajectory?: CareerTrajectory;
  jobDetails: {
    mustRequirements: string[];
    wantRequirements: string[];
    jobDescription: string[];
    location: string;
    selectionProcess: string;
  };
  markdownContent: string;
}

export interface UserProfile {
  name: string;
  currentRole: string;
  yearsOfExperience: number;
  skills: string[];
  certifications: string[];
  targetSalaryMin: number;
  targetSalaryMax: number;
  preferredWorkStyle: "フルリモート" | "ハイブリッド" | "出社可";
  preferredLocation: string;
  ngConditions: string[];
}
