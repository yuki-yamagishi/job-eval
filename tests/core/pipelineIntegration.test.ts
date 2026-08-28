import { describe, it, expect, beforeEach } from "vitest";
import { analyzeJobWithProfile } from "@/services/ai/aiService";
import { LocalStorageAdapter } from "@/services/storage/storageAdapter";
import { TEST_MOCK_PROFILE } from "../fixtures/sampleProfile";
import { SAMPLE_JOB_FIXTURES } from "../fixtures/sampleJobs";

describe("Pipeline Integration & Multi-Source Evaluation Harness", () => {
  let storage: LocalStorageAdapter;

  beforeEach(() => {
    localStorage.clear();
    storage = new LocalStorageAdapter();
  });

  it("evaluates Leverages job and saves structured markdown to storage", async () => {
    const fixture = SAMPLE_JOB_FIXTURES.LEVERAGES_MATCH;
    const result = await analyzeJobWithProfile(fixture.rawText, fixture.source, TEST_MOCK_PROFILE);

    // Assert scoring
    expect(result.metadata.matchScore).toBeGreaterThanOrEqual(80);
    expect(fixture.expectedRankRange).toContain(result.metadata.judgment);

    // Assert markdown format
    expect(result.markdownContent).toContain(`company: ${result.metadata.company}`);
    expect(result.markdownContent).toContain(`match_score: ${result.metadata.matchScore}`);
    expect(result.markdownContent).toContain("## 📊 AI適合度判定サマリー");
    expect(result.markdownContent).toContain("## 💬 エージェントへの逆質問・確認事項");

    // Save to storage and verify
    await storage.saveJob(result);
    const savedJobs = await storage.loadJobs();
    expect(savedJobs.length).toBe(1);
    expect(savedJobs[0].metadata.id).toBe(result.metadata.id);
  });

  it("detects NG conditions in SES job and flags risks accurately", async () => {
    const fixture = SAMPLE_JOB_FIXTURES.NG_TRIGGERED_SES;
    const result = await analyzeJobWithProfile(fixture.rawText, fixture.source, TEST_MOCK_PROFILE);

    // Assert score downgraded due to NG condition
    expect(result.metadata.matchScore).toBeLessThan(75);
    expect(result.concerns.some((c) => c.includes("NG条件に抵触") || c.includes("残業"))).toBe(true);
  });
});
