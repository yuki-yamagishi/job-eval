/**
 * Pre-PR Audit Gate Hook (.agents/hooks/prePrAuditGate.js)
 * 
 * Enforces submission quality audit before creating a Pull Request (gh pr create):
 * 1. 4-axis documents completeness check (issue.md, pre_verification.md, plan.md, walkthrough.md).
 * 2. Acceptance Criteria (Pre-PR DoD) completion check (no remaining unchecked - [ ]).
 * 3. SSOT (docs/architecture_overview.md) and latest ADR synchronization check.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { readStdinJson, writeStdoutJson } from './hookUtils.js';

export function handlePrePrAuditGate(payload = {}, options = {}) {
  const toolCall = payload.toolCall || {};
  const toolName = toolCall.name || '';
  const args = toolCall.args || {};
  const commandLine = args.CommandLine || '';

  if (toolName !== 'run_command' || !commandLine) {
    return { decision: 'allow' };
  }

  const trimmed = commandLine.trim();
  if (!/\bgh\s+pr\s+create\b/i.test(trimmed)) {
    return { decision: 'allow' };
  }

  const exec = options.execFn || execSync;
  const projectRoot = options.projectRoot || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

  // 4A: Detect current branch and issue number
  let currentBranch = options.currentBranch || '';
  if (!currentBranch) {
    try {
      currentBranch = exec('git branch --show-current', { cwd: projectRoot, encoding: 'utf8' }).trim();
    } catch {}
  }

  const issueNumMatch = currentBranch.match(/issue-(\d+)/i) || trimmed.match(/#(\d+)/);
  if (issueNumMatch) {
    const issueNum = parseInt(issueNumMatch[1], 10);
    const issuesDir = path.resolve(projectRoot, 'docs/issues');

    let targetIssueDir = null;
    if (fs.existsSync(issuesDir)) {
      const entries = fs.readdirSync(issuesDir);
      const prefixPadded = `ISSUE-${String(issueNum).padStart(3, '0')}`;
      const prefixRaw = `ISSUE-${issueNum}`;
      targetIssueDir = entries.find((e) => e.startsWith(prefixPadded) || e.startsWith(prefixRaw));
    }

    if (targetIssueDir) {
      const targetPath = path.resolve(issuesDir, targetIssueDir);

      // 4A-1: 4-axis documents completeness check
      const REQUIRED_DOCS = ['issue.md', 'pre_verification.md', 'plan.md', 'walkthrough.md'];
      const missingDocs = [];
      for (const doc of REQUIRED_DOCS) {
        const docPath = path.resolve(targetPath, doc);
        if (!fs.existsSync(docPath) || fs.readFileSync(docPath, 'utf8').trim().length < 20) {
          missingDocs.push(doc);
        }
      }
      if (missingDocs.length > 0) {
        return {
          decision: 'deny',
          reason: `[PreToolHook Denied] Pre-PR Audit Failed: Missing or incomplete 4-axis document(s) in docs/issues/${targetIssueDir}: ${missingDocs.join(', ')}. (Remediation Guidance: Complete all 4 documents before creating a PR.)`,
        };
      }

      // 4A-2: Acceptance Criteria (Pre-PR DoD) completion check
      const issueMdContent = fs.readFileSync(path.resolve(targetPath, 'issue.md'), 'utf8');

      let prePrSection = issueMdContent;
      // If 5.1 / Pre-PR DoD and 5.2 / Pre-Merge Gate sections exist, only audit Pre-PR DoD
      const prePrMatch = issueMdContent.match(/###?\s*5\.1[^\n]*\n([\s\S]*?)(?=###?\s*5\.2|\n##\s|$)/i);
      if (prePrMatch) {
        prePrSection = prePrMatch[1];
      } else {
        // Fallback: If no 5.1/5.2 split, exclude post-PR items like review, merge, CI from blocking
        const lines = issueMdContent.split(/\r?\n/).filter((line) =>
          !/(?:合議レビュー|レビュー|LGTM|マージ|CI\b|GitHub Actions)/i.test(line)
        );
        prePrSection = lines.join('\n');
      }

      const hasUncheckedCriteria = /- \[\s+\]/i.test(prePrSection);
      if (hasUncheckedCriteria) {
        return {
          decision: 'deny',
          reason: `[PreToolHook Denied] Pre-PR Audit Failed: Unchecked Pre-PR acceptance criteria (- [ ]) found in docs/issues/${targetIssueDir}/issue.md. (Remediation Guidance: Verify all Pre-PR DoD criteria are completed and marked as [x] before creating a PR.)`,
        };
      }
    }
  }

  // 4B: SSOT (architecture_overview.md) & latest ADR synchronization check
  const adrDir = path.resolve(projectRoot, 'docs/adr');
  const ssotPath = path.resolve(projectRoot, 'docs/architecture_overview.md');
  if (fs.existsSync(adrDir) && fs.existsSync(ssotPath)) {
    const adrFiles = fs.readdirSync(adrDir)
      .filter((f) => /^\d{4}-.*\.md$/.test(f))
      .sort();

    if (adrFiles.length > 0) {
      const latestAdrFile = adrFiles[adrFiles.length - 1];
      const latestAdrNumMatch = latestAdrFile.match(/^(\d{4})/);
      if (latestAdrNumMatch) {
        const latestNum = latestAdrNumMatch[1];
        const ssotContent = fs.readFileSync(ssotPath, 'utf8');
        const hasLatestAdr = ssotContent.includes(`ADR-${latestNum}`) || ssotContent.includes(latestNum);
        if (!hasLatestAdr) {
          return {
            decision: 'deny',
            reason: `[PreToolHook Denied] Pre-PR Audit Failed: The latest ADR (${latestAdrFile}) is not synchronized in docs/architecture_overview.md (SSOT). (Remediation Guidance: Update docs/architecture_overview.md to reference ADR-${latestNum} before creating a PR.)`,
          };
        }
      }
    }
  }

  return { decision: 'allow' };
}

const isDirectExecution = process.argv[1] && 
  (fileURLToPath(import.meta.url).toLowerCase() === path.resolve(process.argv[1]).toLowerCase());

if (isDirectExecution) {
  readStdinJson().then((payload) => {
    const result = handlePrePrAuditGate(payload);
    writeStdoutJson(result);
    process.exit(0);
  });
}
