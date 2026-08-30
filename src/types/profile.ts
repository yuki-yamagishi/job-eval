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

export interface ConditionMatrix {
  targetSalaryMin: number; // 万円 (e.g. 800)
  targetSalaryMax: number; // 万円 (e.g. 1200)
  preferredWorkStyle: WorkStylePreference;
  preferredLocation: string; // e.g. "東京都内 / フルリモート"
  maxCommuteMinutes?: number; // 許容通勤時間 (分)
  preferredRoles: RoleLevelPreference[];
  ngConditions: string[]; // e.g. ["常駐・SESメイン", "みなし残業45h超過", "レガシー技術固定"]
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
