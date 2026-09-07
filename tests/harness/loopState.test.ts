import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { 
  LoopStateMachine, 
  STATUS, 
  createInitialState 
} from '../../scripts/harness/loopState.js';

describe('LoopStateMachine', () => {
  let tempDir: string;
  let testStateFile: string;
  let machine: LoopStateMachine;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'loop-state-test-'));
    testStateFile = path.join(tempDir, 'loop_state.json');
    machine = new LoopStateMachine(testStateFile);
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

  it('returns IDLE state when state file does not exist', () => {
    const state = machine.getState();
    expect(state.status).toBe(STATUS.IDLE);
    expect(state.prNumber).toBeNull();
    expect(state.issues).toEqual([]);

    const check = machine.canStop();
    expect(check.allowed).toBe(true);
    expect(check.status).toBe(STATUS.IDLE);
  });

  it('handles corrupted JSON files gracefully by returning initial state', () => {
    fs.writeFileSync(testStateFile, '{ broken_json: ', 'utf8');
    const state = machine.getState();
    expect(state.status).toBe(STATUS.IDLE);
  });

  it('transitions to PR_CREATED when setPrCreated is called', () => {
    const state = machine.setPrCreated(45);
    expect(state.status).toBe(STATUS.PR_CREATED);
    expect(state.prNumber).toBe(45);
    expect(state.issues).toEqual([]);

    // Verification from disk
    const diskState = machine.getState();
    expect(diskState.status).toBe(STATUS.PR_CREATED);
    expect(diskState.prNumber).toBe(45);

    // canStop should be rejected
    const check = machine.canStop();
    expect(check.allowed).toBe(false);
    expect(check.status).toBe(STATUS.PR_CREATED);
    expect(check.reason).toContain('Stop rejected');
  });

  it('throws error for invalid PR number in setPrCreated', () => {
    expect(() => machine.setPrCreated(0)).toThrow('Invalid PR number');
    expect(() => machine.setPrCreated(-1)).toThrow('Invalid PR number');
    expect(() => machine.setPrCreated(NaN)).toThrow('Invalid PR number');
    // @ts-expect-error invalid input test
    expect(() => machine.setPrCreated('abc')).toThrow('Invalid PR number');
  });

  it('transitions to REVIEW_REQUESTED when setReviewRequested is called', () => {
    machine.setPrCreated(45);
    const state = machine.setReviewRequested();
    expect(state.status).toBe(STATUS.REVIEW_REQUESTED);
    expect(state.reviewRequestedAt).toBeTruthy();

    const check = machine.canStop();
    expect(check.allowed).toBe(false);
    expect(check.status).toBe(STATUS.REVIEW_REQUESTED);
  });

  it('transitions to NEEDS_FIX if review has blocking issues ([must], [should])', () => {
    machine.setPrCreated(45);
    machine.setReviewRequested();

    const state = machine.setReviewResult({
      lgtm: false,
      issues: [
        { id: 'issue-1', type: 'must', description: 'Fix SQL injection vulnerability', resolved: false },
        { id: 'issue-2', type: 'nits', description: 'Fix typo in comment', resolved: false },
      ],
    });

    expect(state.status).toBe(STATUS.NEEDS_FIX);
    expect(state.issues).toHaveLength(2);

    const check = machine.canStop();
    expect(check.allowed).toBe(false);
    expect(check.status).toBe(STATUS.NEEDS_FIX);
    expect(check.reason).toContain('1 unresolved blocking issue(s)');
  });

  it('transitions to RESOLVED_LGTM if review has LGTM and only non-blocking issues ([imo], [nits], [good])', () => {
    machine.setPrCreated(45);
    machine.setReviewRequested();

    const state = machine.setReviewResult({
      lgtm: true,
      issues: [
        { id: 'issue-1', type: 'nits', description: 'Add optional docstring', resolved: false },
        { id: 'issue-2', type: 'good', description: 'Clean architecture implementation', resolved: false },
      ],
    });

    expect(state.status).toBe(STATUS.RESOLVED_LGTM);

    const check = machine.canStop();
    expect(check.allowed).toBe(true);
    expect(check.status).toBe(STATUS.RESOLVED_LGTM);
  });

  it('resolves specific issues and transitions to RESOLVED_LGTM once all blocking issues are resolved', () => {
    machine.setPrCreated(45);
    machine.setReviewResult({
      lgtm: false,
      issues: [
        { id: 'issue-1', type: 'must', description: 'Fix issue 1', resolved: false },
        { id: 'issue-2', type: 'should', description: 'Fix issue 2', resolved: false },
        { id: 'issue-3', type: 'nits', description: 'Small typo', resolved: false },
      ],
    });

    expect(machine.getState().status).toBe(STATUS.NEEDS_FIX);

    // Resolve only issue-1
    const step1 = machine.resolveIssues('commit-abc1', ['issue-1']);
    expect(step1.status).toBe(STATUS.NEEDS_FIX);
    expect(step1.issues.find((i: { id: string }) => i.id === 'issue-1')?.resolved).toBe(true);
    expect(step1.issues.find((i: { id: string }) => i.id === 'issue-1')?.resolvedCommit).toBe('commit-abc1');
    expect(machine.canStop().allowed).toBe(false);

    // Resolve issue-2
    const step2 = machine.resolveIssues('commit-abc2', ['issue-2']);
    expect(step2.status).toBe(STATUS.RESOLVED_LGTM);
    expect(step2.issues.find((i: { id: string }) => i.id === 'issue-2')?.resolved).toBe(true);
    expect(machine.canStop().allowed).toBe(true);
  });

  it('resolves all unresolved blocking issues when resolveIssues is called with null targetIds', () => {
    machine.setPrCreated(45);
    machine.setReviewResult({
      lgtm: false,
      issues: [
        { id: 'issue-1', type: 'must', description: 'Fix issue 1', resolved: false },
        { id: 'issue-2', type: 'should', description: 'Fix issue 2', resolved: false },
      ],
    });

    const state = machine.resolveIssues('commit-batch');
    expect(state.status).toBe(STATUS.RESOLVED_LGTM);
    expect(state.issues.every((i: { resolved: boolean }) => i.resolved)).toBe(true);
    expect(machine.canStop().allowed).toBe(true);
  });

  it('resets state machine to IDLE and removes state file', () => {
    machine.setPrCreated(45);
    expect(fs.existsSync(testStateFile)).toBe(true);

    const resetState = machine.reset();
    expect(resetState.status).toBe(STATUS.IDLE);
    expect(fs.existsSync(testStateFile)).toBe(false);

    const check = machine.canStop();
    expect(check.allowed).toBe(true);
  });
});
