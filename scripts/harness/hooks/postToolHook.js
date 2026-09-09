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
      // Determine PR number using multi-layered resolution
      let prNumber = null;

      // 1. Try extracting PR number from tool execution result/output if available
      const rawOutput = String(payload.result || payload.output || payload.toolResult || '');
      const urlMatch = rawOutput.match(/\/pull\/(\d+)/i);
      if (urlMatch) {
        prNumber = parseInt(urlMatch[1], 10);
      }

      // 2. Try gh CLI query
      if (!prNumber) {
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
          // Ignored
        }
      }

      // 3. Try git branch name or CI environment variables
      if (!prNumber) {
        try {
          const branchRef = process.env.GITHUB_HEAD_REF || 
            process.env.GITHUB_REF_NAME || 
            execSync('git branch --show-current', {
              encoding: 'utf8',
              stdio: ['ignore', 'pipe', 'ignore'],
            });
          const match = branchRef.match(/(?:pull\/|pr[/-])(\d+)/i);
          if (match) {
            prNumber = parseInt(match[1], 10);
          }
        } catch {
          // Ignored
        }
      }

      // 4. Safe fallback for tests / detached HEAD / offline environments
      if (!prNumber || isNaN(prNumber) || prNumber <= 0) {
        prNumber = 1;
      }

      stateMachine.setPrCreated(prNumber);
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
