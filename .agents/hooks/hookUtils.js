/**
 * Hook Utilities (.agents/hooks/hookUtils.js)
 * Helper functions for stdin/stdout JSON protocol in Antigravity lifecycle hooks.
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

export function writeStdoutJson(data) {
  process.stdout.write(JSON.stringify(data, null, 2) + '\n');
}
