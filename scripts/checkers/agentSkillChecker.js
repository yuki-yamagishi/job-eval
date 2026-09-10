/**
 * Agent & Skill Synchronicity Checker
 * Verifies AGENTS.md, Customization Layer skills, and fleet_reviewer.md consistency
 */

import fs from 'fs';
import path from 'path';

export function checkAgentSkillIntegrity(projectRoot) {
  let hasError = false;
  console.log('  🤖 [Agent & Skill Checker] Verifying AGENTS.md, Customization Layer skills, and fleet_reviewer.md alignment...');

  const agentsPath = path.resolve(projectRoot, 'AGENTS.md');
  const pluginJsonPath = path.resolve(projectRoot, '.agents/plugins/antigravity-review-loop/plugin.json');
  const issueSkillPath = path.resolve(projectRoot, '.agents/plugins/antigravity-review-loop/skills/issue-lifecycle/SKILL.md');
  const devSkillPath = path.resolve(projectRoot, '.agents/plugins/antigravity-review-loop/skills/dev-lifecycle/SKILL.md');
  const reviewSkillPath = path.resolve(projectRoot, '.agents/plugins/antigravity-review-loop/skills/review-self-healing/SKILL.md');
  const fleetAgentPath = path.resolve(projectRoot, '.agents/agents/fleet_reviewer.md');

  if (!fs.existsSync(agentsPath)) {
    console.error('\n❌ [エージェント規約欠落] AGENTS.md がプロジェクト直下に存在しません。');
    return false;
  }

  if (!fs.existsSync(pluginJsonPath)) {
    console.error('\n❌ [プラグインマニフェスト欠落] .agents/plugins/antigravity-review-loop/plugin.json が存在しません。');
    hasError = true;
  } else {
    console.log('    ✓ 公式プラグインマニフェスト (antigravity-review-loop/plugin.json): 構成確認済');
  }

  const skillsToCheck = [
    { path: issueSkillPath, name: 'issue-lifecycle' },
    { path: devSkillPath, name: 'dev-lifecycle' },
    { path: reviewSkillPath, name: 'review-self-healing' },
  ];

  for (const s of skillsToCheck) {
    if (!fs.existsSync(s.path)) {
      console.error(`\n❌ [スキル定義欠落] ${s.name} (${s.path}) が存在しません。`);
      hasError = true;
    }
  }

  if (!fs.existsSync(fleetAgentPath)) {
    console.error('\n❌ [サブエージェント定義欠落] .agents/agents/fleet_reviewer.md が存在しません。');
    hasError = true;
  } else {
    console.log('    ✓ Fleet レビュアー公式サブエージェント (.agents/agents/fleet_reviewer.md): 構成確認済');
  }

  const agentsContent = fs.readFileSync(agentsPath, 'utf-8');
  const allSkillsContent = skillsToCheck
    .filter((s) => fs.existsSync(s.path))
    .map((s) => fs.readFileSync(s.path, 'utf-8'))
    .join('\n');

  // Key governance principles that MUST be reflected across documents
  const REQUIRED_CORE_POLICIES = [
    { key: 'Conventional Commits', name: 'Conventional Commits 規約' },
    { key: 'npm run check', name: 'ワンショット品質ゲート (npm run check)' },
    { key: 'Fleet', name: '独立レビューサブエージェント (Fleet)' },
    { key: 'docs/', name: 'ドキュメント管理規約 (docs/)' },
    { key: 'loopState', name: 'ループ状態管理マシン (loopState)' },
    { key: 'resolveReview', name: '解決報告ツール (resolveReview)' },
    { key: 'DoD', name: 'ループエンジニアリング完了定義 (DoD)' },
  ];

  for (const policy of REQUIRED_CORE_POLICIES) {
    if (!agentsContent.includes(policy.key)) {
      console.error(`\n❌ [AGENTS.md 規約欠落] AGENTS.md に「${policy.name}」に関する記述がありません。`);
      hasError = true;
    }
    if (!allSkillsContent.includes(policy.key)) {
      console.error(`\n❌ [Skills 規約欠落] 分割スキル群に「${policy.name}」に関する記述がありません。`);
      hasError = true;
    }
  }

  if (!hasError) {
    console.log('    ✓ AGENTS.md & Customization Layer スキル群: ガバナンス・ワークフロー同期確認済');
  }

  return !hasError;
}
