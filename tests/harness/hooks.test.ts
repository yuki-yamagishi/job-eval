import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { LoopStateMachine, STATUS } from '../../scripts/harness/loopState.js';
import { handleStop } from '../../scripts/harness/hooks/stopHook.js';
import { handlePreTool } from '../../scripts/harness/hooks/preToolHook.js';
import { handlePostTool } from '../../scripts/harness/hooks/postToolHook.js';

describe('Lifecycle Hooks (scripts/harness/hooks/)', () => {
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

    it('allows non-hanging test commands (npm run test:run, npm test --run)', () => {
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
