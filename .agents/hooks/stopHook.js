/**
 * Stop Hook Delegation Adapter (.agents/hooks/stopHook.js)
 * Delegates directly to the official plugin implementation.
 */
import { handleStop } from '../plugins/antigravity-review-loop/hooks/stopHook.js';
import { readStdinJson, writeStdoutJson } from '../plugins/antigravity-review-loop/hooks/hookUtils.js';

export * from '../plugins/antigravity-review-loop/hooks/stopHook.js';

const isDirectExecution = process.argv[1] && 
  (process.argv[1].toLowerCase().endsWith('stophook.js'));

if (isDirectExecution) {
  readStdinJson().then((payload) => {
    const result = handleStop(payload);
    writeStdoutJson(result);
    process.exit(0);
  });
}
