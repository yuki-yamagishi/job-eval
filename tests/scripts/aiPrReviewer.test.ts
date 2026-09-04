import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  filterDiff,
  buildReviewPrompt,
  callGeminiApi,
  postPrComment,
} from "../../scripts/aiPrReviewer.js";

describe("aiPrReviewer scripts test suite", () => {
  describe("filterDiff", () => {
    it("returns empty string when input is empty or non-string", () => {
      // @ts-expect-error testing invalid argument
      expect(filterDiff(null)).toBe("");
      // @ts-expect-error testing invalid argument
      expect(filterDiff(undefined)).toBe("");
      expect(filterDiff("")).toBe("");
    });

    it("filters out lockfiles, coverage, and image diffs", () => {
      const rawDiff = `diff --git a/package-lock.json b/package-lock.json
index 123..456 100644
--- a/package-lock.json
+++ b/package-lock.json
@@ -1,3 +1,3 @@
- "version": "1.0.0"
+ "version": "1.0.1"
diff --git a/src/index.ts b/src/index.ts
index 789..abc 100644
--- a/src/index.ts
+++ b/src/index.ts
@@ -10,2 +10,3 @@
+ export const hello = "world";
diff --git a/coverage/lcov.info b/coverage/lcov.info
index 111..222 100644
--- a/coverage/lcov.info
+++ b/coverage/lcov.info
@@ -1 +1 @@
-TN:
+TN:test
diff --git a/public/logo.png b/public/logo.png
Binary files differ
`;

      const result = filterDiff(rawDiff);
      expect(result).not.toContain("package-lock.json");
      expect(result).not.toContain("coverage/lcov.info");
      expect(result).not.toContain("public/logo.png");
      expect(result).toContain("diff --git a/src/index.ts b/src/index.ts");
      expect(result).toContain('export const hello = "world";');
    });

    it("truncates diff when exceeding maxChars", () => {
      const longCode = "a".repeat(100);
      const rawDiff = `diff --git a/src/test.ts b/src/test.ts\n${longCode}`;
      const result = filterDiff(rawDiff, 50);

      expect(result.length).toBeLessThan(rawDiff.length + 100);
      expect(result).toContain("[diff truncated for length");
    });
  });

  describe("buildReviewPrompt", () => {
    it("includes PR title, body, diff, and guidelines in structured prompt", () => {
      const prompt = buildReviewPrompt({
        prTitle: "fix: resolve memory leak in sync listener",
        prBody: "This PR fixes the subscription unmount cleanup.",
        diff: "diff --git a/src/sync.ts...",
        agentsGuideline: "### AGENTS.md rule: do not break tests",
      });

      expect(prompt).toContain("fix: resolve memory leak in sync listener");
      expect(prompt).toContain("This PR fixes the subscription unmount cleanup.");
      expect(prompt).toContain("diff --git a/src/sync.ts...");
      expect(prompt).toContain("do not break tests");
      expect(prompt).toContain("🎯 1. 概要・変更インパクト評価");
      expect(prompt).toContain("🛡️ 2. エッジケース & 潜在的リスク");
      expect(prompt).toContain("💡 3. 保守性・コード品質の改善提案");
      expect(prompt).toContain("📋 4. AGENTS.md / アーキテクチャ整合性チェック");
      expect(prompt).toContain("[must]");
      expect(prompt).toContain("[should]");
      expect(prompt).toContain("[imo]");
      expect(prompt).toContain("[nits]");
      expect(prompt).toContain("[ask]");
    });

    it("handles missing/empty fields with fallback strings", () => {
      const prompt = buildReviewPrompt({
        prTitle: "",
        prBody: "",
        diff: "",
        agentsGuideline: "",
      });

      expect(prompt).toContain("（タイトルなし）");
      expect(prompt).toContain("（説明なし）");
      expect(prompt).toContain("（規約なし）");
    });
  });

  describe("callGeminiApi", () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
      vi.restoreAllMocks();
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it("returns generated text from Gemini API response", async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [{ text: "### レビュー結果\n問題ありません。" }],
            },
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await callGeminiApi("test prompt", "test-api-key");
      expect(result.text).toBe("### レビュー結果\n問題ありません。");
      expect(result.model).toBe("gemini-3.5-flash-lite");
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("falls back to secondary model when primary model fails", async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return {
            ok: false,
            status: 404,
            text: async () => "Model not found",
          };
        }
        return {
          ok: true,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [{ text: "Fallback model review text" }],
                },
              },
            ],
          }),
        };
      });

      const result = await callGeminiApi("test prompt", "test-api-key", "custom-model");
      expect(result.text).toBe("Fallback model review text");
      expect(result.model).toBe("gemini-3.5-flash-lite");
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it("throws error when all models fail", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "Internal Server Error",
      });

      await expect(callGeminiApi("test prompt", "test-api-key")).rejects.toThrow(
        /Gemini API error \(500\)/
      );
    });
  });

  describe("postPrComment", () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it("sends POST request to GitHub issues comments endpoint with auth header", async () => {
      let capturedUrl = "";
      let capturedOptions: RequestInit | undefined;

      global.fetch = vi.fn().mockImplementation(async (url, options) => {
        capturedUrl = url;
        capturedOptions = options;
        return {
          ok: true,
          json: async () => ({ id: 12345, html_url: "https://github.com/..." }),
        };
      });

      await postPrComment({
        repo: "yuki-yamagishi/job-eval",
        prNumber: "34",
        githubToken: "fake-gh-token-test",
        reviewBody: "Looks good to me!",
      });

      expect(capturedUrl).toBe(
        "https://api.github.com/repos/yuki-yamagishi/job-eval/issues/34/comments"
      );
      expect(capturedOptions?.method).toBe("POST");
      expect((capturedOptions?.headers as Record<string, string>)["Authorization"]).toBe(
        "Bearer fake-gh-token-test"
      );
      const parsedBody = JSON.parse(capturedOptions?.body as string);
      expect(parsedBody.body).toContain("<!-- AI-PR-REVIEW-BOT -->");
      expect(parsedBody.body).toContain("Looks good to me!");
      expect(parsedBody.body).toContain("JobEval Reviewer Bot");
      expect(parsedBody.body).toContain("レビュー接頭辞ガイド");
      expect(parsedBody.body).toContain("[must]");
      expect(parsedBody.body).toContain("[imo]");
    });
  });
});
