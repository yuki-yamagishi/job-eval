/**
 * PreTool Hook Handler (scripts/harness/hooks/preToolHook.js)
 * 
 * Intercepts PreToolUse for run_command.
 * Blocks prohibited commands such as unauthorized gh pr merge or interactive watch tests.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { readStdinJson, writeStdoutJson } from './hookUtils.js';

/**
 * Evaluates PreToolUse decision.
 * 
 * @param {Record<string, any>} payload Stdin payload from Antigravity
 * @returns {{ decision: "allow" | "deny", reason?: string }}
 */
export function handlePreTool(payload = {}) {
  const toolCall = payload.toolCall || {};
  const toolName = toolCall.name || '';
  const args = toolCall.args || {};
  const commandLine = args.CommandLine || '';

  if (toolName !== 'run_command' || !commandLine) {
    return { decision: 'allow' };
  }

  const trimmed = commandLine.trim();

  // Block 1: Prohibit direct gh pr merge by the agent without explicit user sign-off
  if (/\bgh\s+pr\s+merge\b/i.test(trimmed)) {
    return {
      decision: 'deny',
      reason: "[PreToolHook Denied] Direct execution of 'gh pr merge' by the autonomous agent is prohibited. Merging to main requires explicit user instruction and review.",
    };
  }

  // Block 2: Prohibit interactive watch test execution that causes hanging
  if (/\bnpm(?:\.cmd)?\s+(?:run\s+)?test\b/i.test(trimmed) && !/--run\b/i.test(trimmed) && !/\btest:run\b/i.test(trimmed)) {
    return {
      decision: 'deny',
      reason: "[PreToolHook Denied] Interactive test runner detected. Use 'npm run check:fast' or 'npm run test:run' for deterministic execution.",
    };
  }

  return { decision: 'allow' };
}

// CLI Execution
const isDirectExecution = process.argv[1] && 
  (fileURLToPath(import.meta.url).toLowerCase() === path.resolve(process.argv[1]).toLowerCase());

if (isDirectExecution) {
  readStdinJson().then((payload) => {
    const result = handlePreTool(payload);
    writeStdoutJson(result);
    process.exit(0);
  });
}
