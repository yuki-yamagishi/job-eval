/**
 * AI Automated PR Reviewer
 * Uses Gemini API to perform independent code review on PR diffs
 * Focuses on edge cases, maintainability, and AGENTS.md compliance
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const REVIEW_TAG = "<!-- AI-PR-REVIEW-BOT -->";

/**
 * Filter and truncate git diff to avoid token overflow and remove noisy files
 */
export function filterDiff(diffText, maxChars = 35000) {
  if (!diffText || typeof diffText !== "string") {
    return "";
  }

  const ignoredPatterns = [
    /^diff --git a\/package-lock\.json/,
    /^diff --git a\/pnpm-lock\.yaml/,
    /^diff --git a\/yarn\.lock/,
    /^diff --git a\/coverage\//,
    /^diff --git a\/dist\//,
    /\.(png|jpg|jpeg|gif|svg|ico|webp)$/,
  ];

  const chunks = diffText.split(/^diff --git /m);
  const filteredChunks = [];

  for (const chunk of chunks) {
    if (!chunk.trim()) continue;
    const firstLine = chunk.split("\n")[0];
    const fullHeader = `diff --git ${firstLine}`;

    const isIgnored = ignoredPatterns.some((pattern) =>
      pattern.test(fullHeader) || pattern.test(firstLine)
    );

    if (!isIgnored) {
      filteredChunks.push(fullHeader + chunk.slice(firstLine.length));
    }
  }

  let result = filteredChunks.join("\n");
  if (result.length > maxChars) {
    result =
      result.slice(0, maxChars) +
      "\n\n... [diff truncated for length / トークン上限のため差分を一部省略しました] ...";
  }

  return result;
}

/**
 * Build the review prompt for Gemini API
 */
export function buildReviewPrompt({ prTitle, prBody, diff, agentsGuideline }) {
  return `あなたは JobEval プロジェクトの客観的なシニアテックリードおよびセキュリティ＆品質スペシャリストAIレビュアーです。
実装者とは異なる客観的な視点から、提出されたプルリクエスト（PR）のコード差分（diff）および設計・アーキテクチャ規約（AGENTS.md）を厳格に精査してください。

【PR情報】
- タイトル: ${prTitle || "（タイトルなし）"}
- 概要・説明:
${prBody || "（説明なし）"}

【プロジェクト規約 (AGENTS.md 要約)】
${agentsGuideline ? agentsGuideline.slice(0, 4000) : "（規約なし）"}

【レビュー対象のコード差分 (git diff)】
\`\`\`diff
${diff}
\`\`\`

【レビュー方針 & 出力フォーマット】
完全な日本語で出力してください。単なるコードの追認ではなく、**「実装者が見落としがちなエッジケース」** や **「今後の保守でトラブルになりやすいポイント」** にフォーカスして以下の4セクション形式で記述してください：

### 🎯 1. 概要・変更インパクト評価
- 今回の変更の意図とアーキテクチャ上の位置づけ
- 影響範囲の妥当性評価

### 🛡️ 2. エッジケース & 潜在的リスク (Edge Cases & Risks)
- 空データ、未初期化、型外入力、境界値のハンドリング漏れはないか
- 非同期処理のレースコンディションやエラー時のフェイルセーフは適切か

### 💡 3. 保守性・コード品質の改善提案 (Maintainability & Improvements)
- コードの可読性、命名、重複、関心の分離
- 将来の開発者が保守する際に役立つ技術的メモ・留意点

### 📋 4. AGENTS.md / アーキテクチャ整合性チェック
- ドメイン駆動/クリーンアーキテクチャの層境界（core に UI や外部依存を持ち込んでいないか）
- 既存テストの不当な弱体化がないか
- ドキュメント完全日本語標準化への準拠

問題が特に見当たらない場合は、良好な設計判断を評価し、保守メモを添えて承認（LGTM）の旨を記述してください。`;
}

/**
 * Call Gemini API with model fallback
 */
export async function callGeminiApi(prompt, apiKey, model = "gemini-2.5-flash") {
  const models = [model, "gemini-1.5-flash"];
  let lastError = null;

  for (const m of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 4096,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        return text;
      }
      throw new Error("Empty response from Gemini API");
    } catch (err) {
      lastError = err;
      console.warn(`⚠️ Model ${m} failed: ${err.message}. Retrying with fallback...`);
    }
  }

  throw lastError || new Error("Failed to call Gemini API");
}

/**
 * Post comment to GitHub Pull Request
 */
export async function postPrComment({ repo, prNumber, githubToken, reviewBody }) {
  const formattedBody = `${REVIEW_TAG}
## 🤖 AI Automated PR Review (JobEval Reviewer Bot)

${reviewBody}

---
*Powered by Google Gemini & JobEval CI Quality Gate*`;

  const url = `https://api.github.com/repos/${repo}/issues/${prNumber}/comments`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${githubToken}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "JobEval-AI-PR-Reviewer",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ body: formattedBody }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to post PR comment (${response.status}): ${errorText}`);
  }

  return await response.json();
}

/**
 * Get git diff between base and head
 */
export function getGitDiff(baseRef = "origin/main", headSha = "HEAD", baseSha = null) {
  const diffCommands = [];
  if (baseSha && headSha) {
    diffCommands.push(`git diff ${baseSha}...${headSha}`);
  }
  diffCommands.push(`git diff ${baseRef}...${headSha}`);
  diffCommands.push(`git diff origin/main...HEAD`);
  diffCommands.push(`git diff HEAD~1...HEAD`);

  for (const cmd of diffCommands) {
    try {
      const diff = execSync(cmd, { cwd: rootDir, encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 });
      if (diff && diff.trim()) {
        return diff;
      }
    } catch (e) {
      // Continue to next fallback command
    }
  }

  return "";
}

/**
 * Main execution function
 */
export async function main() {
  console.log("🔍 Starting AI Automated PR Reviewer...");

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("⚠️ GEMINI_API_KEY is not set. Gracefully skipping AI PR Review.");
    process.exit(0);
  }

  const prNumber = process.env.PR_NUMBER || process.env.GITHUB_REF_NAME;
  const repo = process.env.GITHUB_REPOSITORY || "yuki-yamagishi/job-eval";
  const githubToken = process.env.GITHUB_TOKEN;
  const prTitle = process.env.PR_TITLE || "";
  const prBody = process.env.PR_BODY || "";
  const baseRef = process.env.BASE_REF || "origin/main";
  const headSha = process.env.HEAD_SHA || "HEAD";
  const baseSha = process.env.BASE_SHA || null;

  // 1. Fetch diff
  console.log(`📊 Fetching git diff (base: ${baseRef}, head: ${headSha})...`);
  const rawDiff = getGitDiff(baseRef, headSha, baseSha);
  const diff = filterDiff(rawDiff);

  if (!diff || !diff.trim()) {
    console.log("ℹ️ No code diff detected. Skipping review.");
    process.exit(0);
  }

  console.log(`📝 Filtered diff size: ${diff.length} characters`);

  // 2. Read AGENTS.md
  let agentsGuideline = "";
  const agentsPath = path.join(rootDir, "AGENTS.md");
  if (fs.existsSync(agentsPath)) {
    agentsGuideline = fs.readFileSync(agentsPath, "utf-8");
  }

  // 3. Build Prompt & Call Gemini
  console.log("🧠 Requesting AI PR review from Gemini API...");
  const prompt = buildReviewPrompt({ prTitle, prBody, diff, agentsGuideline });
  const reviewResult = await callGeminiApi(prompt, apiKey);

  console.log("\n=================== 🤖 AI PR REVIEW RESULT ===================");
  console.log(reviewResult);
  console.log("=============================================================\n");

  // 4. Post comment if running in PR context
  if (prNumber && githubToken) {
    console.log(`💬 Posting review comment to PR #${prNumber} on ${repo}...`);
    try {
      await postPrComment({
        repo,
        prNumber,
        githubToken,
        reviewBody: reviewResult,
      });
      console.log("✅ Successfully posted review comment to PR!");
    } catch (err) {
      console.error(`❌ Failed to post comment to PR #${prNumber}:`, err.message);
      // Do not fail CI if comment posting fails
    }
  } else {
    console.log("ℹ️ Local/Dry-run mode: PR_NUMBER or GITHUB_TOKEN not provided. Review printed to console only.");
  }

  console.log("🎉 AI PR Reviewer completed successfully.");
}

// Run CLI directly if invoked from command line
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error("❌ Fatal error in AI PR Reviewer:", err);
    process.exit(1);
  });
}
