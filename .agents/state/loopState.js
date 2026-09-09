/**
 * Loop State Machine (.agents/state/loopState.js)
 * 
 * ADR-0016 / ADR-0018
 * Manages the deterministic lifecycle state of the self-healing review loop.
 * State is persisted to .agents/state/loop_state.json.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

export const STATUS = Object.freeze({
  IDLE: 'IDLE',
  PR_CREATED: 'PR_CREATED',
  REVIEW_REQUESTED: 'REVIEW_REQUESTED',
  NEEDS_FIX: 'NEEDS_FIX',
  RESOLVED_LGTM: 'RESOLVED_LGTM',
});

const DIR_NAME = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_STATE_FILE = process.env.LOOP_STATE_FILE || 
  path.resolve(DIR_NAME, 'loop_state.json');

/**
 * Creates a blank initial state object.
 */
export function createInitialState() {
  return {
    status: STATUS.IDLE,
    prNumber: null,
    reviewRequestedAt: null,
    issues: [],
    activeSubagents: false,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Deterministic Loop State Machine
 */
export class LoopStateMachine {
  constructor(stateFilePath = DEFAULT_STATE_FILE) {
    this.filePath = stateFilePath;
  }

  getState() {
    try {
      if (!fs.existsSync(this.filePath)) {
        return createInitialState();
      }
      const raw = fs.readFileSync(this.filePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || !parsed.status) {
        return createInitialState();
      }
      return parsed;
    } catch {
      return createInitialState();
    }
  }

  saveState(state) {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const updatedState = {
      ...state,
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(this.filePath, JSON.stringify(updatedState, null, 2), 'utf8');
    return updatedState;
  }

  setPrCreated(prNumber) {
    const num = Number(prNumber);
    if (isNaN(num) || num <= 0) {
      throw new Error(`Invalid PR number: ${prNumber}`);
    }
    const newState = {
      status: STATUS.PR_CREATED,
      prNumber: num,
      reviewRequestedAt: null,
      issues: [],
      activeSubagents: false,
    };
    return this.saveState(newState);
  }

  setReviewRequested(options = {}) {
    const current = this.getState();

    // 1. CI Status Verification Gate (Mechanism against ignoring failing/pending CI)
    const skipCiCheck = Boolean(options.skipCiCheck);
    if (!skipCiCheck && current.prNumber) {
      const checkCiFn = options.checkCiFn || ((prNum) => {
        try {
          return execSync(`gh pr checks ${prNum}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
        } catch (err) {
          const out = (err.stdout || '') + (err.stderr || '');
          if (out) return out;
          throw new Error(`Failed to check CI status for PR #${prNum}: ${err.message}`);
        }
      });

      const ciOutput = checkCiFn(current.prNumber);
      if (typeof ciOutput === 'string') {
        const lower = ciOutput.toLowerCase();
        if (lower.includes('pending') || lower.includes('in_progress') || lower.includes('queued')) {
          throw new Error(
            `[CI Gate Denied] GitHub Actions CI for PR #${current.prNumber} is still pending or running. Please wait for CI to complete before requesting review.`
          );
        }
        if (lower.includes('fail') || lower.includes('failure') || lower.includes('error')) {
          throw new Error(
            `[CI Gate Denied] GitHub Actions CI for PR #${current.prNumber} has failing checks. Please investigate and fix failures before requesting review.`
          );
        }
      }
    }

    const updated = {
      ...current,
      status: STATUS.REVIEW_REQUESTED,
      reviewRequestedAt: new Date().toISOString(),
      activeSubagents: Boolean(options.activeSubagents),
    };
    return this.saveState(updated);
  }

  setActiveSubagents(active = true) {
    const current = this.getState();
    const updated = {
      ...current,
      activeSubagents: Boolean(active),
    };
    return this.saveState(updated);
  }

  setReviewResult({ lgtm, issues = [] }) {
    const current = this.getState();
    const formattedIssues = issues.map((issue, idx) => ({
      id: issue.id || `issue-${idx + 1}`,
      type: (issue.type || 'should').toLowerCase(),
      description: issue.description || '',
      resolved: Boolean(issue.resolved),
      resolvedCommit: issue.resolvedCommit || null,
    }));

    const unresolvedBlocking = formattedIssues.filter(
      (issue) => ['must', 'should'].includes(issue.type) && !issue.resolved
    );

    const isLgtm = Boolean(lgtm) && unresolvedBlocking.length === 0;
    const nextStatus = isLgtm ? STATUS.RESOLVED_LGTM : STATUS.NEEDS_FIX;

    const updated = {
      ...current,
      status: nextStatus,
      issues: formattedIssues,
      activeSubagents: false,
    };
    return this.saveState(updated);
  }

  resolveIssues(resolvedCommit, resolvedIssueIds = null) {
    const current = this.getState();
    const targetIds = resolvedIssueIds
      ? (Array.isArray(resolvedIssueIds) ? resolvedIssueIds : [resolvedIssueIds])
      : null;

    const updatedIssues = current.issues.map((issue) => {
      const shouldResolve = targetIds
        ? targetIds.includes(issue.id)
        : ['must', 'should'].includes(issue.type) && !issue.resolved;

      if (shouldResolve) {
        return {
          ...issue,
          resolved: true,
          resolvedCommit: resolvedCommit || null,
        };
      }
      return issue;
    });

    const unresolvedBlocking = updatedIssues.filter(
      (issue) => ['must', 'should'].includes(issue.type) && !issue.resolved
    );

    // ガバナンス厳格化: 全ての指摘に対応コミットを紐付けた場合でも、
    // 親エージェントが独断で RESOLVED_LGTM に遷移することは物理的に禁止。
    // 必ず STATUS.REVIEW_REQUESTED（再レビュー待ち）に遷移し、
    // 第三者レビュアー（fleet_reviewer）による Re-review での LGTM 判定を必須とする。
    const nextStatus = unresolvedBlocking.length === 0 ? STATUS.REVIEW_REQUESTED : STATUS.NEEDS_FIX;

    const updated = {
      ...current,
      status: nextStatus,
      issues: updatedIssues,
      activeSubagents: false,
    };
    return this.saveState(updated);
  }

  reset(options = {}) {
    const current = this.getState();
    const isForce = Boolean(options.force) || Boolean(options.isForce);

    // 2. Merge Verification Gate on Reset (Mechanism against resetting before human merge)
    if (!isForce && current.status !== STATUS.IDLE && current.prNumber) {
      const checkPrStateFn = options.checkPrStateFn || ((prNum) => {
        try {
          return execSync(`gh pr view ${prNum} --json state --jq .state`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
        } catch {
          return 'UNKNOWN';
        }
      });

      const prState = checkPrStateFn(current.prNumber);
      if (prState !== 'MERGED' && prState !== 'UNKNOWN') {
        throw new Error(
          `[Reset Gate Denied] Cannot reset loopState: PR #${current.prNumber} is in state "${prState}". Loop state can only be safely reset after the PR has been merged to main by the user. (Emergency override: run 'node .agents/state/loopState.js reset --force')`
        );
      }
    }

    try {
      if (fs.existsSync(this.filePath)) {
        fs.unlinkSync(this.filePath);
      }
    } catch {
      // Ignored
    }
    return createInitialState();
  }

  canStop(options = {}) {
    const current = this.getState();
    const isSubagent = Boolean(options.isSubagent);
    const hasActiveSubagents = Boolean(options.hasActiveSubagents);

    // 1. Subagent execution context bypass
    if (isSubagent) {
      return {
        allowed: true,
        status: current.status,
        prNumber: current.prNumber,
        reason: 'Stop allowed: Execution is running inside a subagent context.',
      };
    }

    // 2. Active subagent waiting bypass (parent agent waiting for Reactive Wakeup)
    if (hasActiveSubagents && (current.status === STATUS.PR_CREATED || current.status === STATUS.REVIEW_REQUESTED)) {
      return {
        allowed: true,
        status: current.status,
        prNumber: current.prNumber,
        reason: `Stop allowed: Active subagent running in status "${current.status}". Parent agent is waiting for reactive wakeup notification.`,
      };
    }

    // 3. Normal status check
    const allowed = current.status === STATUS.IDLE || current.status === STATUS.RESOLVED_LGTM;

    let reason = '';
    if (allowed) {
      reason = current.status === STATUS.IDLE
        ? 'No active review loop running (IDLE).'
        : 'All review issues have been resolved and LGTM reached (RESOLVED_LGTM).';
    } else {
      const unresolvedCount = current.issues.filter(
        (i) => ['must', 'should'].includes(i.type) && !i.resolved
      ).length;

      let guidance = '';
      switch (current.status) {
        case STATUS.PR_CREATED:
          guidance = `Wait for GitHub Actions CI to pass on PR #${current.prNumber}, then run 'node .agents/state/loopState.js review-requested' and launch 'fleet_reviewer' subagent.`;
          break;
        case STATUS.REVIEW_REQUESTED:
          guidance = `Third-party review is in progress or pending. Launch or await 'fleet_reviewer' subagent. Once completed, parse results with 'node .agents/skills/review-self-healing/scripts/parseReviewResult.js <review_file> --update-state'.`;
          break;
        case STATUS.NEEDS_FIX:
          guidance = `Fix the ${unresolvedCount} unresolved blocking issue(s), commit changes, push to remote, and run 'node .agents/skills/review-self-healing/scripts/resolveReview.js' to report fixes and request re-review.`;
          break;
        default:
          guidance = `Complete the self-healing review cycle and reach RESOLVED_LGTM.`;
          break;
      }

      reason = `Stop rejected: Loop is currently in status "${current.status}" with ${unresolvedCount} unresolved blocking issue(s). (Remediation Guidance: ${guidance}) (Emergency abort: run 'node .agents/state/loopState.js reset --force')`;
    }

    return {
      allowed,
      status: current.status,
      prNumber: current.prNumber,
      reason,
    };
  }
}

export const defaultStateMachine = new LoopStateMachine();

export function getState() { return defaultStateMachine.getState(); }
export function saveState(state) { return defaultStateMachine.saveState(state); }
export function setPrCreated(prNumber) { return defaultStateMachine.setPrCreated(prNumber); }
export function setReviewRequested(options = {}) { return defaultStateMachine.setReviewRequested(options); }
export function setActiveSubagents(active = true) { return defaultStateMachine.setActiveSubagents(active); }
export function setReviewResult(result) { return defaultStateMachine.setReviewResult(result); }
export function resolveIssues(resolvedCommit, resolvedIssueIds = null) { return defaultStateMachine.resolveIssues(resolvedCommit, resolvedIssueIds); }
export function reset(options = {}) { return defaultStateMachine.reset(options); }
export function canStop(options = {}) { return defaultStateMachine.canStop(options); }

// CLI Command Runner
const isDirectExecution = process.argv[1] && 
  (fileURLToPath(import.meta.url).toLowerCase() === path.resolve(process.argv[1]).toLowerCase());

if (isDirectExecution) {
  const [,, command, ...args] = process.argv;
  switch (command) {
    case 'status': {
      console.log(JSON.stringify(getState(), null, 2));
      break;
    }
    case 'can-stop': {
      const hasActive = args.includes('--has-active-subagents');
      const isSub = args.includes('--is-subagent');
      const check = canStop({ hasActiveSubagents: hasActive, isSubagent: isSub });
      if (check.allowed) {
        console.log(`[PASS] ${check.reason}`);
        process.exit(0);
      } else {
        console.error(`[BLOCKED] ${check.reason}`);
        process.exit(1);
      }
      break;
    }
    case 'pr-created': {
      const prNumber = args[0];
      if (!prNumber) {
        console.error('Usage: node loopState.js pr-created <prNumber>');
        process.exit(1);
      }
      const state = setPrCreated(prNumber);
      console.log(`[OK] State transitioned to PR_CREATED for PR #${state.prNumber}`);
      break;
    }
    case 'review-requested': {
      const hasActive = args.includes('--active-subagents') || args.includes('true');
      const skipCi = args.includes('--skip-ci');
      try {
        const state = setReviewRequested({ activeSubagents: hasActive, skipCiCheck: skipCi });
        console.log(`[OK] State transitioned to REVIEW_REQUESTED (activeSubagents: ${state.activeSubagents})`);
      } catch (err) {
        console.error(`[BLOCKED] ${err.message}`);
        process.exit(1);
      }
      break;
    }
    case 'active-subagents': {
      const flag = args[0] !== 'false';
      const state = setActiveSubagents(flag);
      console.log(`[OK] activeSubagents set to ${state.activeSubagents}`);
      break;
    }
    case 'reset': {
      const isForce = args.includes('--force');
      try {
        reset({ force: isForce });
        console.log(`[OK] State reset to IDLE`);
      } catch (err) {
        console.error(`[BLOCKED] ${err.message}`);
        process.exit(1);
      }
      break;
    }
    default: {
      console.log('Usage: node loopState.js <status|can-stop|pr-created|review-requested|active-subagents|reset>');
      process.exit(0);
    }
  }
}
