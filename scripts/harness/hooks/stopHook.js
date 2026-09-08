/**
 * Stop Hook Handler (scripts/harness/hooks/stopHook.js)
 * 
 * Intercepts agent Stop event.
 * Rejects stop with {"decision": "continue", "reason": "..."} if self-healing loop
 * has not yet reached RESOLVED_LGTM.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { defaultStateMachine } from '../loopState.js';
import { readStdinJson, writeStdoutJson } from './hookUtils.js';

/**
 * Detects whether the current execution context is inside a subagent.
 * 
 * @param {Record<string, any>} payload Stdin payload from Antigravity
 * @returns {boolean}
 */
export function detectSubagentContext(payload = {}) {
  // 1. Explicit payload flags
  if (payload.isSubagent === true || payload.subagent === true) {
    return true;
  }
  if (typeof payload.role === 'string' && /\b(reviewer|fleet|subagent)\b/i.test(payload.role)) {
    return true;
  }
  if (typeof payload.agentRole === 'string' && /\b(reviewer|fleet|subagent)\b/i.test(payload.agentRole)) {
    return true;
  }
  if (typeof payload.agentType === 'string' && /\b(reviewer|fleet|subagent)\b/i.test(payload.agentType)) {
    return true;
  }
  if (payload.conversationType === 'subagent') {
    return true;
  }
  if (payload.parentConversationId || payload.parentId) {
    return true;
  }

  // 2. Environment variables
  if (process.env.ANTIGRAVITY_SUBAGENT === 'true' || process.env.IS_SUBAGENT === 'true') {
    return true;
  }
  if (process.env.SUBAGENT_ROLE || process.env.AGENT_ROLE) {
    const envRole = process.env.SUBAGENT_ROLE || process.env.AGENT_ROLE || '';
    if (/\b(reviewer|fleet|subagent)\b/i.test(envRole)) {
      return true;
    }
  }

  // 3. Current working directory / execution path indicators
  try {
    const cwd = process.cwd();
    if (/[\\/]\.agents[\\/]subagents[\\/]/i.test(cwd) || /[\\/]fleet-reviewer/i.test(cwd)) {
      return true;
    }
  } catch {
    // Ignored
  }

  return false;
}

/**
 * Detects whether active subagents (e.g. Fleet reviewer) are currently running or being waited on.
 * 
 * @param {Record<string, any>} payload Stdin payload from Antigravity
 * @param {import('../loopState.js').LoopStateMachine} stateMachine
 * @returns {boolean}
 */
export function detectActiveSubagents(payload = {}, stateMachine = defaultStateMachine) {
  // 1. Explicit payload flags
  if (payload.hasActiveSubagents === true || payload.activeSubagents === true) {
    return true;
  }
  if (typeof payload.activeSubagents === 'number' && payload.activeSubagents > 0) {
    return true;
  }
  if (Array.isArray(payload.activeSubagents) && payload.activeSubagents.length > 0) {
    return true;
  }
  if (Array.isArray(payload.subagents) && payload.subagents.length > 0) {
    return true;
  }
  if (Array.isArray(payload.active_subagents) && payload.active_subagents.length > 0) {
    return true;
  }
  if (typeof payload.active_subagents === 'number' && payload.active_subagents > 0) {
    return true;
  }
  if (payload.waitingForSubagent === true) {
    return true;
  }

  // 2. Environment variable
  if (process.env.ACTIVE_SUBAGENTS === 'true') {
    return true;
  }

  // 3. State machine persisted state
  try {
    const state = stateMachine.getState();
    if (state.activeSubagents === true) {
      return true;
    }
  } catch {
    // Ignored
  }

  return false;
}

/**
 * Evaluates Stop hook decision based on loop state machine and execution context.
 * 
 * @param {Record<string, any>} payload Stdin payload from Antigravity
 * @param {import('../loopState.js').LoopStateMachine} [stateMachine] Optional state machine for testing
 * @returns {{ decision: "continue" | "allow", reason: string }}
 */
export function handleStop(payload = {}, stateMachine = defaultStateMachine) {
  const isSubagent = detectSubagentContext(payload);
  const hasActiveSubagents = detectActiveSubagents(payload, stateMachine);

  const check = stateMachine.canStop({
    hasActiveSubagents,
    isSubagent,
  });

  if (!check.allowed) {
    return {
      decision: 'continue',
      reason: check.reason,
    };
  }

  return {
    decision: 'allow',
    reason: check.reason,
  };
}

// CLI Execution
const isDirectExecution = process.argv[1] && 
  (fileURLToPath(import.meta.url).toLowerCase() === path.resolve(process.argv[1]).toLowerCase());

if (isDirectExecution) {
  readStdinJson().then((payload) => {
    const result = handleStop(payload);
    writeStdoutJson(result);
    process.exit(0);
  });
}
