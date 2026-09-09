/**
 * Branch DoR Gate Handler (.agents/hooks/handlers/branchDoRGate.js)
 * 
 * Enforces Definition of Ready (DoR) before creating a topic branch:
 * 1. Working tree cleanliness (no uncommitted dirty changes).
 * 2. LoopState IDLE check (no unfinished active PR review loop).
 * 3. Why-First & Risks to Eliminate validation in docs/issues/ISSUE-XXX/issue.md.
 * 4. Impact & Duplication Check validation in docs/issues/ISSUE-XXX/pre_verification.md.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { readStdinJson, writeStdoutJson } from '../hookUtils.js';
import { defaultStateMachine, STATUS } from '../../state/loopState.js';

export function handleBranchDoRGate(payload = {}, options = {}) {
  const toolCall = payload.toolCall || {};
  const toolName = toolCall.name || '';
  const args = toolCall.args || {};
  const commandLine = args.CommandLine || '';

  if (toolName !== 'run_command' || !commandLine) {
    return { decision: 'allow' };
  }

  const trimmed = commandLine.trim();
  const branchMatch = trimmed.match(/\bgit\s+(?:checkout\s+-b|switch\s+-c)\s+([^\s]+)/i);
  if (!branchMatch) {
    return { decision: 'allow' };
  }

  const branchName = branchMatch[1];
  const exec = options.execFn || execSync;
  const stateMachine = options.stateMachine || defaultStateMachine;
  const projectRoot = options.projectRoot || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

  // 3A: Working tree cleanliness
  try {
    const statusOut = exec('git status --porcelain', { cwd: projectRoot, encoding: 'utf8' }).trim();
    if (statusOut.length > 0) {
      const lines = statusOut.split('\n').map((l) => l.trim()).filter(Boolean);
      // Allow untracked docs/issues/ files created for the new issue, but block any modified, deleted, staged, or other untracked files
      const dirtyLines = lines.filter((l) => !/^\?\?\s+"?docs[/\\]issues[/\\]/i.test(l));
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

    // 3D: Impact & Duplication Check in pre_verification.md
    const preVerifPath = path.resolve(issuesDir, targetIssueDir, 'pre_verification.md');
    if (!fs.existsSync(preVerifPath)) {
      return {
        decision: 'deny',
        reason: `[PreToolHook Denied] pre_verification.md does not exist in ${targetIssueDir}. Perform and document an Impact & Duplication Check before creating a branch. (Remediation Guidance: Create 'docs/issues/${targetIssueDir}/pre_verification.md' using 'docs/issues/template_pre_verification.md'.)`,
      };
    }

    const preVerifContent = fs.readFileSync(preVerifPath, 'utf8');
    const hasImpactSection = /##\s+(?:\d+\.\s+)?(?:重複・パッチワーク点検|重複・影響調査|Impact\s*(?:&|and)\s*Duplication\s*Check)/i.test(preVerifContent);
    if (!hasImpactSection) {
      return {
        decision: 'deny',
        reason: `[PreToolHook Denied] Missing 'Impact & Duplication Check' section in ${targetIssueDir}/pre_verification.md. Audit existing codebase, utilities, and past ADRs to prevent duplicated logic or patchwork fixes before creating a branch. (Remediation Guidance: Refer to 'docs/issues/template_pre_verification.md' and document Section 3 '重複・パッチワーク点検'.)`,
      };
    }
  }

  return { decision: 'allow' };
}

const isDirectExecution = process.argv[1] && 
  (fileURLToPath(import.meta.url).toLowerCase() === path.resolve(process.argv[1]).toLowerCase());

if (isDirectExecution) {
  readStdinJson().then((payload) => {
    const result = handleBranchDoRGate(payload);
    writeStdoutJson(result);
    process.exit(0);
  });
}
