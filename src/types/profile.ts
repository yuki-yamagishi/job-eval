export type WorkStylePreference = "フルリモート" | "ハイブリッド" | "出社可";

export type RoleLevelPreference = 
  | "テックリード / リードエンジニア"
  | "クラウドアーキテクト"
  | "シニアエンジニア"
  | "フルスタックエンジニア"
  | "エンジニアリングマネージャー"
  | "スペシャリスト / 専門職";

export interface SkillItem {
  id: string;
  name: string;
  category: "language" | "cloud" | "framework" | "database" | "devops" | "other";
  yearsOfExperience?: number;
  level?: "expert" | "advanced" | "intermediate" | "beginner";
  status?: "experienced" | "learning" | "interested"; // 実務経験あり / 独学・学習中 / 習得予定
}

export interface CertificationItem {
  id: string;
  name: string;
  issuer: string;
  status?: "acquired" | "studying" | "planned"; // 取得済 / 学習・受験中 / 取得予定
  yearAcquired?: number; // 取得年 (取得済の場合)
  targetPeriod?: string; // 目標時期 (例: "2026年Q3", "年内" 等)
}

export interface ScoringWeights {
  skill: number; // スキル合致度 (%)
  condition: number; // 希望条件合致度 (%)
  growth: number; // キャリア成長性 (%)
  environment: number; // 労働環境・カルチャー (%)
}

export type ScoringPresetKey = 
  | "standard"
  | "reskilling"
  | "wlb_culture"
  | "salary_first"
  | "custom";

export interface ScoringPresetInfo {
  key: ScoringPresetKey;
  label: string;
  badge: string;
  description: string;
  weights: ScoringWeights;
}

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  skill: 40,
  condition: 30,
  growth: 20,
  environment: 10,
};

export const SCORING_PRESETS: Record<ScoringPresetKey, ScoringPresetInfo> = {
  standard: {
    key: "standard",
    label: "標準バランス型",
    badge: "🎯 標準",
    description: "スキルと条件を軸にバランスよく即戦力性を評価 (40/30/20/10%)",
    weights: { skill: 40, condition: 30, growth: 20, environment: 10 },
  },
  reskilling: {
    key: "reskilling",
    label: "リスキリング・成長重視",
    badge: "🚀 リスキリング",
    description: "得られる技術・成長機会・サポート体制を最重要視 (10/20/45/25%)",
    weights: { skill: 10, condition: 20, growth: 45, environment: 25 },
  },
  wlb_culture: {
    key: "wlb_culture",
    label: "カルチャー・環境重視",
    badge: "🌿 カルチャー",
    description: "働きやすさ・社風・チームカルチャーと健全性を最優先 (20/30/10/40%)",
    weights: { skill: 20, condition: 30, growth: 10, environment: 40 },
  },
  salary_first: {
    key: "salary_first",
    label: "待遇・条件最優先",
    badge: "💰 待遇重視",
    description: "年収レンジや勤務地・リモート条件の合致を最優先 (25/50/15/10%)",
    weights: { skill: 25, condition: 50, growth: 15, environment: 10 },
  },
  custom: {
    key: "custom",
    label: "カスタム配分",
    badge: "⚙️ カスタム",
    description: "4軸の重み（％）をご自身の志向に合わせて自由に配分",
    weights: { skill: 25, condition: 25, growth: 25, environment: 25 },
  },
};

export interface ConditionMatrix {
  targetSalaryMin: number; // 万円 (e.g. 800)
  targetSalaryMax: number; // 万円 (e.g. 1200)
  preferredWorkStyle: WorkStylePreference;
  preferredLocation: string; // e.g. "東京都内 / フルリモート"
  maxCommuteMinutes?: number; // 許容通勤時間 (分)
  preferredRoles: RoleLevelPreference[];
  ngConditions: string[]; // e.g. ["常駐・SESメイン", "みなし残業45h超過", "レガシー技術固定"]
  scoringPreset?: ScoringPresetKey;
  scoringWeights?: ScoringWeights;
}

export type GeminiModel = 
  | "gemini-3.6-flash"
  | "gemini-3.5-flash"
  | "gemini-3.1-flash-lite"
  | "gemini-3.7-flash"
  | string;

export interface ApiSettings {
  geminiApiKey: string;
  geminiModel: GeminiModel;
  customInstructions?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  title: string;
  yearsOfExperience: number;
  summary: string;
  skills: SkillItem[];
  certifications: CertificationItem[];
  conditions: ConditionMatrix;
  apiSettings: ApiSettings;
  updatedAt: string;
}
