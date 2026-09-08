/**
 * Hook Utilities (scripts/harness/hooks/hookUtils.js)
 * Helper functions for stdin/stdout JSON protocol in Antigravity lifecycle hooks.
 */

/**
 * Reads and parses JSON payload from stdin.
 * Resolves to an empty object if stdin is empty, invalid, or times out.
 * 
 * @param {number} timeoutMs Timeout in milliseconds (default: 2000)
 * @returns {Promise<Record<string, any>>}
 */
export async function readStdinJson(timeoutMs = 2000) {
  return new Promise((resolve) => {
    let raw = '';
    let resolved = false;

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve({});
      }
    }, timeoutMs);
    if (timer.unref) timer.unref();

    process.stdin.setEncoding('utf8');

    process.stdin.on('data', (chunk) => {
      raw += chunk;
    });

    process.stdin.on('end', () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        try {
          const trimmed = raw.trim();
          resolve(trimmed ? JSON.parse(trimmed) : {});
        } catch {
          resolve({});
        }
      }
    });

    process.stdin.on('error', () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve({});
      }
    });
  });
}

/**
 * Writes JSON response to stdout.
 * 
 * @param {Record<string, any>} data
 */
export function writeStdoutJson(data) {
  process.stdout.write(JSON.stringify(data, null, 2) + '\n');
}
