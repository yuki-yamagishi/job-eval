/**
 * ADR Integrity Checker
 * Verifies docs/adr/ files and docs/adr/README.md table index synchronization
 */

import fs from 'fs';
import path from 'path';

export function checkAdrIntegrity(docsDir) {
  const adrDir = path.resolve(docsDir, 'adr');
  let hasError = false;

  console.log('  🔍 [ADR Checker] Verifying ADR documents and index synchronization...');

  if (!fs.existsSync(adrDir)) {
    console.error('\n❌ [ADR Checker] docs/adr/ directory does not exist.');
    return false;
  }

  const adrReadmePath = path.join(adrDir, 'README.md');
  if (!fs.existsSync(adrReadmePath)) {
    console.error('\n❌ [ADR Checker] docs/adr/README.md does not exist.');
    return false;
  }

  const adrReadmeContent = fs.readFileSync(adrReadmePath, 'utf-8');
  const adrFiles = fs.readdirSync(adrDir).filter((file) => {
    return file.endsWith('.md') && file !== 'README.md' && file !== '0000-template.md';
  });

  const unlistedAdrs = [];
  for (const adrFile of adrFiles) {
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
    console.log(`    ✓ docs/adr/README.md: 全 ${adrFiles.length} 件の ADR 登録・採番整合性を確認済`);
  }

  return !hasError;
}
