import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { LoopStateMachine, STATUS } from '../../.agents/state/loopState.js';
import { handleStop } from '../../.agents/hooks/stopHook.js';
import { handlePreTool } from '../../.agents/hooks/preToolHook.js';
import { handlePostTool } from '../../.agents/hooks/postToolHook.js';

describe('Lifecycle Hooks (.agents/hooks/)', () => {
  let tempDir: string;
  let testStateFile: string;
  let testMachine: LoopStateMachine;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hooks-test-'));
    testStateFile = path.join(tempDir, 'loop_state.json');
    testMachine = new LoopStateMachine(testStateFile);
  });

  afterEach(() => {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch {
      // Ignored
    }
  });

  describe('stopHook', () => {
    it('allows stop when status is IDLE', () => {
      const result = handleStop({}, testMachine);
      expect(result.decision).toBe('allow');
      expect(result.reason).toContain('IDLE');
    });

    it('rejects stop with continue when status is PR_CREATED', () => {
      testMachine.setPrCreated(46);
      const result = handleStop({}, testMachine);
      expect(result.decision).toBe('continue');
      expect(result.reason).toContain('Stop rejected');
      expect(result.reason).toContain('PR_CREATED');
      expect(result.reason).toContain('loopState.js reset');
    });

    it('rejects stop with continue when status is REVIEW_REQUESTED', () => {
      testMachine.setPrCreated(46);
      testMachine.setReviewRequested();
      const result = handleStop({}, testMachine);
      expect(result.decision).toBe('continue');
      expect(result.reason).toContain('REVIEW_REQUESTED');
      expect(result.reason).toContain('loopState.js reset');
    });

    it('rejects stop with continue when status is NEEDS_FIX', () => {
      testMachine.setPrCreated(46);
      testMachine.setReviewResult({
        lgtm: false,
        issues: [
          { id: '1', type: 'must', description: 'Fix blocker', resolved: false },
        ],
      });
      const result = handleStop({}, testMachine);
      expect(result.decision).toBe('continue');
      expect(result.reason).toContain('NEEDS_FIX');
      expect(result.reason).toContain('loopState.js reset');
    });

    it('allows stop when status is RESOLVED_LGTM', () => {
      testMachine.setPrCreated(46);
      testMachine.setReviewResult({
        lgtm: true,
        issues: [],
      });
      const result = handleStop({}, testMachine);
      expect(result.decision).toBe('allow');
      expect(result.reason).toContain('RESOLVED_LGTM');
    });

    it('allows stop when status is PR_CREATED but active subagents are running (payload.hasActiveSubagents: true)', () => {
      testMachine.setPrCreated(46);
      const result = handleStop({ hasActiveSubagents: true }, testMachine);
      expect(result.decision).toBe('allow');
      expect(result.reason).toContain('Active subagent running');
      expect(result.reason).toContain('PR_CREATED');
    });

    it('allows stop when status is PR_CREATED and payload.fullyIdle is false (official Antigravity payload)', () => {
      testMachine.setPrCreated(46);
      const result = handleStop({ fullyIdle: false }, testMachine);
      expect(result.decision).toBe('allow');
      expect(result.reason).toContain('Active subagent running');
      expect(result.reason).toContain('PR_CREATED');
    });

    it('allows stop when status is REVIEW_REQUESTED and payload.fullyIdle is false (official Antigravity payload)', () => {
      testMachine.setPrCreated(46);
      testMachine.setReviewRequested({ activeSubagents: false });
      const result = handleStop({ fullyIdle: false }, testMachine);
      expect(result.decision).toBe('allow');
      expect(result.reason).toContain('Active subagent running');
      expect(result.reason).toContain('REVIEW_REQUESTED');
    });

    it('allows stop when status is REVIEW_REQUESTED and state has activeSubagents: true', () => {
      testMachine.setPrCreated(46);
      testMachine.setReviewRequested({ activeSubagents: true });
      const result = handleStop({}, testMachine);
      expect(result.decision).toBe('allow');
      expect(result.reason).toContain('Active subagent running');
      expect(result.reason).toContain('REVIEW_REQUESTED');
    });

    it('allows stop when payload has activeSubagents array or count in REVIEW_REQUESTED', () => {
      testMachine.setPrCreated(46);
      testMachine.setReviewRequested({ activeSubagents: false });

      const result1 = handleStop({ activeSubagents: 1 }, testMachine);
      expect(result1.decision).toBe('allow');

      const result2 = handleStop({ subagents: [{ role: 'fleet-reviewer' }] }, testMachine);
      expect(result2.decision).toBe('allow');
    });

    it('allows stop when environment variable ACTIVE_SUBAGENTS is true', () => {
      testMachine.setPrCreated(46);
      process.env.ACTIVE_SUBAGENTS = 'true';
      try {
        const result = handleStop({}, testMachine);
        expect(result.decision).toBe('allow');
        expect(result.reason).toContain('Active subagent running');
      } finally {
        delete process.env.ACTIVE_SUBAGENTS;
      }
    });

    it('allows stop unconditionally when payload specifies subagent context (isSubagent: true, role, agentType)', () => {
      testMachine.setPrCreated(46);
      testMachine.setReviewResult({
        lgtm: false,
        issues: [{ id: '1', type: 'must', description: 'Blocker', resolved: false }],
      });

      const result1 = handleStop({ isSubagent: true }, testMachine);
      expect(result1.decision).toBe('allow');
      expect(result1.reason).toContain('subagent context');

      const result2 = handleStop({ role: 'fleet-reviewer' }, testMachine);
      expect(result2.decision).toBe('allow');
      expect(result2.reason).toContain('subagent context');

      const result3 = handleStop({ agentRole: 'Code Reviewer' }, testMachine);
      expect(result3.decision).toBe('allow');
      expect(result3.reason).toContain('subagent context');
    });

    it('allows stop unconditionally when ANTIGRAVITY_SUBAGENT environment variable is set', () => {
      testMachine.setPrCreated(46);
      testMachine.setReviewResult({
        lgtm: false,
        issues: [{ id: '1', type: 'must', description: 'Blocker', resolved: false }],
      });

      process.env.ANTIGRAVITY_SUBAGENT = 'true';
      try {
        const result = handleStop({}, testMachine);
        expect(result.decision).toBe('allow');
        expect(result.reason).toContain('subagent context');
      } finally {
        delete process.env.ANTIGRAVITY_SUBAGENT;
      }
    });
  });

  describe('preToolHook', () => {
    it('allows non-command tools', () => {
      const result = handlePreTool({
        toolCall: {
          name: 'view_file',
          args: { AbsolutePath: 'test.txt' },
        },
      });
      expect(result.decision).toBe('allow');
    });

    it('allows safe shell commands', () => {
      const result1 = handlePreTool({
        toolCall: {
          name: 'run_command',
          args: { CommandLine: 'git status' },
        },
      });
      expect(result1.decision).toBe('allow');

      const result2 = handlePreTool({
        toolCall: {
          name: 'run_command',
          args: { CommandLine: 'npm run check:fast' },
        },
      });
      expect(result2.decision).toBe('allow');
    });

    it('denies unauthorized gh pr merge command', () => {
      const result = handlePreTool({
        toolCall: {
          name: 'run_command',
          args: { CommandLine: 'gh pr merge 46 --squash' },
        },
      });
      expect(result.decision).toBe('deny');
      expect(result.reason).toContain('gh pr merge');
      expect(result.reason).toContain('prohibited');
    });

    it('denies hanging interactive npm test command', () => {
      const result1 = handlePreTool({
        toolCall: {
          name: 'run_command',
          args: { CommandLine: 'npm test' },
        },
      });
      expect(result1.decision).toBe('deny');
      expect(result1.reason).toContain('Interactive test runner detected');

      const result2 = handlePreTool({
        toolCall: {
          name: 'run_command',
          args: { CommandLine: 'npm run test' },
        },
      });
      expect(result2.decision).toBe('deny');
      expect(result2.reason).toContain('Interactive test runner detected');

      const result3 = handlePreTool({
        toolCall: {
          name: 'run_command',
          args: { CommandLine: 'npm.cmd test' },
        },
      });
      expect(result3.decision).toBe('deny');
      expect(result3.reason).toContain('Interactive test runner detected');

      const result4 = handlePreTool({
        toolCall: {
          name: 'run_command',
          args: { CommandLine: 'npm.cmd run test' },
        },
      });
      expect(result4.decision).toBe('deny');
      expect(result4.reason).toContain('Interactive test runner detected');
    });

    it('allows non-hanging test commands (npm run test:run, npm test --run, npm run test:coverage)', () => {
      const result1 = handlePreTool({
        toolCall: {
          name: 'run_command',
          args: { CommandLine: 'npm run test:run' },
        },
      });
      expect(result1.decision).toBe('allow');

      const result2 = handlePreTool({
        toolCall: {
          name: 'run_command',
          args: { CommandLine: 'npm test --run' },
        },
      });
      expect(result2.decision).toBe('allow');

      const result3 = handlePreTool({
        toolCall: {
          name: 'run_command',
          args: { CommandLine: 'npm run test:coverage' },
        },
      });
      expect(result3.decision).toBe('allow');

      const result4 = handlePreTool({
        toolCall: {
          name: 'run_command',
          args: { CommandLine: 'npm.cmd run test:coverage' },
        },
      });
      expect(result4.decision).toBe('allow');
    });

    it('denies branch creation if working tree is dirty', () => {
      const mockExec = vi.fn().mockReturnValue(' M src/index.ts\n?? newfile.ts');
      const result = handlePreTool(
        {
          toolCall: {
            name: 'run_command',
            args: { CommandLine: 'git checkout -b feature/issue-99-test' },
          },
        },
        { execFn: mockExec, stateMachine: testMachine }
      );
      expect(result.decision).toBe('deny');
      expect(result.reason).toContain('Working tree is dirty');
    });

    it('allows branch creation if untracked files are only under docs/issues/', () => {
      const tempProject = fs.mkdtempSync(path.join(os.tmpdir(), 'dor-clean-'));
      const issueDir = path.join(tempProject, 'docs/issues/ISSUE-099_test');
      fs.mkdirSync(issueDir, { recursive: true });
      fs.writeFileSync(
        path.join(issueDir, 'issue.md'),
        '# Issue 99\n\n## 1. 解決すべき課題・背景 (Why)\nWhy details\n\n## 3. 排除するリスク\nRisk details\n'
      );
      fs.writeFileSync(
        path.join(issueDir, 'pre_verification.md'),
        '# Pre-Verification\n\n## 1. 日時\n2026-09-09\n\n## 3. 重複・パッチワーク点検 (Impact & Duplication Check)\nNo duplication found.\n'
      );

      const mockExec = vi.fn().mockReturnValue('?? docs/issues/ISSUE-099_test/issue.md\n?? docs/issues/ISSUE-099_test/pre_verification.md\n');
      try {
        const result = handlePreTool(
          {
            toolCall: {
              name: 'run_command',
              args: { CommandLine: 'git checkout -b feature/issue-99-test' },
            },
          },
          { execFn: mockExec, stateMachine: testMachine, projectRoot: tempProject }
        );
        expect(result.decision).toBe('allow');
      } finally {
        fs.rmSync(tempProject, { recursive: true, force: true });
      }
    });

    it('denies branch creation if loopState is not IDLE', () => {
      testMachine.setPrCreated(46);
      const mockExec = vi.fn().mockReturnValue('');
      const result = handlePreTool(
        {
          toolCall: {
            name: 'run_command',
            args: { CommandLine: 'git checkout -b feature/issue-99-test' },
          },
        },
        { execFn: mockExec, stateMachine: testMachine }
      );
      expect(result.decision).toBe('deny');
      expect(result.reason).toContain('An active review loop is still running');
    });

    it('denies branch creation if issue.md does not exist for the issue', () => {
      const mockExec = vi.fn().mockReturnValue('');
      const result = handlePreTool(
        {
          toolCall: {
            name: 'run_command',
            args: { CommandLine: 'git checkout -b feature/issue-999-nonexistent' },
          },
        },
        { execFn: mockExec, stateMachine: testMachine }
      );
      expect(result.decision).toBe('deny');
      expect(result.reason).toContain('No issue document found for Issue #999');
    });

    it('denies branch creation if issue.md lacks Why or Risk sections', () => {
      const mockExec = vi.fn().mockReturnValue('');
      const tempProject = fs.mkdtempSync(path.join(os.tmpdir(), 'why-check-'));
      const issueDir = path.join(tempProject, 'docs/issues/ISSUE-099_test');
      fs.mkdirSync(issueDir, { recursive: true });
      fs.writeFileSync(path.join(issueDir, 'issue.md'), '# Issue 99\n\n## 1. Description\nSome description without why or risk');

      try {
        const result = handlePreTool(
          {
            toolCall: {
              name: 'run_command',
              args: { CommandLine: 'git checkout -b feature/issue-99-test' },
            },
          },
          { execFn: mockExec, stateMachine: testMachine, projectRoot: tempProject }
        );
        expect(result.decision).toBe('deny');
        expect(result.reason).toContain('Missing required sections');
        expect(result.reason).toContain('template_issue.md');
      } finally {
        fs.rmSync(tempProject, { recursive: true, force: true });
      }
    });

    it('denies branch creation if pre_verification.md does not exist in target issue dir', () => {
      const mockExec = vi.fn().mockReturnValue('');
      const tempProject = fs.mkdtempSync(path.join(os.tmpdir(), 'pre-verif-missing-'));
      const issueDir = path.join(tempProject, 'docs/issues/ISSUE-099_test');
      fs.mkdirSync(issueDir, { recursive: true });
      fs.writeFileSync(
        path.join(issueDir, 'issue.md'),
        '# Issue 99\n\n## 1. 解決すべき課題・背景 (Why)\nSome why\n\n## 3. 排除するリスク (Risks to Eliminate)\nSome risk'
      );

      try {
        const result = handlePreTool(
          {
            toolCall: {
              name: 'run_command',
              args: { CommandLine: 'git checkout -b feature/issue-99-test' },
            },
          },
          { execFn: mockExec, stateMachine: testMachine, projectRoot: tempProject }
        );
        expect(result.decision).toBe('deny');
        expect(result.reason).toContain('pre_verification.md does not exist');
        expect(result.reason).toContain('template_pre_verification.md');
      } finally {
        fs.rmSync(tempProject, { recursive: true, force: true });
      }
    });

    it('denies branch creation if pre_verification.md lacks Impact & Duplication Check section', () => {
      const mockExec = vi.fn().mockReturnValue('');
      const tempProject = fs.mkdtempSync(path.join(os.tmpdir(), 'impact-missing-'));
      const issueDir = path.join(tempProject, 'docs/issues/ISSUE-099_test');
      fs.mkdirSync(issueDir, { recursive: true });
      fs.writeFileSync(
        path.join(issueDir, 'issue.md'),
        '# Issue 99\n\n## 1. 解決すべき課題・背景 (Why)\nSome why\n\n## 3. 排除するリスク (Risks to Eliminate)\nSome risk'
      );
      fs.writeFileSync(
        path.join(issueDir, 'pre_verification.md'),
        '# Pre Verification\n\n## 1. 日時\n2026-09-09\n\n## 2. 課題\n課題記述のみ'
      );

      try {
        const result = handlePreTool(
          {
            toolCall: {
              name: 'run_command',
              args: { CommandLine: 'git checkout -b feature/issue-99-test' },
            },
          },
          { execFn: mockExec, stateMachine: testMachine, projectRoot: tempProject }
        );
        expect(result.decision).toBe('deny');
        expect(result.reason).toContain("Missing 'Impact & Duplication Check' section");
        expect(result.reason).toContain('template_pre_verification.md');
      } finally {
        fs.rmSync(tempProject, { recursive: true, force: true });
      }
    });

    it('allows branch creation when tree is clean, state is IDLE, issue.md has Why/Risk, and pre_verification.md has Impact Check', () => {
      const mockExec = vi.fn().mockReturnValue('');
      const tempProject = fs.mkdtempSync(path.join(os.tmpdir(), 'why-pass-'));
      const issueDir = path.join(tempProject, 'docs/issues/ISSUE-099_test');
      fs.mkdirSync(issueDir, { recursive: true });
      fs.writeFileSync(
        path.join(issueDir, 'issue.md'),
        '# Issue 99\n\n## 1. 解決すべき課題・背景 (Why)\nSome why\n\n## 3. 排除するリスク (Risks to Eliminate)\nSome risk'
      );
      fs.writeFileSync(
        path.join(issueDir, 'pre_verification.md'),
        '# Pre Verification\n\n## 1. 日時\n2026-09-09\n\n## 3. 重複・パッチワーク点検 (Impact & Duplication Check)\n既存コード調査済み。重複なし。'
      );

      try {
        const result = handlePreTool(
          {
            toolCall: {
              name: 'run_command',
              args: { CommandLine: 'git checkout -b feature/issue-99-test' },
            },
          },
          { execFn: mockExec, stateMachine: testMachine, projectRoot: tempProject }
        );
        expect(result.decision).toBe('allow');
      } finally {
        fs.rmSync(tempProject, { recursive: true, force: true });
      }
    });

    describe('Block 4: Pre-PR Final Audit Gate (gh pr create)', () => {
      let tempProject: string;
      let issueDir: string;
      let adrDir: string;

      beforeEach(() => {
        tempProject = fs.mkdtempSync(path.join(os.tmpdir(), 'pre-pr-audit-'));
        issueDir = path.join(tempProject, 'docs/issues/ISSUE-099_test');
        adrDir = path.join(tempProject, 'docs/adr');
        fs.mkdirSync(issueDir, { recursive: true });
        fs.mkdirSync(adrDir, { recursive: true });

        // Setup complete 4-axis docs
        fs.writeFileSync(path.join(issueDir, 'issue.md'), '# Issue 99\n\n## 5. 受け入れ基準\n- [x] All done\n');
        fs.writeFileSync(path.join(issueDir, 'pre_verification.md'), '# Pre Verification\nSome verification details here\n');
        fs.writeFileSync(path.join(issueDir, 'plan.md'), '# Implementation Plan\nDetailed plan content here\n');
        fs.writeFileSync(path.join(issueDir, 'walkthrough.md'), '# Walkthrough Report\nDetailed walkthrough results\n');

        // Setup ADR and synchronized SSOT
        fs.writeFileSync(path.join(adrDir, '0018-test-architecture.md'), '# ADR-0018\nContent\n');
        fs.writeFileSync(
          path.join(tempProject, 'docs/architecture_overview.md'),
          '# SSOT\nCovers ADR-0001 to ADR-0018\n'
        );
      });

      afterEach(() => {
        fs.rmSync(tempProject, { recursive: true, force: true });
      });

      it('denies gh pr create if any 4-axis document is missing or empty', () => {
        // Remove walkthrough.md
        fs.unlinkSync(path.join(issueDir, 'walkthrough.md'));

        const result = handlePreTool(
          {
            toolCall: {
              name: 'run_command',
              args: { CommandLine: 'gh pr create --title "feat: test"' },
            },
          },
          { currentBranch: 'feature/issue-99-test', projectRoot: tempProject }
        );

        expect(result.decision).toBe('deny');
        expect(result.reason).toContain('Pre-PR Audit Failed: Missing or incomplete 4-axis document');
        expect(result.reason).toContain('walkthrough.md');
      });

      it('denies gh pr create if acceptance criteria contains unchecked items (- [ ])', () => {
        fs.writeFileSync(
          path.join(issueDir, 'issue.md'),
          '# Issue 99\n\n## 5. 受け入れ基準\n- [x] Item 1 done\n- [ ] Item 2 pending\n'
        );

        const result = handlePreTool(
          {
            toolCall: {
              name: 'run_command',
              args: { CommandLine: 'gh pr create --title "feat: test"' },
            },
          },
          { currentBranch: 'feature/issue-99-test', projectRoot: tempProject }
        );

        expect(result.decision).toBe('deny');
        expect(result.reason).toContain('Pre-PR Audit Failed: Unchecked acceptance criteria (- [ ])');
        expect(result.reason).toContain('mark them as [x]');

        // Also test with multiple spaces inside brackets
        fs.writeFileSync(
          path.join(issueDir, 'issue.md'),
          '# Issue 99\n\n## 5. 受け入れ基準\n- [x] Item 1 done\n- [   ] Item 2 pending with spaces\n'
        );

        const resultWithSpaces = handlePreTool(
          {
            toolCall: {
              name: 'run_command',
              args: { CommandLine: 'gh pr create --title "feat: test"' },
            },
          },
          { currentBranch: 'feature/issue-99-test', projectRoot: tempProject }
        );

        expect(resultWithSpaces.decision).toBe('deny');
        expect(resultWithSpaces.reason).toContain('Pre-PR Audit Failed: Unchecked acceptance criteria (- [ ])');
      });

      it('denies gh pr create if latest ADR is not synchronized in architecture_overview.md (SSOT)', () => {
        // Add ADR-0019 without updating SSOT
        fs.writeFileSync(path.join(adrDir, '0019-new-feature.md'), '# ADR-0019\n');

        const result = handlePreTool(
          {
            toolCall: {
              name: 'run_command',
              args: { CommandLine: 'gh pr create --title "feat: test"' },
            },
          },
          { currentBranch: 'feature/issue-99-test', projectRoot: tempProject }
        );

        expect(result.decision).toBe('deny');
        expect(result.reason).toContain('Pre-PR Audit Failed: The latest ADR (0019-new-feature.md) is not synchronized');
        expect(result.reason).toContain('architecture_overview.md');
      });

      it('allows gh pr create when all pre-PR audit checks pass', () => {
        const result = handlePreTool(
          {
            toolCall: {
              name: 'run_command',
              args: { CommandLine: 'gh pr create --title "feat: test"' },
            },
          },
          { currentBranch: 'feature/issue-99-test', projectRoot: tempProject }
        );

        expect(result.decision).toBe('allow');
      });
    });
  });

  describe('postToolHook', () => {
    it('ignores failed commands with error', () => {
      const result = handlePostTool(
        {
          toolCall: {
            name: 'run_command',
            args: { CommandLine: 'gh pr create --title test' },
          },
          error: 'exit status 1',
        },
        testMachine
      );
      expect(result).toEqual({});
      expect(testMachine.getState().status).toBe(STATUS.IDLE);
    });

    it('transitions state to PR_CREATED on successful gh pr create (fallback)', () => {
      const result = handlePostTool(
        {
          toolCall: {
            name: 'run_command',
            args: { CommandLine: 'gh pr create --title "feat: test PR" --body "..."' },
          },
        },
        testMachine
      );
      expect(result).toEqual({});
      expect(testMachine.getState().status).toBe(STATUS.PR_CREATED);
      expect(testMachine.getState().prNumber).toBeGreaterThan(0);
    });

    it('extracts PR number from tool output URL', () => {
      const result = handlePostTool(
        {
          toolCall: {
            name: 'run_command',
            args: { CommandLine: 'gh pr create' },
          },
          result: 'https://github.com/yuki-yamagishi/job-eval/pull/99\n',
        },
        testMachine
      );
      expect(result).toEqual({});
      expect(testMachine.getState().status).toBe(STATUS.PR_CREATED);
      expect(testMachine.getState().prNumber).toBe(99);
    });

    it('does not falsely extract issue number from command line and uses safe fallback or PR URL', () => {
      const result = handlePostTool(
        {
          toolCall: {
            name: 'run_command',
            args: { CommandLine: 'gh pr create --body "Closes #46"' },
          },
          // toolResult containing genuine PR URL
          result: 'https://github.com/yuki-yamagishi/job-eval/pull/105\n',
        },
        testMachine
      );
      expect(result).toEqual({});
      expect(testMachine.getState().status).toBe(STATUS.PR_CREATED);
      expect(testMachine.getState().prNumber).toBe(105);
    });

    it('uses safe fallback when no PR URL is detected', () => {
      const result = handlePostTool(
        {
          toolCall: {
            name: 'run_command',
            args: { CommandLine: 'gh pr create --body "Closes #46"' },
          },
        },
        testMachine
      );
      expect(result).toEqual({});
      expect(testMachine.getState().status).toBe(STATUS.PR_CREATED);
      expect(testMachine.getState().prNumber).toBeGreaterThanOrEqual(1);
    });
  });
});
