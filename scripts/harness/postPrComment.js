/**
 * Safe PR Comment Poster (scripts/harness/postPrComment.js)
 * 
 * ADR-0016 Step 4 (Issue #47)
 * Writes the comment markdown body to a temporary file and posts it via
 * `gh pr comment <prNumber> --body-file <tempFile>` to avoid Windows PowerShell
 * quote escaping, line-break destruction, and character corruption.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

/**
 * Safely posts a comment to a GitHub PR using a temporary file and --body-file.
 * 
 * @param {number|string} prNumber - GitHub PR number
 * @param {string} commentBody - Markdown content of the comment
 * @param {object} [options] - Options for execution
 * @param {Function} [options.execFn] - Custom execFileSync for testing
 * @param {string} [options.tmpDir] - Custom temp directory for testing
 * @returns {{ success: boolean, output: string, prNumber: number }}
 */
export function postPrComment(prNumber, commentBody, options = {}) {
  const num = Number(prNumber);
  if (isNaN(num) || num <= 0 || !Number.isInteger(num)) {
    throw new Error(`Invalid PR number: "${prNumber}". PR number must be a positive integer.`);
  }

  if (typeof commentBody !== 'string' || commentBody.trim().length === 0) {
    throw new Error('Comment body cannot be empty.');
  }

  const tmpDir = options.tmpDir || os.tmpdir();
  const randomSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const tempFilePath = path.join(tmpDir, `pr_comment_${num}_${randomSuffix}.md`);

  const exec = options.execFn || execFileSync;

  try {
    // Write markdown body safely with UTF-8 encoding
    fs.writeFileSync(tempFilePath, commentBody, 'utf8');

    // Execute gh pr comment with --body-file
    const stdout = exec('gh', ['pr', 'comment', String(num), '--body-file', tempFilePath], {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
    });

    return {
      success: true,
      output: typeof stdout === 'string' ? stdout.trim() : '',
      prNumber: num,
    };
  } finally {
    // Always clean up the temporary file
    try {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    } catch {
      // Ignored cleanup error
    }
  }
}

// CLI Runner
const isDirectExecution = process.argv[1] && 
  (fileURLToPath(import.meta.url).toLowerCase() === path.resolve(process.argv[1]).toLowerCase());

if (isDirectExecution) {
  const [,, prNumberArg, bodyOrFileArg] = process.argv;

  if (!prNumberArg) {
    console.error('Usage: node scripts/harness/postPrComment.js <prNumber> [body|filePath]');
    process.exit(1);
  }

  let body = '';
  if (bodyOrFileArg) {
    if (fs.existsSync(bodyOrFileArg) && fs.statSync(bodyOrFileArg).isFile()) {
      body = fs.readFileSync(bodyOrFileArg, 'utf8');
    } else {
      body = bodyOrFileArg;
    }
  } else {
    // Read from standard input if no body argument is passed
    try {
      body = fs.readFileSync(0, 'utf8');
    } catch {
      // No stdin provided
    }
  }

  if (!body || body.trim().length === 0) {
    console.error('Error: Comment body was not provided via argument, file, or stdin.');
    process.exit(1);
  }

  try {
    const result = postPrComment(prNumberArg, body);
    console.log(`[OK] Successfully posted comment to PR #${result.prNumber}`);
    if (result.output) {
      console.log(result.output);
    }
    process.exit(0);
  } catch (err) {
    console.error(`[ERROR] Failed to post comment to PR #${prNumberArg}:`, err.message);
    process.exit(1);
  }
}
