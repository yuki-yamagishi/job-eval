/**
 * Pre-PR Audit Gate Delegation Adapter (.agents/hooks/prePrAuditGate.js)
 * Delegates directly to the official plugin implementation.
 */
import { handlePrePrAuditGate } from '../plugins/antigravity-review-loop/hooks/prePrAuditGate.js';
import { readStdinJson, writeStdoutJson } from '../plugins/antigravity-review-loop/hooks/hookUtils.js';

export * from '../plugins/antigravity-review-loop/hooks/prePrAuditGate.js';

const isDirectExecution = process.argv[1] && 
  (process.argv[1].toLowerCase().endsWith('preprauditgate.js'));

if (isDirectExecution) {
  readStdinJson().then((payload) => {
    const result = handlePrePrAuditGate(payload);
    writeStdoutJson(result);
    process.exit(0);
  });
}
