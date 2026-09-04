/**
 * Automated Document & Harness Integrity Checker (Orchestrator)
 * Coordinates specialized checkers: adrChecker, agentSkillChecker, issueDocChecker
 */

import path from 'path';
import { checkAdrIntegrity } from './checkers/adrChecker.js';
import { checkAgentSkillIntegrity } from './checkers/agentSkillChecker.js';
import { checkIssueDocIntegrity } from './checkers/issueDocChecker.js';

const PROJECT_ROOT = process.cwd();
const DOCS_DIR = path.resolve(PROJECT_ROOT, 'docs');

console.log('📝 Running Automated Document & Harness Integrity Check...\n');

let allPassed = true;

// 1. Check ADRs
const adrOk = checkAdrIntegrity(DOCS_DIR);
if (!adrOk) allPassed = false;

// 2. Check Agent & Skill Synchronicity
const agentSkillOk = checkAgentSkillIntegrity(PROJECT_ROOT);
if (!agentSkillOk) allPassed = false;

// 3. Check Issue Docs & Root Docs
const issueDocOk = checkIssueDocIntegrity(DOCS_DIR);
if (!issueDocOk) allPassed = false;

if (!allPassed) {
  console.error('\n🚫 Document & Harness Integrity Check FAILED: ドキュメントまたはハーネス設定に不整合が検知されました。\n');
  process.exit(1);
}

console.log('\n✅ Document & Harness Integrity Check PASSED: 全ての整合性検証に合格しました。\n');
process.exit(0);
