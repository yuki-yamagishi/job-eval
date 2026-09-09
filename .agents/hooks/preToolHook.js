/**
 * PreTool Hook Handler (.agents/hooks/preToolHook.js)
 * 
 * Intercepts PreToolUse for run_command.
 * Enforces safety:
 * 1. Prohibits direct gh pr merge by the agent (merging is exclusively performed by human).
 * 2. Prohibits interactive watch tests.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { readStdinJson, writeStdoutJson } from './hookUtils.js';

export function handlePreTool(payload = {}) {
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
