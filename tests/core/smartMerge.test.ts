import { describe, it, expect } from "vitest";
import { mergeJobs, mergeProfile } from "@/core/sync/smartMerge";
import { JobAnalysisResult } from "@/types/job";
import { UserProfile } from "@/types/profile";
import { DEFAULT_USER_PROFILE } from "@/core/constants/defaultProfile";

describe("Smart Merge & Conflict Resolution Core Engine", () => {
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

  describe("mergeJobs", () => {
    it("merges PC [A, C] and Smartphone [A, B] into complete set [A, B, C] without loss", () => {
      const jobA_pc = createMockJob("job-A", "Company A", "Engineer", "書類通過", "2026-09-01T10:00:00Z");
      const jobC_pc = createMockJob("job-C", "Company C", "Lead Eng", "応募検討中", "2026-09-01T12:00:00Z");
      const localJobs = [jobA_pc, jobC_pc];

      const jobA_mobile = createMockJob("job-A", "Company A", "Engineer", "一次面接", "2026-09-02T15:00:00Z");
      const jobB_mobile = createMockJob("job-B", "Company B", "Architect", "内定", "2026-09-02T14:00:00Z");
      const remoteJobs = [jobA_mobile, jobB_mobile];

      const merged = mergeJobs(localJobs, remoteJobs);

      expect(merged).toHaveLength(3);
      const ids = merged.map((j) => j.metadata.id);
      expect(ids).toContain("job-A");
      expect(ids).toContain("job-B");
      expect(ids).toContain("job-C");

      // Verify job-A resolved conflict using newer mobile timestamp
      const resolvedJobA = merged.find((j) => j.metadata.id === "job-A");
      expect(resolvedJobA?.metadata.status).toBe("一次面接");
    });

    it("merges evaluation histories cleanly without duplicate snapshots", () => {
      const jobA1 = createMockJob("job-A", "Company A", "Engineer", "一次面接", "2026-09-01T10:00:00Z");
      jobA1.evaluationHistory = [
        {
          id: "hist-1",
          date: "2026-09-01T09:00:00Z",
          score: 75,
          judgment: "B (要確認・検討)",
          scoreBreakdown: { skillMatchRatio: 75, conditionMatchRatio: 75, careerGrowthRatio: 75, environmentRiskRatio: 75 },
          triggerReason: "initial",
          positives: [],
          concerns: [],
        },
      ];

      const jobA2 = createMockJob("job-A", "Company A", "Engineer", "最終面接", "2026-09-02T10:00:00Z");
      jobA2.evaluationHistory = [
        {
          id: "hist-1",
          date: "2026-09-01T09:00:00Z",
          score: 75,
          judgment: "B (要確認・検討)",
          scoreBreakdown: { skillMatchRatio: 75, conditionMatchRatio: 75, careerGrowthRatio: 75, environmentRiskRatio: 75 },
          triggerReason: "initial",
          positives: [],
          concerns: [],
        },
        {
          id: "hist-2",
          date: "2026-09-02T09:00:00Z",
          score: 90,
          judgment: "A (即応募推奨)",
          scoreBreakdown: { skillMatchRatio: 90, conditionMatchRatio: 90, careerGrowthRatio: 90, environmentRiskRatio: 90 },
          triggerReason: "profile_update",
          positives: [],
          concerns: [],
        },
      ];

      const merged = mergeJobs([jobA1], [jobA2]);
      expect(merged[0].evaluationHistory).toHaveLength(2);
    });

    it("handles empty arrays gracefully", () => {
      const jobA = createMockJob("job-A", "Company A", "Engineer", "応募済", "2026-09-01T10:00:00Z");
      expect(mergeJobs([], [jobA])).toEqual([jobA]);
      expect(mergeJobs([jobA], [])).toEqual([jobA]);
      expect(mergeJobs([], [])).toEqual([]);
    });
  });

  describe("mergeProfile", () => {
    it("strictly preserves deletions in skills and certifications from newer profile (LWW)", () => {
      // Old profile on PC has AWS and AZ-305
      const pcProfile: UserProfile = {
        ...DEFAULT_USER_PROFILE,
        name: "Developer PC",
        skills: [
          { id: "s1", name: "AWS", category: "cloud", level: "advanced" },
          { id: "s2", name: "React", category: "framework", level: "advanced" },
        ],
        certifications: [
          { id: "c1", name: "AZ-305: Azure Solutions Architect Expert", issuer: "Microsoft", status: "acquired" },
        ],
        updatedAt: "2026-09-01T10:00:00Z",
      };

      // User deleted AWS and AZ-305 on mobile, added Rust (newer timestamp)
      const mobileProfile: UserProfile = {
        ...DEFAULT_USER_PROFILE,
        name: "Developer Mobile",
        skills: [
          { id: "s2", name: "React", category: "framework", level: "expert" },
          { id: "s3", name: "Rust", category: "language", level: "beginner" },
        ],
        certifications: [], // Deleted all certifications
        updatedAt: "2026-09-02T12:00:00Z",
      };

      const merged = mergeProfile(pcProfile, mobileProfile);

      expect(merged.name).toBe("Developer Mobile"); // Latest name
      // Skills should strictly match the latest profile (React, Rust) - AWS must NOT resurrect!
      expect(merged.skills).toHaveLength(2);
      expect(merged.skills.map((s) => s.name)).toEqual(["React", "Rust"]);
      expect(merged.skills.some((s) => s.name === "AWS")).toBe(false);

      // Certifications should strictly match the latest profile (empty) - AZ-305 must NOT resurrect!
      expect(merged.certifications).toHaveLength(0);
    });

    it("falls back to safe union if timestamps are completely identical", () => {
      const profileA: UserProfile = {
        ...DEFAULT_USER_PROFILE,
        skills: [{ id: "s1", name: "TypeScript", category: "language", level: "advanced" }],
        certifications: [{ id: "c1", name: "AWS SAA", issuer: "AWS", status: "acquired" }],
        updatedAt: "2026-09-01T10:00:00Z",
      };

      const profileB: UserProfile = {
        ...DEFAULT_USER_PROFILE,
        skills: [{ id: "s2", name: "Go", category: "language", level: "intermediate" }],
        certifications: [{ id: "c2", name: "CKA", issuer: "CNCF", status: "studying" }],
        updatedAt: "2026-09-01T10:00:00Z",
      };

      const merged = mergeProfile(profileA, profileB);
      expect(merged.skills).toHaveLength(2);
      expect(merged.certifications).toHaveLength(2);
    });

    it("preserves Gemini API key even if missing on newer device", () => {
      const pcProfile: UserProfile = {
        ...DEFAULT_USER_PROFILE,
        apiSettings: {
          geminiApiKey: "AIzaSySecretApiKey123",
          geminiModel: "gemini-3.5-flash",
        },
        updatedAt: "2026-09-01T10:00:00Z",
      };

      const mobileProfile: UserProfile = {
        ...DEFAULT_USER_PROFILE,
        apiSettings: {
          geminiApiKey: "",
          geminiModel: "gemini-3.5-flash",
        },
        updatedAt: "2026-09-02T10:00:00Z",
      };

      const merged = mergeProfile(pcProfile, mobileProfile);
      expect(merged.apiSettings.geminiApiKey).toBe("AIzaSySecretApiKey123");
    });
  });
});
