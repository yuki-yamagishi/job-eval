/**
 * Branch DoR Gate Delegation Adapter (.agents/hooks/branchDoRGate.js)
 * Delegates directly to the official plugin implementation.
 */
import { handleBranchDoRGate } from '../plugins/antigravity-review-loop/hooks/branchDoRGate.js';
import { readStdinJson, writeStdoutJson } from '../plugins/antigravity-review-loop/hooks/hookUtils.js';

export * from '../plugins/antigravity-review-loop/hooks/branchDoRGate.js';

const isDirectExecution = process.argv[1] && 
  (process.argv[1].toLowerCase().endsWith('branchdorgate.js'));

if (isDirectExecution) {
  readStdinJson().then((payload) => {
    const result = handleBranchDoRGate(payload);
    writeStdoutJson(result);
    process.exit(0);
  });
}
