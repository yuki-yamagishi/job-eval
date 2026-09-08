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
 * Evaluates Stop hook decision based on loop state machine.
 * 
 * @param {Record<string, any>} payload Stdin payload from Antigravity
 * @param {import('../loopState.js').LoopStateMachine} [stateMachine] Optional state machine for testing
 * @returns {{ decision: "continue" | "allow", reason: string }}
 */
export function handleStop(payload = {}, stateMachine = defaultStateMachine) {
  const check = stateMachine.canStop();

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
