/**
 * Automated Document Integrity & Completeness Check
 * Verifies docs/pre_phase_verification.md, docs/implementation_plan.md, and docs/walkthrough.md
 */

import fs from 'fs';
import path from 'path';

const DOCS_DIR = path.resolve(process.cwd(), 'docs');

const REQUIRED_DOCS = [
  {
    filename: 'pre_phase_verification.md',
    title: '4軸事前検証ログ (Pre-Phase Verification)',
    requiredSections: ['事前検証', '技術', 'UX', '永続性', 'テスト'],
  },
  {
    filename: 'implementation_plan.md',
    title: '実装計画書 (Implementation Plan)',
    requiredSections: ['変更', '検証'],
  },
  {
    filename: 'walkthrough.md',
    title: '実装成果レポート (Walkthrough)',
    requiredSections: ['成果', '検証'],
  },
];

console.log('📝 Running Automated Document Integrity & Completeness Check...');

if (!fs.existsSync(DOCS_DIR)) {
  console.error('\n❌ ERROR: docs/ directory does not exist.');
  process.exit(1);
}

let hasError = false;

for (const doc of REQUIRED_DOCS) {
  const filePath = path.join(DOCS_DIR, doc.filename);

  // 1. File existence check
  if (!fs.existsSync(filePath)) {
    console.error(`\n❌ [ドキュメント欠落] ${doc.filename} が存在しません。`);
    console.error(`   👉 対処法: docs/${doc.filename} を作成し、${doc.title} を記述してください。`);
    hasError = true;
    continue;
  }

  const content = fs.readFileSync(filePath, 'utf-8').trim();

  // 2. Empty or minimal content check
  if (content.length < 50) {
    console.error(`\n❌ [ドキュメント内容不足] ${doc.filename} の内容が極めて短小です (${content.length}文字)。`);
    console.error(`   👉 対処法: docs/${doc.filename} に詳細な設計・検証内容を記述してください。`);
    hasError = true;
    continue;
  }

  // 3. Required sections / keywords check
  const missingKeywords = [];
  for (const keyword of doc.requiredSections) {
    if (!content.includes(keyword)) {
      missingKeywords.push(keyword);
    }
  }

  if (missingKeywords.length > 0) {
    console.error(`\n❌ [ドキュメント構造不整合] ${doc.filename} に必須セクション・要素が見つかりません:`);
    console.error(`   不足キーワード: ${missingKeywords.join(', ')}`);
    console.error(`   👉 対処法: docs/${doc.filename} に該当セクションを追記してください。`);
    hasError = true;
    continue;
  }

  console.log(`  ✓ docs/${doc.filename} (${doc.title}): 正常・整合性確認済`);
}

// 4. Overall check
if (hasError) {
  console.error('\n🚫 Document Integrity Check FAILED: ドキュメントの不整合または記載漏れが検知されたため、処理を中断します。\n');
  process.exit(1);
}

console.log('✅ Document Integrity Check PASSED: すべてのドキュメントの整合性が確認されました。\n');
process.exit(0);
