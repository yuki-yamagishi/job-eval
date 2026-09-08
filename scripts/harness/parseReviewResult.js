/**
 * Review Result Parser (scripts/harness/parseReviewResult.js)
 * 
 * ADR-0016 Step 4 (Issue #47)
 * Parses Fleet review markdown text to extract Conventional Comments prefixes
 * ([must], [should], [imo], [nits], [ask], [good]) and the overall verdict ([LGTM] or [要修正]).
 * 
 * Critical rules:
 * 1. [good] is praise (no action required) and is strictly excluded from unresolved issues count.
 * 2. [must] and [should] are blocking issues.
 * 3. [imo], [nits], [ask] are non-blocking issues.
 * 4. Legend / explanatory definition lines (e.g. - `[must]`: ...) are ignored.
 * 5. Can update loopState.js directly via options.updateState or --update-state CLI flag.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { setReviewResult, STATUS } from './loopState.js';

/**
 * Parses a review markdown string and extracts issues, praise, and verdict.
 * 
 * @param {string} reviewText - Raw markdown text of the review
 * @param {object} [options] - Parsing options
 * @param {boolean} [options.updateState=false] - Whether to automatically update loopState
 * @param {Function} [options.stateUpdater] - Custom state update function for testing
 * @returns {object} Parsed review result object
 */
export function parseReviewResult(reviewText, options = {}) {
  if (typeof reviewText !== 'string') {
    reviewText = '';
  }

  const lines = reviewText.split(/\r?\n/);

  // Prefix matching regex:
  // - [must] description
  // * **[should]**: description
  // 1. [nits] description
  // ### [good] description
  // [ask] description
  // - `[must]`: description
  // * **`[should]`**: description
  const prefixRegex = /^(?:[-*#\d.]+\s*)?(?:\*\*)?`?\[(must|should|imo|nits|ask|good)\]`?(?:\*\*)?[:\s]*(.*)$/i;

  const issues = [];
  const praises = [];

  const counts = {
    must: 0,
    should: 0,
    imo: 0,
    nits: 0,
    ask: 0,
    good: 0,
    blocking: 0,
    nonBlocking: 0,
    totalIssues: 0,
    totalPraises: 0,
  };

  let inLegendSection = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Detect start of legend / guide section
    if (line.match(/^(?:#+\s*)?(?:凡例|Legend|接頭辞ルール)/i)) {
      inLegendSection = true;
      continue;
    }

    // Detect leaving legend section upon reaching another heading
    if (inLegendSection && line.startsWith('#')) {
      inLegendSection = false;
    }

    // Skip lines inside legend section
    if (inLegendSection) {
      continue;
    }

    // Also skip typical legend definition lines if not inside an explicit section heading
    // (e.g. definition list lines explaining prefixes with keywords like '修正必須', '強く推奨', '任意', etc.)
    const isLegendDefinition = /^[-*]\s*(?:\*\*)?`?\[(must|should|imo|nits|ask|good)\]`?(?:\*\*)?[:\s]*(?:マージ前に|強く推奨|私見|些細な|質問|称賛|対応不要|修正必須|対応任意)/i.test(line);
    if (isLegendDefinition) {
      continue;
    }

    const match = line.match(prefixRegex);
    if (!match) continue;

    const rawType = match[1].toLowerCase();
    const description = match[2].trim();

    if (rawType === 'good') {
      praises.push({
        id: `praise-${praises.length + 1}`,
        type: 'good',
        description: description || 'Good implementation / practice',
      });
      counts.good++;
      counts.totalPraises++;
    } else {
      const issueItem = {
        id: `issue-${issues.length + 1}`,
        type: rawType,
        description: description || `Review issue (${rawType})`,
        resolved: false,
        resolvedCommit: null,
      };
      issues.push(issueItem);

      if (rawType === 'must' || rawType === 'should') {
        counts[rawType]++;
        counts.blocking++;
      } else {
        counts[rawType]++;
        counts.nonBlocking++;
      }
      counts.totalIssues++;
    }
  }

  // Verdict detection
  const hasExplicitLgtm = /\[LGTM\]/i.test(reviewText) || /(?:^|\s)LGTM(?:\s|$)/i.test(reviewText);
  const hasExplicitNeedsFix = /\[要修正\]/i.test(reviewText) || /(?:^|\s)要修正(?:\s|$)/i.test(reviewText);

  // Determine final verdict
  // If there are blocking issues, it CANNOT be LGTM
  const isLgtm = (hasExplicitLgtm || (!hasExplicitNeedsFix && counts.blocking === 0)) && counts.blocking === 0 && !hasExplicitNeedsFix;
  const verdict = isLgtm ? STATUS.RESOLVED_LGTM : STATUS.NEEDS_FIX;

  const result = {
    verdict,
    isLgtm,
    hasExplicitLgtm,
    hasExplicitNeedsFix,
    issues,
    praises,
    counts,
  };

  // State update integration
  if (options.updateState) {
    const updater = options.stateUpdater || setReviewResult;
    const updatedState = updater({
      lgtm: isLgtm,
      issues,
    });
    result.updatedState = updatedState;
  }

  return result;
}

// CLI Runner
const isDirectExecution = process.argv[1] && 
  (fileURLToPath(import.meta.url).toLowerCase() === path.resolve(process.argv[1]).toLowerCase());

if (isDirectExecution) {
  const args = process.argv.slice(2);
  const updateStateFlag = args.includes('--update-state');
  const targetArg = args.find((a) => a !== '--update-state');

  let text = '';
  if (targetArg) {
    if (fs.existsSync(targetArg) && fs.statSync(targetArg).isFile()) {
      text = fs.readFileSync(targetArg, 'utf8');
    } else {
      text = targetArg;
    }
  } else {
    // Read from stdin if no argument is passed
    try {
      text = fs.readFileSync(0, 'utf8');
    } catch {
      // No stdin
    }
  }

  if (!text || text.trim().length === 0) {
    console.error('Usage: node scripts/harness/parseReviewResult.js <reviewFileOrText> [--update-state]');
    process.exit(1);
  }

  const parsed = parseReviewResult(text, { updateState: updateStateFlag });

  console.log(JSON.stringify(parsed, null, 2));

  if (updateStateFlag) {
    console.log(`\n[OK] LoopState updated: status = ${parsed.verdict}`);
  }

  process.exit(0);
}
