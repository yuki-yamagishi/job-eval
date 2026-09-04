/**
 * Issue & Root Document Integrity Checker
 * Verifies docs/issues/ folder completeness and root pointer docs
 */

import fs from 'fs';
import path from 'path';

export function checkIssueDocIntegrity(docsDir) {
  let hasError = false;
  console.log('  📂 [Issue Doc Checker] Verifying docs/issues/ and root document completeness...');

  const issuesDir = path.resolve(docsDir, 'issues');
  if (!fs.existsSync(issuesDir)) {
    console.error('\n❌ [Issue Doc Checker] docs/issues/ directory does not exist.');
    return false;
  }

  // 1. Verify root pointer files
  const REQUIRED_ROOT_DOCS = [
    { filename: 'pre_phase_verification.md', title: '4軸事前検証ログ' },
    { filename: 'implementation_plan.md', title: '実装計画書' },
    { filename: 'walkthrough.md', title: '実装成果レポート' },
  ];

  for (const doc of REQUIRED_ROOT_DOCS) {
    const docPath = path.join(docsDir, doc.filename);
    if (!fs.existsSync(docPath)) {
      console.error(`\n❌ [ルートドキュメント欠落] docs/${doc.filename} が存在しません。`);
      hasError = true;
      continue;
    }
    const content = fs.readFileSync(docPath, 'utf-8').trim();
    if (content.length < 50) {
      console.error(`\n❌ [ルートドキュメント内容不足] docs/${doc.filename} の内容が極めて短小です (${content.length}文字)。`);
      hasError = true;
    }
  }

  // 2. Scan issue folders
  const entries = fs.readdirSync(issuesDir, { withFileTypes: true });
  const issueDirs = entries.filter((e) => e.isDirectory() && e.name.startsWith('ISSUE-')).map((e) => e.name);

  if (issueDirs.length === 0) {
    console.error('\n❌ [Issue ディレクトリ不在] docs/issues/ 配下に ISSUE-XXX フォルダが存在しません。');
    return false;
  }

  let validCount = 0;
  for (const dirName of issueDirs) {
    const dirPath = path.join(issuesDir, dirName);
    const issueMdPath = path.join(dirPath, 'issue.md');

    if (!fs.existsSync(issueMdPath)) {
      console.error(`\n❌ [Issue 仕様書欠落] ${dirName}/issue.md が存在しません。`);
      hasError = true;
      continue;
    }

    validCount++;
  }

  console.log(`    ✓ docs/issues/: 全 ${validCount} 件の Issue フォルダ構造・仕様書存在を確認済`);

  return !hasError;
}
