import { UserProfile } from "@/types/profile";

export const DEFAULT_USER_PROFILE: UserProfile = {
  id: "user-default",
  name: "候補者 (Candidate)",
  title: "クラウドアーキテクト / バックエンドエンジニア",
  yearsOfExperience: 8,
  summary: "Azure / AWSを中心としたクラウドネイティブ基盤の設計・構築および Go / Python を用いたバックエンド開発を主導。",
  skills: [
    { id: "s-1", name: "Azure", category: "cloud", yearsOfExperience: 5, level: "expert", status: "experienced" },
    { id: "s-2", name: "AWS", category: "cloud", yearsOfExperience: 4, level: "advanced", status: "experienced" },
    { id: "s-3", name: "Go", category: "language", yearsOfExperience: 3, level: "advanced", status: "experienced" },
    { id: "s-4", name: "Python", category: "language", yearsOfExperience: 6, level: "expert", status: "experienced" },
    { id: "s-5", name: "TypeScript", category: "language", yearsOfExperience: 4, level: "intermediate", status: "experienced" },
    { id: "s-6", name: "Terraform", category: "devops", yearsOfExperience: 4, level: "expert", status: "experienced" },
    { id: "s-7", name: "Kubernetes", category: "devops", yearsOfExperience: 3, level: "intermediate", status: "experienced" },
    { id: "s-8", name: "PostgreSQL", category: "database", yearsOfExperience: 5, level: "advanced", status: "experienced" },
    { id: "s-9", name: "Rust", category: "language", level: "beginner", status: "learning" },
  ],
  certifications: [
    { id: "c-1", name: "AZ-305: Azure Solutions Architect Expert", issuer: "Microsoft", status: "acquired", yearAcquired: 2024 },
    { id: "c-2", name: "AWS Certified Solutions Architect - Professional", issuer: "Amazon Web Services", status: "acquired", yearAcquired: 2023 },
    { id: "c-3", name: "応用情報技術者 (AP)", issuer: "IPA", status: "acquired", yearAcquired: 2020 },
    { id: "c-4", name: "AZ-400: Microsoft Azure DevOps Solutions", issuer: "Microsoft", status: "studying", targetPeriod: "2026年Q3" },
    { id: "c-5", name: "CKA: Certified Kubernetes Administrator", issuer: "CNCF / Linux Foundation", status: "planned", targetPeriod: "2026年内" },
  ],
  conditions: {
    targetSalaryMin: 800,
    targetSalaryMax: 1200,
    preferredWorkStyle: "フルリモート",
    preferredLocation: "東京都港区 / フルリモート",
    maxCommuteMinutes: 45,
    preferredRoles: [
      "クラウドアーキテクト",
      "テックリード / リードエンジニア",
      "フルスタックエンジニア",
    ],
    ngConditions: [
      "客先常駐・SESメインの案件",
      "固定残業制で45時間超を含む雇用契約",
      "レガシー技術・特定独自言語への固定配置",
    ],
  },
  apiSettings: {
    geminiApiKey: "",
    geminiModel: "gemini-3.7-flash",
  },
  updatedAt: new Date().toISOString(),
};
