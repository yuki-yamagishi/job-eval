/**
 * Automated Document & Harness Integrity Checker (Orchestrator)
 * Coordinates specialized checkers: adrChecker, agentSkillChecker, issueDocChecker
 * Supports --pre-commit flag for gradual verification during intermediate development commits
 */

import path from 'path';
import { checkAdrIntegrity } from './checkers/adrChecker.js';
import { checkAgentSkillIntegrity } from './checkers/agentSkillChecker.js';
import { checkIssueDocIntegrity } from './checkers/issueDocChecker.js';

const PROJECT_ROOT = process.cwd();
const DOCS_DIR = path.resolve(PROJECT_ROOT, 'docs');

const isPreCommit = process.argv.includes('--pre-commit');
const checkLabel = isPreCommit
  ? '📝 Running Automated Document & Harness Integrity Check (pre-commit 段階的検証モード)...\n'
  : '📝 Running Automated Document & Harness Integrity Check (厳格フル検証モード)...\n';
console.log(checkLabel);

let allPassed = true;

// 1. Check ADRs
const adrOk = checkAdrIntegrity(DOCS_DIR);
if (!adrOk) allPassed = false;

// 2. Check Agent & Skill Synchronicity
const agentSkillOk = checkAgentSkillIntegrity(PROJECT_ROOT);
if (!agentSkillOk) allPassed = false;

// 3. Check Issue Docs & Root Docs (supports gradual verification)
const issueDocOk = checkIssueDocIntegrity(DOCS_DIR, { isPreCommit });
if (!issueDocOk) allPassed = false;

if (!allPassed) {
  console.error('\n🚫 Document & Harness Integrity Check FAILED: ドキュメントまたはハーネス設定に不整合が検知されました。\n');
  process.exit(1);
}

console.log('\n✅ Document & Harness Integrity Check PASSED: 全ての整合性検証に合格しました。\n');
process.exit(0);
