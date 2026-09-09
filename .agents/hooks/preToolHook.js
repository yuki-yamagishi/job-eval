/**
 * PreTool Hook Handler (.agents/hooks/preToolHook.js)
 * 
 * Intercepts PreToolUse for run_command.
 * Enforces safety:
 * 1. Prohibits direct gh pr merge by the agent (merging is exclusively performed by human).
 * 2. Prohibits interactive watch tests.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { readStdinJson, writeStdoutJson } from './hookUtils.js';
import { defaultStateMachine, STATUS } from '../state/loopState.js';

export function handlePreTool(payload = {}, options = {}) {
  const toolCall = payload.toolCall || {};
  const toolName = toolCall.name || '';
  const args = toolCall.args || {};
  const commandLine = args.CommandLine || '';

  if (toolName !== 'run_command' || !commandLine) {
    return { decision: 'allow' };
  }

  const trimmed = commandLine.trim();

  // Block 1: Prohibit direct gh pr merge by the autonomous agent (Human approval/merge policy)
  if (/\bgh\s+pr\s+merge\b/i.test(trimmed)) {
    return {
      decision: 'deny',
      reason: "[PreToolHook Denied] Direct execution of 'gh pr merge' by the autonomous agent is strictly prohibited. Merging to main is exclusively performed by the user (human). Please request the user to review and merge the PR.",
    };
  }

  // Block 2: Prohibit interactive watch test execution that causes hanging
  if (/\bnpm(?:\.cmd)?\s+(?:run\s+)?test\b/i.test(trimmed) && !/--run\b/i.test(trimmed) && !/\btest:(?:run|coverage)\b/i.test(trimmed)) {
    return {
      decision: 'deny',
      reason: "[PreToolHook Denied] Interactive test runner detected. Use 'npm run check:fast' or 'npm run test:run' for deterministic execution.",
    };
  }

  // Block 3: Branch creation DoR & Why-First validation
  const branchMatch = trimmed.match(/\bgit\s+(?:checkout\s+-b|switch\s+-c)\s+([^\s]+)/i);
  if (branchMatch) {
    const branchName = branchMatch[1];
    const exec = options.execFn || execSync;
    const stateMachine = options.stateMachine || defaultStateMachine;
    const projectRoot = options.projectRoot || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

    // 3A: Working tree cleanliness
    try {
      const statusOut = exec('git status --porcelain', { cwd: projectRoot, encoding: 'utf8' }).trim();
      if (statusOut.length > 0) {
        const lines = statusOut.split('\n').map((l) => l.trim()).filter(Boolean);
        // Allow untracked docs/issues/ files created for the new issue, but block any modified, deleted, staged, or other untracked files
        const dirtyLines = lines.filter((l) => !l.startsWith('?? docs/issues/'));
        if (dirtyLines.length > 0) {
          return {
            decision: 'deny',
            reason: "[PreToolHook Denied] Working tree is dirty. Commit, stash, or clean up uncommitted changes before creating a new branch.",
          };
        }
      }
    } catch {
      // Ignored if git fails in mock/test
    }

    // 3B: LoopState IDLE check
    const currentState = stateMachine.getState();
    if (currentState && currentState.status && currentState.status !== STATUS.IDLE) {
      return {
        decision: 'deny',
        reason: `[PreToolHook Denied] An active review loop is still running (status: "${currentState.status}", PR: #${currentState.prNumber}). You must complete or merge the existing PR before starting a new branch.`,
      };
    }

    // 3C: Why-First & Risk Elimination check on issue.md
    const issueNumMatch = branchName.match(/issue-(\d+)/i);
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

      if (!targetIssueDir) {
        return {
          decision: 'deny',
          reason: `[PreToolHook Denied] No issue document found for Issue #${issueNum} under docs/issues/. (Remediation Guidance: Create the issue document 'docs/issues/ISSUE-${String(issueNum).padStart(3, '0')}_.../issue.md' using 'docs/issues/template_issue.md' before creating a branch.)`,
        };
      }

      const issueMdPath = path.resolve(issuesDir, targetIssueDir, 'issue.md');
      if (!fs.existsSync(issueMdPath)) {
        return {
          decision: 'deny',
          reason: `[PreToolHook Denied] issue.md does not exist in ${targetIssueDir}. (Remediation Guidance: Create 'docs/issues/${targetIssueDir}/issue.md' using 'docs/issues/template_issue.md' before creating a branch.)`,
        };
      }

      const issueContent = fs.readFileSync(issueMdPath, 'utf8');

      const hasWhySection = /##\s+(?:\d+\.\s+)?(?:解決すべき課題・背景|解決する課題・背景)\s*(?:\([^)]*Why[^)]*\))?/i.test(issueContent);
      const hasRiskSection = /##\s+(?:\d+\.\s+)?(?:排除するリスク)\s*(?:\([^)]*Risks?[^)]*\))?/i.test(issueContent);

      if (!hasWhySection || !hasRiskSection) {
        const missing = [];
        if (!hasWhySection) missing.push("'Why (Background & Problem)'");
        if (!hasRiskSection) missing.push("'Risks to Eliminate'");
        return {
          decision: 'deny',
          reason: `[PreToolHook Denied] Missing required sections in ${targetIssueDir}/issue.md: ${missing.join(', ')}. Define the root problem (Why) and risks before jumping into implementation (What). (Remediation Guidance: Refer to 'docs/issues/template_issue.md' and add the required sections.)`,
        };
      }
    }
  }

  // Block 4: Pre-PR Final Audit Gate (Mechanical "Is this really ready to submit?" validation)
  if (/\bgh\s+pr\s+create\b/i.test(trimmed)) {
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

        // 4A-2: Acceptance Criteria (DoD) completion check
        const issueMdContent = fs.readFileSync(path.resolve(targetPath, 'issue.md'), 'utf8');
        const hasUncheckedCriteria = /- \[\s+\]/i.test(issueMdContent);
        if (hasUncheckedCriteria) {
          return {
            decision: 'deny',
            reason: `[PreToolHook Denied] Pre-PR Audit Failed: Unchecked acceptance criteria (- [ ]) found in docs/issues/${targetIssueDir}/issue.md. (Remediation Guidance: Verify all criteria are completed and mark them as [x] before creating a PR.)`,
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
  }

  return { decision: 'allow' };
}

const isDirectExecution = process.argv[1] && 
  (fileURLToPath(import.meta.url).toLowerCase() === path.resolve(process.argv[1]).toLowerCase());

if (isDirectExecution) {
  readStdinJson().then((payload) => {
    const result = handlePreTool(payload);
    writeStdoutJson(result);
    process.exit(0);
  });
}
