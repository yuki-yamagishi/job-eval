import { UserProfile } from "@/types/profile";

export const TEST_MOCK_PROFILE: UserProfile = {
  id: "user-test",
  name: "テストユーザー",
  title: "クラウドアーキテクト",
  yearsOfExperience: 8,
  summary: "Azure/AWS設計とGo開発",
  skills: [
    { id: "1", name: "Azure", category: "cloud", yearsOfExperience: 5, level: "expert" },
    { id: "2", name: "AWS", category: "cloud", yearsOfExperience: 4, level: "advanced" },
    { id: "3", name: "Go", category: "language", yearsOfExperience: 3, level: "advanced" },
  ],
  certifications: [
    { id: "c1", name: "AZ-305", issuer: "Microsoft" },
  ],
  conditions: {
    targetSalaryMin: 800,
    targetSalaryMax: 1100,
    preferredWorkStyle: "フルリモート",
    preferredLocation: "東京都",
    preferredRoles: ["クラウドアーキテクト"],
    ngConditions: ["客先常駐", "みなし残業45時間超過"],
  },
  apiSettings: {
    geminiApiKey: "test-api-key-12345",
    geminiModel: "gemini-1.5-flash",
  },
  updatedAt: "2026-08-28T00:00:00.000Z",
};
