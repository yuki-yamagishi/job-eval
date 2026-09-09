/**
 * PreTool Hook Facade (.agents/hooks/preToolHook.js)
 * 
 * Orchestrates modular pre-tool handlers:
 * 1. safetyGuard: Prohibits direct gh pr merge and interactive watch tests.
 * 2. branchDoRGate: Enforces DoR, cleanliness, loopState, and Why/Risk/Impact checks on branch creation.
 * 3. prePrAuditGate: Enforces 4-axis documents, DoD completion, and SSOT/ADR sync before PR creation.
 * 
 * Preserves 100% backward compatibility for tests and legacy invocations.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { readStdinJson, writeStdoutJson } from './hookUtils.js';
import { handleSafetyGuard } from './handlers/safetyGuard.js';
import { handleBranchDoRGate } from './handlers/branchDoRGate.js';
import { handlePrePrAuditGate } from './handlers/prePrAuditGate.js';

export function handlePreTool(payload = {}, options = {}) {
  const projectRoot = options.projectRoot || 
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const forwardedOptions = { ...options, projectRoot };

  // Gate 1: Safety Guard (Direct merge & interactive test prohibitions)
  const safetyResult = handleSafetyGuard(payload);
  if (safetyResult && safetyResult.decision === 'deny') {
    return safetyResult;
  }

  // Gate 2: Branch Creation DoR Gate
  const branchResult = handleBranchDoRGate(payload, forwardedOptions);
  if (branchResult && branchResult.decision === 'deny') {
    return branchResult;
  }

  // Gate 3: Pre-PR Audit Gate
  const prAuditResult = handlePrePrAuditGate(payload, forwardedOptions);
  if (prAuditResult && prAuditResult.decision === 'deny') {
    return prAuditResult;
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
