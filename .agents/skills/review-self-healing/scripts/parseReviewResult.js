/**
 * Review Result Parser (.agents/skills/review-self-healing/scripts/parseReviewResult.js)
 * 
 * Parses Fleet review markdown text to extract Conventional Comments prefixes
 * ([must], [should], [imo], [nits], [ask], [good]) and the overall verdict ([LGTM] or [要修正]).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { setReviewResult, STATUS } from '../../../state/loopState.js';

export function parseReviewResult(reviewText, options = {}) {
  if (typeof reviewText !== 'string') {
    reviewText = '';
  }

  const lines = reviewText.split(/\r?\n/);
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

    if (line.match(/^(?:#+\s*)?(?:凡例|Legend|接頭辞ルール)/i)) {
      inLegendSection = true;
      continue;
    }

    if (inLegendSection && line.startsWith('#')) {
      inLegendSection = false;
    }

    if (inLegendSection) {
      continue;
    }

    const isLegendDefinition = /^[-*]\s*(?:\*\*)?`?\[(must|should|imo|nits|ask|good)\]`?(?:\*\*)?[:\s]*(?:マージ前に修正必須|強く推奨|私見・提案|些細な指摘|質問・確認|称賛・好ましい実装|修正必須|推奨)(?:[（(].*[）)])?\s*$/i.test(line);
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

  const hasExplicitLgtm = /\[LGTM\]/i.test(reviewText) || /(?:^|\s)LGTM(?:\s|$)/i.test(reviewText);
  const hasExplicitNeedsFix = /\[要修正\]/i.test(reviewText) || /(?:^|\s)要修正(?:\s|$)/i.test(reviewText);

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
    try {
      text = fs.readFileSync(0, 'utf8');
    } catch {}
  }

  if (!text || text.trim().length === 0) {
    console.error('Usage: node parseReviewResult.js <reviewFileOrText> [--update-state]');
    process.exit(1);
  }

  const parsed = parseReviewResult(text, { updateState: updateStateFlag });
  console.log(JSON.stringify(parsed, null, 2));

  if (updateStateFlag) {
    console.log(`\n[OK] LoopState updated: status = ${parsed.verdict}`);
  }

  process.exit(0);
}
