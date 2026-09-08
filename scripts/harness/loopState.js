/**
 * Loop State Machine (scripts/harness/loopState.js)
 * 
 * ADR-0016 Step 2 (Issue #45)
 * Manages the deterministic lifecycle state of the self-healing review loop.
 * State is persisted to .agents/state/loop_state.json.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export const STATUS = Object.freeze({
  IDLE: 'IDLE',
  PR_CREATED: 'PR_CREATED',
  REVIEW_REQUESTED: 'REVIEW_REQUESTED',
  NEEDS_FIX: 'NEEDS_FIX',
  RESOLVED_LGTM: 'RESOLVED_LGTM',
});

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../');

export const DEFAULT_STATE_FILE = process.env.LOOP_STATE_FILE || 
  path.resolve(ROOT_DIR, '.agents/state/loop_state.json');

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

  /**
   * Reads and returns the current state.
   * If the file does not exist or is corrupt, returns the initial IDLE state.
   */
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

  /**
   * Persists state to file atomically.
   */
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

  /**
   * Transition: PR is created -> status: PR_CREATED
   */
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

  /**
   * Transition: Fleet review requested -> status: REVIEW_REQUESTED
   * 
   * @param {Object} [options]
   * @param {boolean} [options.activeSubagents=false] Whether subagents were spawned
   */
  setReviewRequested(options = {}) {
    const current = this.getState();
    const updated = {
      ...current,
      status: STATUS.REVIEW_REQUESTED,
      reviewRequestedAt: new Date().toISOString(),
      activeSubagents: Boolean(options.activeSubagents),
    };
    return this.saveState(updated);
  }

  /**
   * Sets whether active subagents are currently running.
   * 
   * @param {boolean} [active=true]
   */
  setActiveSubagents(active = true) {
    const current = this.getState();
    const updated = {
      ...current,
      activeSubagents: Boolean(active),
    };
    return this.saveState(updated);
  }

  /**
   * Transition: Fleet review completed -> status: NEEDS_FIX or RESOLVED_LGTM
   * 
   * Blocking issue types: 'must', 'should'
   * Non-blocking issue types: 'imo', 'nits', 'good', 'ask'
   */
  setReviewResult({ lgtm, issues = [] }) {
    const current = this.getState();
    const formattedIssues = issues.map((issue, idx) => ({
      id: issue.id || `issue-${idx + 1}`,
      type: (issue.type || 'should').toLowerCase(),
      description: issue.description || '',
      resolved: Boolean(issue.resolved),
      resolvedCommit: issue.resolvedCommit || null,
    }));

    // Find unresolved blocking issues
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

  /**
   * Transition: Resolve review issues -> updates resolved state and transitions if all resolved
   * 
   * @param {string} resolvedCommit Commit hash or reference that resolved the issues
   * @param {string[]|string|null} resolvedIssueIds Specific issue IDs to resolve. If null, resolves all unresolved blocking issues.
   */
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

    const nextStatus = unresolvedBlocking.length === 0 ? STATUS.RESOLVED_LGTM : STATUS.NEEDS_FIX;

    const updated = {
      ...current,
      status: nextStatus,
      issues: updatedIssues,
    };
    return this.saveState(updated);
  }

  /**
   * Resets state machine to IDLE and removes state file if it exists.
   */
  reset() {
    try {
      if (fs.existsSync(this.filePath)) {
        fs.unlinkSync(this.filePath);
      }
    } catch {
      // Ignored
    }
    return createInitialState();
  }

  /**
   * Evaluates if agent execution / session is allowed to stop.
   * 
   * @param {Object} [options]
   * @param {boolean} [options.hasActiveSubagents] Whether active subagents (e.g. Fleet reviewer) are running
   * @param {boolean} [options.isSubagent] Whether execution is running inside a subagent context
   * @returns {{ allowed: boolean, status: string, prNumber: number|null, reason: string }}
   */
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
      reason = `Stop rejected: Loop is currently in status "${current.status}" with ${unresolvedCount} unresolved blocking issue(s). You must complete the self-healing cycle and reach RESOLVED_LGTM before stopping.`;
    }

    return {
      allowed,
      status: current.status,
      prNumber: current.prNumber,
      reason,
    };
  }
}

// Default singleton instance and convenience exports
export const defaultStateMachine = new LoopStateMachine();

export function getState() {
  return defaultStateMachine.getState();
}

export function saveState(state) {
  return defaultStateMachine.saveState(state);
}

export function setPrCreated(prNumber) {
  return defaultStateMachine.setPrCreated(prNumber);
}

export function setReviewRequested(options = {}) {
  return defaultStateMachine.setReviewRequested(options);
}

export function setActiveSubagents(active = true) {
  return defaultStateMachine.setActiveSubagents(active);
}

export function setReviewResult(result) {
  return defaultStateMachine.setReviewResult(result);
}

export function resolveIssues(resolvedCommit, resolvedIssueIds = null) {
  return defaultStateMachine.resolveIssues(resolvedCommit, resolvedIssueIds);
}

export function reset() {
  return defaultStateMachine.reset();
}

export function canStop(options = {}) {
  return defaultStateMachine.canStop(options);
}

// CLI Command Runner
const isDirectExecution = process.argv[1] && 
  (fileURLToPath(import.meta.url).toLowerCase() === path.resolve(process.argv[1]).toLowerCase());

if (isDirectExecution) {
  const [,, command, ...args] = process.argv;

  switch (command) {
    case 'status': {
      const state = getState();
      console.log(JSON.stringify(state, null, 2));
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
      const state = setReviewRequested();
      console.log(`[OK] State transitioned to REVIEW_REQUESTED`);
      break;
    }
    case 'reset': {
      reset();
      console.log(`[OK] State reset to IDLE`);
      break;
    }
    default: {
      console.log('Usage: node loopState.js <status|can-stop|pr-created|review-requested|reset>');
      process.exit(0);
    }
  }
}
