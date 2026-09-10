/**
 * Post-PR Create Delegation Adapter (.agents/hooks/postPrCreate.js)
 * Delegates directly to the official plugin implementation.
 */
import { handlePostPrCreate } from '../plugins/antigravity-review-loop/hooks/postPrCreate.js';
import { readStdinJson, writeStdoutJson } from '../plugins/antigravity-review-loop/hooks/hookUtils.js';

export * from '../plugins/antigravity-review-loop/hooks/postPrCreate.js';

const isDirectExecution = process.argv[1] && 
  (process.argv[1].toLowerCase().endsWith('postprcreate.js'));

if (isDirectExecution) {
  readStdinJson().then((payload) => {
    const result = handlePostPrCreate(payload);
    writeStdoutJson(result);
    process.exit(0);
  });
}
