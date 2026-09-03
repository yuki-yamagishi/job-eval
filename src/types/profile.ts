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

// 代表的な開発工程の選択肢
export const DEVELOPMENT_PHASES = [
  "要件定義",
  "基本設計 / アーキテクチャ",
  "詳細設計",
  "実装・コーディング",
  "テスト・QA",
  "リリース・CI/CD",
  "運用・保守",
  "PM / 進捗管理",
] as const;

export type DevelopmentPhase = typeof DEVELOPMENT_PHASES[number];

// STAR実績エピソード（案件内の個別課題・成果単位）
export interface StarEpisode {
  id: string;
  theme?: string;       // 実績テーマ (例: "DBボトルネック解消とレイテンシ改善", "CI/CD自動化と日次リリース")
  situation: string;   // 📌 状況・課題 (Situation & Task)
  action: string;      // 💡 自身が取った行動・技術的工夫 (Action)
  result: string;      // 🏆 達成した成果・定量的インパクト (Result)
}

// プロジェクト実績（案件単位）
export interface ProjectExperience {
  id: string;
  title: string;          // プロジェクト名 / 業務概要 (例: ECサイト大規模マイクロサービス刷新)
  role: string;           // ポジション・役割 (例: テックリード / バックエンドエンジニア)
  teamSize?: string;      // チーム規模 (例: 8名 (フロント3, バック4, PM1))
  startDate: string;      // 開始年月 (例: "2023-04")
  endDate?: string;       // 終了年月 (例: "2024-03" / 空欄・"現在" で参画中)
  isCurrent?: boolean;    // 現在も参画中か
  skills: string[];       // 使用技術・スキルスタック (例: ["Go", "React", "TypeScript", "AWS", "Docker"])
  phases?: string[];      // 担当開発工程 (例: ["要件定義", "基本設計 / アーキテクチャ", "実装・コーディング"])
  starEpisodes?: StarEpisode[]; // 複数のSTAR実績エピソード群
  situation?: string;     // 📌 直面した課題・背景 (単一エピソード・後方互換用)
  action?: string;        // 💡 自身が取った行動・技術的工夫
  result?: string;        // 🏆 達成した成果・定量的インパクト
}

// 所属企業 / 経歴単位
export interface CompanyExperience {
  id: string;
  companyName: string;    // 会社名 (例: 株式会社テクノロジー)
  employmentType?: "正社員" | "契約社員" | "業務委託" | "フリーランス" | "その他";
  startDate: string;      // 入社・開始年月 (例: "2021-04")
  endDate?: string;       // 退社・終了年月 (例: "2024-03")
  isCurrent?: boolean;    // 在籍中か
  department?: string;    // 所属部署 / 役職
  description?: string;   // 企業概要・事業内容
  projects: ProjectExperience[]; // 当該企業での参画プロジェクト群 (複数対応)
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
  companies?: CompanyExperience[]; // 職務経歴・プロジェクト実績群
  updatedAt: string;
}
