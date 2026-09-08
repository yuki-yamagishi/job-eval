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
    });

    it('rejects stop with continue when status is REVIEW_REQUESTED', () => {
      testMachine.setPrCreated(46);
      testMachine.setReviewRequested();
      const result = handleStop({}, testMachine);
      expect(result.decision).toBe('continue');
      expect(result.reason).toContain('REVIEW_REQUESTED');
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
      const result = handlePreTool({
        toolCall: {
          name: 'run_command',
          args: { CommandLine: 'npm test' },
        },
      });
      expect(result.decision).toBe('deny');
      expect(result.reason).toContain('Interactive test runner detected');
    });

    it('allows npm run test:run command', () => {
      const result = handlePreTool({
        toolCall: {
          name: 'run_command',
          args: { CommandLine: 'npm run test:run' },
        },
      });
      expect(result.decision).toBe('allow');
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

    it('transitions state to PR_CREATED on successful gh pr create', () => {
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
    });
  });
});
