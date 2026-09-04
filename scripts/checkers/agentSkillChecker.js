/**
 * Agent & Skill Synchronicity Checker
 * Verifies AGENTS.md and .agents/skills/job-eval-harness/SKILL.md consistency
 */

import fs from 'fs';
import path from 'path';

export function checkAgentSkillIntegrity(projectRoot) {
  let hasError = false;
  console.log('  🤖 [Agent & Skill Checker] Verifying AGENTS.md and SKILL.md alignment...');

  const agentsPath = path.resolve(projectRoot, 'AGENTS.md');
  const skillPath = path.resolve(projectRoot, '.agents/skills/job-eval-harness/SKILL.md');

  if (!fs.existsSync(agentsPath)) {
    console.error('\n❌ [エージェント規約欠落] AGENTS.md がプロジェクト直下に存在しません。');
    return false;
  }

  if (!fs.existsSync(skillPath)) {
    console.error('\n❌ [スキル定義欠落] .agents/skills/job-eval-harness/SKILL.md が存在しません。');
    return false;
  }

  const agentsContent = fs.readFileSync(agentsPath, 'utf-8');
  const skillContent = fs.readFileSync(skillPath, 'utf-8');

  // Key governance principles that MUST be reflected in both documents
  const REQUIRED_CORE_POLICIES = [
    { key: 'Conventional Commits', name: 'Conventional Commits 規約' },
    { key: 'npm run check', name: 'ワンショット品質ゲート (npm run check)' },
    { key: 'Fleet', name: '独立レビューサブエージェント (Fleet)' },
    { key: 'docs/', name: 'ドキュメント管理規約 (docs/)' },
  ];

  for (const policy of REQUIRED_CORE_POLICIES) {
    if (!agentsContent.includes(policy.key)) {
      console.error(`\n❌ [AGENTS.md 規約欠落] AGENTS.md に「${policy.name}」に関する記述がありません。`);
      hasError = true;
    }
    if (!skillContent.includes(policy.key)) {
      console.error(`\n❌ [SKILL.md 規約欠落] SKILL.md に「${policy.name}」に関する記述がありません。`);
      hasError = true;
    }
  }

  // Verify that subagent directory exists and contains necessary configuration
  const fleetSubagentDir = path.resolve(projectRoot, '.agents/subagents/fleet-reviewer');
  if (fs.existsSync(fleetSubagentDir)) {
    const subagentJson = path.join(fleetSubagentDir, 'subagent.json');
    const systemPromptMd = path.join(fleetSubagentDir, 'SYSTEM_PROMPT.md');
    if (!fs.existsSync(subagentJson) || !fs.existsSync(systemPromptMd)) {
      console.error('\n❌ [サブエージェント設定不備] .agents/subagents/fleet-reviewer/ に subagent.json または SYSTEM_PROMPT.md が存在しません。');
      hasError = true;
    } else {
      console.log('    ✓ Fleet レビュアーサブエージェント設定 (.agents/subagents/fleet-reviewer/): 構成確認済');
    }
  }

  if (!hasError) {
    console.log('    ✓ AGENTS.md & SKILL.md: ガバナンス・ワークフロー同期確認済');
  }

  return !hasError;
}
