/**
 * Safety Guard Delegation Adapter (.agents/hooks/safetyGuard.js)
 * Delegates directly to the official plugin implementation.
 */
import { handleSafetyGuard } from '../plugins/antigravity-review-loop/hooks/safetyGuard.js';
import { readStdinJson, writeStdoutJson } from '../plugins/antigravity-review-loop/hooks/hookUtils.js';

export * from '../plugins/antigravity-review-loop/hooks/safetyGuard.js';

const isDirectExecution = process.argv[1] && 
  (process.argv[1].toLowerCase().endsWith('safetyguard.js'));

if (isDirectExecution) {
  readStdinJson().then((payload) => {
    const result = handleSafetyGuard(payload);
    writeStdoutJson(result);
    process.exit(0);
  });
}
