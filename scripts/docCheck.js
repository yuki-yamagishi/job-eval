/**
 * Automated Document Integrity & Completeness Check
 * Verifies docs/pre_phase_verification.md, docs/implementation_plan.md, docs/walkthrough.md, and docs/adr/
 */

import fs from 'fs';
import path from 'path';

const DOCS_DIR = path.resolve(process.cwd(), 'docs');
const ADR_DIR = path.resolve(DOCS_DIR, 'adr');

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

// 1. Check primary required documents
for (const doc of REQUIRED_DOCS) {
  const filePath = path.join(DOCS_DIR, doc.filename);

  // File existence check
  if (!fs.existsSync(filePath)) {
    console.error(`\n❌ [ドキュメント欠落] ${doc.filename} が存在しません。`);
    console.error(`   👉 対処法: docs/${doc.filename} を作成し、${doc.title} を記述してください。`);
    hasError = true;
    continue;
  }

  const content = fs.readFileSync(filePath, 'utf-8').trim();

  // Empty or minimal content check
  if (content.length < 50) {
    console.error(`\n❌ [ドキュメント内容不足] ${doc.filename} の内容が極めて短小です (${content.length}文字)。`);
    console.error(`   👉 対処法: docs/${doc.filename} に詳細な設計・検証内容を記述してください。`);
    hasError = true;
    continue;
  }

  // Required sections / keywords check
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

// 2. Check ADR directory and ADR README index completeness
if (fs.existsSync(ADR_DIR)) {
  const adrReadmePath = path.join(ADR_DIR, 'README.md');
  if (!fs.existsSync(adrReadmePath)) {
    console.error('\n❌ [ADR インデックス欠落] docs/adr/README.md が存在しません。');
    hasError = true;
  } else {
    const adrReadmeContent = fs.readFileSync(adrReadmePath, 'utf-8');
    const adrFiles = fs.readdirSync(ADR_DIR).filter((file) => {
      return file.endsWith('.md') && file !== 'README.md' && file !== '0000-template.md';
    });

    const unlistedAdrs = [];
    for (const adrFile of adrFiles) {
      // Check if file name or ADR number (e.g. ADR-0001) is present in README.md
      const adrMatch = adrFile.match(/^(\d{4})/);
      const adrNumber = adrMatch ? `ADR-${adrMatch[1]}` : adrFile;

      if (!adrReadmeContent.includes(adrFile) && !adrReadmeContent.includes(adrNumber)) {
        unlistedAdrs.push(`${adrFile} (${adrNumber})`);
      }
    }

    if (unlistedAdrs.length > 0) {
      console.error('\n❌ [ADR インデックス未登録] 以下の ADR ファイルが docs/adr/README.md の一覧テーブルに登録されていません:');
      unlistedAdrs.forEach((item) => console.error(`   - ${item}`));
      console.error('   👉 対処法: docs/adr/README.md のテーブルに該当 ADR を追記してください。');
      hasError = true;
    } else {
      console.log(`  ✓ docs/adr/README.md (ADR 一覧インデックス): 全 ${adrFiles.length} 件の ADR 登録確認済`);
    }
  }
}

// 3. Overall check
if (hasError) {
  console.error('\n🚫 Document Integrity Check FAILED: ドキュメントの不整合または記載漏れが検知されたため、処理を中断します。\n');
  process.exit(1);
}

console.log('✅ Document Integrity Check PASSED: すべてのドキュメントの整合性が確認されました。\n');
process.exit(0);
