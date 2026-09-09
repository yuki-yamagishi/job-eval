/**
 * PostTool Hook Facade (.agents/hooks/postToolHook.js)
 * 
 * Intercepts PostToolUse for run_command.
 * Delegates to postPrCreate handler to automatically transition loop state to PR_CREATED.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { defaultStateMachine } from '../state/loopState.js';
import { readStdinJson, writeStdoutJson } from './hookUtils.js';
import { handlePostPrCreate } from './handlers/postPrCreate.js';

export function handlePostTool(payload = {}, stateMachine = defaultStateMachine) {
  return handlePostPrCreate(payload, stateMachine);
}

const isDirectExecution = process.argv[1] && 
  (fileURLToPath(import.meta.url).toLowerCase() === path.resolve(process.argv[1]).toLowerCase());

if (isDirectExecution) {
  readStdinJson().then((payload) => {
    const result = handlePostTool(payload);
    writeStdoutJson(result);
    process.exit(0);
  });
}
