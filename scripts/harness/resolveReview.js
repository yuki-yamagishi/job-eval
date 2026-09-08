/**
 * Self-Healing Review Resolution & PR Comment Reporter (scripts/harness/resolveReview.js)
 * 
 * ADR-0016 Step 5 (Issue #48)
 * Automates reporting resolutions of Fleet review issues to the GitHub PR thread,
 * linking commit hashes and explanations, and converging loopState to RESOLVED_LGTM.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { defaultStateMachine, STATUS } from './loopState.js';
import { postPrComment } from './postPrComment.js';

/**
 * Resolves review issues, posts a structured resolution comment to the PR thread,
 * and updates loopState accordingly.
 * 
 * @param {object} options
 * @param {string} options.commitHash - Commit hash or reference that resolved the issues (required)
 * @param {string} options.summary - Summary of the resolution / changes made (required)
 * @param {string} [options.details=''] - Optional detailed explanation or notes
 * @param {string[]|string|null} [options.issueIds=null] - Specific issue IDs to resolve. If null, targets unresolved blocking issues.
 * @param {number|string|null} [options.prNumber=null] - PR number. If null, retrieved from loopState.
 * @param {boolean} [options.dryRun=false] - If true, skips PR comment posting and state file persistence.
 * @param {object} [options.stateMachine=null] - Custom state machine instance for testing (DI)
 * @param {Function} [options.postCommentFn=null] - Custom PR comment poster function for testing (DI)
 * @returns {object} Resolution result object
 */
export function resolveReview(options = {}) {
  const {
    commitHash,
    summary,
    details = '',
    issueIds = null,
    prNumber = null,
    dryRun = false,
    stateMachine = defaultStateMachine,
    postCommentFn = postPrComment,
  } = options;

  // 1. Validation
  if (typeof commitHash !== 'string' || commitHash.trim().length === 0) {
    throw new Error('Commit hash is required and cannot be empty.');
  }

  if (typeof summary !== 'string' || summary.trim().length === 0) {
    throw new Error('Summary is required and cannot be empty.');
  }

  const trimmedCommit = commitHash.trim();
  const trimmedSummary = summary.trim();
  const trimmedDetails = typeof details === 'string' ? details.trim() : '';

  const currentState = stateMachine.getState();

  const rawPrNumber = prNumber !== null && prNumber !== undefined ? prNumber : currentState.prNumber;
  const numPr = Number(rawPrNumber);
  if (isNaN(numPr) || numPr <= 0 || !Number.isInteger(numPr)) {
    throw new Error(
      `Invalid or missing PR number: "${rawPrNumber}". Provide a valid PR number or ensure loopState has a valid prNumber.`
    );
  }

  // 2. Determine target issue IDs
  let targetIds = null;
  if (issueIds) {
    if (Array.isArray(issueIds)) {
      targetIds = issueIds.map((id) => String(id).trim()).filter(Boolean);
    } else if (typeof issueIds === 'string') {
      targetIds = issueIds
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
    }
  }

  const existingIssues = Array.isArray(currentState.issues) ? currentState.issues : [];

  let targetIssues = [];
  if (targetIds && targetIds.length > 0) {
    targetIssues = existingIssues.filter((issue) => targetIds.includes(issue.id));
  } else {
    // If no target IDs specified, target all unresolved blocking issues ('must', 'should')
    const unresolvedBlocking = existingIssues.filter(
      (issue) => ['must', 'should'].includes(issue.type) && !issue.resolved
    );
    if (unresolvedBlocking.length > 0) {
      targetIssues = unresolvedBlocking;
    } else {
      // If no unresolved blocking issues, target any unresolved non-blocking issues
      const unresolvedAny = existingIssues.filter((issue) => !issue.resolved);
      targetIssues = unresolvedAny.length > 0 ? unresolvedAny : existingIssues;
    }
    targetIds = targetIssues.map((issue) => issue.id);
  }

  // 3. Compute next issue states and overall status
  const updatedIssues = existingIssues.map((issue) => {
    if (targetIds.includes(issue.id)) {
      return {
        ...issue,
        resolved: true,
        resolvedCommit: trimmedCommit,
      };
    }
    return issue;
  });

  const remainingBlockingIssues = updatedIssues.filter(
    (issue) => ['must', 'should'].includes(issue.type) && !issue.resolved
  );

  const isAllResolved = remainingBlockingIssues.length === 0;
  const nextStatus = isAllResolved ? STATUS.RESOLVED_LGTM : STATUS.NEEDS_FIX;

  // 4. Generate structured resolution Markdown
  const commentLines = [
    '## 🛠️ 指摘自己修復・解決報告 (Self-Healing Resolution Report)',
    '',
    `**対応コミット**: \`${trimmedCommit}\``,
    `**修正概要**: ${trimmedSummary}`,
  ];

  if (trimmedDetails) {
    commentLines.push('', '### 📝 対応詳細', trimmedDetails);
  }

  commentLines.push('', '### 🔍 解消対象の指摘');
  if (targetIssues.length > 0) {
    for (const issue of targetIssues) {
      commentLines.push(`- [x] **\`${issue.id}\`** \`[${issue.type}]\`: ${issue.description}`);
      commentLines.push(`  - 解決コミット: \`${trimmedCommit}\``);
    }
  } else {
    commentLines.push('- [x] 全体的な品質ゲート・コードレビュー指摘事項の自己修復完了');
    commentLines.push(`  - 解決コミット: \`${trimmedCommit}\``);
  }

  if (remainingBlockingIssues.length > 0) {
    commentLines.push('', `### ⚠️ 残存ブロッキング指摘 (${remainingBlockingIssues.length}件)`);
    for (const issue of remainingBlockingIssues) {
      commentLines.push(`- [ ] **\`${issue.id}\`** \`[${issue.type}]\`: ${issue.description}`);
    }
  }

  commentLines.push('', '### 📊 総合ステータス判定');
  if (isAllResolved) {
    commentLines.push('- **判定**: `[LGTM (All Resolved)]`');
    commentLines.push('- **未解消ブロッキング指摘**: 0件');
    commentLines.push(`- **ステータス遷移**: \`${currentState.status || STATUS.NEEDS_FIX}\` ➔ \`${STATUS.RESOLVED_LGTM}\``);
  } else {
    commentLines.push(`- **判定**: \`[要修正 (Remaining Blocking: ${remainingBlockingIssues.length}件)]\``);
    commentLines.push(`- **未解消ブロッキング指摘**: ${remainingBlockingIssues.length}件`);
    commentLines.push(`- **ステータス**: \`${STATUS.NEEDS_FIX}\` (修正継続中)`);
  }

  const commentBody = commentLines.join('\n');

  // 5. Post comment and update state
  let postResult = null;
  let updatedState = null;

  if (!dryRun) {
    postResult = postCommentFn(numPr, commentBody);
    updatedState = stateMachine.resolveIssues(trimmedCommit, targetIds);
  } else {
    postResult = {
      success: true,
      output: '[DRY-RUN] Comment not posted to GitHub PR',
      prNumber: numPr,
    };
  }

  return {
    success: true,
    status: nextStatus,
    isAllResolved,
    prNumber: numPr,
    commentBody,
    resolvedIssueIds: targetIds,
    resolvedIssues: targetIssues,
    unresolvedBlockingCount: remainingBlockingIssues.length,
    posted: !dryRun,
    commentOutput: postResult ? postResult.output : '',
    updatedState,
  };
}

// CLI Runner
const isDirectExecution =
  process.argv[1] &&
  fileURLToPath(import.meta.url).toLowerCase() === path.resolve(process.argv[1]).toLowerCase();

if (isDirectExecution) {
  const args = process.argv.slice(2);

  function getArgValue(flags) {
    for (let i = 0; i < args.length; i++) {
      if (flags.includes(args[i]) && args[i + 1] && !args[i + 1].startsWith('-')) {
        return args[i + 1];
      }
    }
    return null;
  }

  const commitHash = getArgValue(['--commit', '-c']);
  const summary = getArgValue(['--summary', '-s']);
  const details = getArgValue(['--details', '-d']) || '';
  const issueIds = getArgValue(['--issue-ids', '-i']);
  const prNumber = getArgValue(['--pr', '-p']);
  const dryRun = args.includes('--dry-run');

  if (!commitHash || !summary) {
    console.error(
      'Usage: node scripts/harness/resolveReview.js --commit <hash> --summary <text> [--details <text>] [--issue-ids <id1,id2>] [--pr <prNumber>] [--dry-run]'
    );
    process.exit(1);
  }

  try {
    const result = resolveReview({
      commitHash,
      summary,
      details,
      issueIds,
      prNumber,
      dryRun,
    });

    console.log(`[OK] Review resolution report successfully processed!`);
    console.log(`  PR Number: #${result.prNumber}`);
    console.log(`  Verdict: ${result.status} (isAllResolved: ${result.isAllResolved})`);
    console.log(`  Resolved Issue IDs: ${result.resolvedIssueIds.join(', ') || 'none'}`);
    console.log(`  Remaining Blocking: ${result.unresolvedBlockingCount}`);
    console.log(`  Posted to PR: ${result.posted}`);

    if (dryRun) {
      console.log('\n--- Generated Markdown (Dry-run) ---\n');
      console.log(result.commentBody);
    }

    process.exit(0);
  } catch (err) {
    console.error('[ERROR] Failed to resolve review:', err.message);
    process.exit(1);
  }
}
