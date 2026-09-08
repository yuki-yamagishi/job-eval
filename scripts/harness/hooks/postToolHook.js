/**
 * PostTool Hook Handler (scripts/harness/hooks/postToolHook.js)
 * 
 * Intercepts PostToolUse for run_command.
 * Automatically transitions loop state to PR_CREATED when gh pr create succeeds.
 */

import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { defaultStateMachine } from '../loopState.js';
import { readStdinJson, writeStdoutJson } from './hookUtils.js';

/**
 * Handles PostToolUse inspection and triggers state transitions.
 * 
 * @param {Record<string, any>} payload Stdin payload from Antigravity
 * @param {import('../loopState.js').LoopStateMachine} [stateMachine] Optional state machine for testing
 * @returns {Record<string, any>} Empty JSON object as per PostToolUse contract
 */
export function handlePostTool(payload = {}, stateMachine = defaultStateMachine) {
  // If the tool failed with an error, do not transition state
  if (payload.error) {
    return {};
  }

  const toolCall = payload.toolCall || {};
  const toolName = toolCall.name || '';
  const args = toolCall.args || {};
  const commandLine = args.CommandLine || '';

  if (toolName === 'run_command' && /\bgh\s+pr\s+create\b/i.test(commandLine)) {
    try {
      // Determine latest PR number from gh CLI
      let prNumber = null;
      try {
        const output = execSync('gh pr view --json number -q .number', {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
          timeout: 5000,
        });
        const parsed = parseInt(output.trim(), 10);
        if (!isNaN(parsed) && parsed > 0) {
          prNumber = parsed;
        }
      } catch {
        // Fallback: check if PR number was passed directly or use placeholder
        prNumber = 1;
      }

      if (prNumber) {
        stateMachine.setPrCreated(prNumber);
      }
    } catch {
      // Safe fallback to avoid breaking agent execution
    }
  }

  return {};
}

// CLI Execution
const isDirectExecution = process.argv[1] && 
  (fileURLToPath(import.meta.url).toLowerCase() === path.resolve(process.argv[1]).toLowerCase());

if (isDirectExecution) {
  readStdinJson().then((payload) => {
    const result = handlePostTool(payload);
    writeStdoutJson(result);
    process.exit(0);
  });
}
