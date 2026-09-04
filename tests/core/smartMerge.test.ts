import { describe, it, expect } from "vitest";
import { applyJobsSnapshot, applyProfileSnapshot, mergeJobs, mergeProfile } from "@/core/sync/smartMerge";
import { JobAnalysisResult } from "@/types/job";
import { UserProfile } from "@/types/profile";
import { DEFAULT_USER_PROFILE } from "@/core/constants/defaultProfile";

describe("Cloud SSoT Snapshot Engine", () => {
  const createMockJob = (
    id: string,
    company: string,
    title: string,
    status: string,
    updatedAt: string
  ): JobAnalysisResult => ({
    metadata: {
      id,
      company,
      title,
      agentSource: "直接応募",
      status: status as any,
      dateAnalyzed: "2026-09-01T10:00:00.000Z",
      updatedAt,
      matchScore: 85,
      judgment: "A (即応募推奨)",
      tags: [],
    },
    companyOverview: {
      name: company,
      industry: "IT",
      scale: "100-500",
      businessModel: "SaaS",
    },
    positionDetails: {
      role: title,
      workStyle: "フルリモート",
      location: "東京",
    },
    scoring: {
      overallScore: 85,
      skillScore: 35,
      conditionScore: 25,
      growthScore: 15,
      environmentScore: 10,
    },
    scoreBreakdown: {
      skillMatchRatio: 85,
      conditionMatchRatio: 85,
      growthPotentialRatio: 85,
      cultureFitRatio: 85,
    },
    evaluationReport: {
      fitPoints: ["マッチ点"],
      concerns: ["懸念点"],
      recommendedAction: "応募推奨",
    },
  });

  describe("applyJobsSnapshot", () => {
    it("strictly adopts cloud authoritative snapshot and removes deleted jobs (no zombie resurrect)", () => {
      const jobA = createMockJob("job-A", "Company A", "Engineer", "応募中", "2026-09-01T10:00:00Z");
      const jobB = createMockJob("job-B", "Company B", "Architect", "内定", "2026-09-02T14:00:00Z");
      const localJobs = [jobA, jobB];

      // Cloud snapshot only contains jobB (jobA was deleted on another device)
      const cloudJobs = [jobB];

      const result = applyJobsSnapshot(localJobs, cloudJobs);

      expect(result).toHaveLength(1);
      expect(result[0].metadata.id).toBe("job-B");
      expect(result.some((j) => j.metadata.id === "job-A")).toBe(false);
    });

    it("handles full deletion when cloud snapshot is empty", () => {
      const jobA = createMockJob("job-A", "Company A", "Engineer", "応募中", "2026-09-01T10:00:00Z");
      const localJobs = [jobA];
      const cloudJobs: JobAnalysisResult[] = [];

      const result = applyJobsSnapshot(localJobs, cloudJobs);
      expect(result).toHaveLength(0);
    });

    it("falls back safely if cloudJobs is not an array", () => {
      const jobA = createMockJob("job-A", "Company A", "Engineer", "応募中", "2026-09-01T10:00:00Z");
      const result = applyJobsSnapshot([jobA], null as any);
      expect(result).toEqual([jobA]);
    });

    it("provides backward-compatibility alias mergeJobs", () => {
      const jobB = createMockJob("job-B", "Company B", "Architect", "内定", "2026-09-02T14:00:00Z");
      const result = mergeJobs([], [jobB]);
      expect(result).toEqual([jobB]);
    });
  });

  describe("applyProfileSnapshot", () => {
    it("completely replaces local sample profile with authoritative cloud user profile", () => {
      const localSampleProfile: UserProfile = {
        ...DEFAULT_USER_PROFILE,
        name: "候補者 (Candidate)",
        updatedAt: "1970-01-01T00:00:00.000Z",
      };

      const cloudUserProfile: UserProfile = {
        ...DEFAULT_USER_PROFILE,
        id: "user-real-123",
        name: "山田 太郎 (Real User)",
        title: "プリンシパルエンジニア",
        skills: [{ id: "s-real", name: "Kubernetes", category: "devops", level: "expert" }],
        updatedAt: "2026-09-04T12:00:00.000Z",
      };

      const result = applyProfileSnapshot(localSampleProfile, cloudUserProfile);

      expect(result.id).toBe("user-real-123");
      expect(result.name).toBe("山田 太郎 (Real User)");
      expect(result.title).toBe("プリンシパルエンジニア");
      expect(result.skills).toHaveLength(1);
      expect(result.skills[0].name).toBe("Kubernetes");
    });

    it("preserves local Gemini API key if cloud profile does not contain one", () => {
      const localProfileWithKey: UserProfile = {
        ...DEFAULT_USER_PROFILE,
        apiSettings: {
          geminiApiKey: "AIzaSyLocalSecretKey123",
          geminiModel: "gemini-3.6-flash",
        },
      };

      const cloudProfileWithoutKey: UserProfile = {
        ...DEFAULT_USER_PROFILE,
        name: "Cloud User",
        apiSettings: {
          geminiApiKey: "",
          geminiModel: "gemini-3.6-flash",
        },
      };

      const result = applyProfileSnapshot(localProfileWithKey, cloudProfileWithoutKey);
      expect(result.name).toBe("Cloud User");
      expect(result.apiSettings.geminiApiKey).toBe("AIzaSyLocalSecretKey123");
    });

    it("adopts cloud Gemini API key if present", () => {
      const localProfileWithKey: UserProfile = {
        ...DEFAULT_USER_PROFILE,
        apiSettings: {
          geminiApiKey: "AIzaSyLocalSecretKey123",
          geminiModel: "gemini-3.6-flash",
        },
      };

      const cloudProfileWithNewKey: UserProfile = {
        ...DEFAULT_USER_PROFILE,
        name: "Cloud User",
        apiSettings: {
          geminiApiKey: "AIzaSyCloudSecretKey999",
          geminiModel: "gemini-3.6-flash",
        },
      };

      const result = applyProfileSnapshot(localProfileWithKey, cloudProfileWithNewKey);
      expect(result.apiSettings.geminiApiKey).toBe("AIzaSyCloudSecretKey999");
    });

    it("provides backward-compatibility alias mergeProfile", () => {
      const cloudProfile: UserProfile = {
        ...DEFAULT_USER_PROFILE,
        name: "Alias Test",
      };
      const result = mergeProfile(DEFAULT_USER_PROFILE, cloudProfile);
      expect(result.name).toBe("Alias Test");
    });
  });
});
