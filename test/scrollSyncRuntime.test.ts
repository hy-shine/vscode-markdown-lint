import assert from 'node:assert/strict';
import test from 'node:test';

const { createScrollSyncGate, findHeadingForSourceLine } = require('../media/scrollSyncRuntime.js');

function createTimerHost() {
  let now = 0;
  let nextId = 1;
  const timers = new Map<number, { runAt: number; callback: () => void }>();

  return {
    now: () => now,
    setTimeout(callback: () => void, delayMs: number) {
      const id = nextId++;
      timers.set(id, { runAt: now + delayMs, callback });
      return id;
    },
    clearTimeout(id: number) {
      timers.delete(id);
    },
    advance(ms: number) {
      now += ms;
      const due = Array.from(timers.entries())
        .filter(([, timer]) => timer.runAt <= now)
        .sort((a, b) => a[1].runAt - b[1].runAt);
      for (const [id, timer] of due) {
        if (!timers.has(id)) {
          continue;
        }
        timers.delete(id);
        timer.callback();
      }
    },
    pendingCount() {
      return timers.size;
    },
  };
}

test('blocks one or more scroll sync sources until their window expires', () => {
  const timerHost = createTimerHost();
  const gate = createScrollSyncGate(timerHost);

  gate.block('editor', 100);

  assert.equal(gate.isBlocked('editor'), true);
  assert.equal(gate.isBlocked(['navigation', 'editor']), true);
  assert.equal(gate.isBlocked('navigation'), false);

  timerHost.advance(99);
  assert.equal(gate.isBlocked('editor'), true);

  timerHost.advance(1);
  assert.equal(gate.isBlocked('editor'), false);
});

test('refreshes a block window without letting stale timers clear it', () => {
  const timerHost = createTimerHost();
  const gate = createScrollSyncGate(timerHost);

  gate.block('preview', 100);
  timerHost.advance(80);
  gate.block('preview', 100);
  timerHost.advance(30);

  assert.equal(gate.isBlocked('preview'), true);

  timerHost.advance(70);
  assert.equal(gate.isBlocked('preview'), false);
});

test('debounces callbacks and can clear the pending callback', () => {
  const timerHost = createTimerHost();
  const gate = createScrollSyncGate(timerHost);
  let calls = 0;

  gate.debounce(() => {
    calls += 1;
  }, 100);
  gate.debounce(() => {
    calls += 10;
  }, 100);
  assert.equal(timerHost.pendingCount(), 1);

  timerHost.advance(99);
  assert.equal(calls, 0);
  timerHost.advance(1);
  assert.equal(calls, 10);

  gate.debounce(() => {
    calls += 100;
  }, 100);
  gate.clearDebounce();
  timerHost.advance(100);
  assert.equal(calls, 10);
});

function heading(sourceLine?: string) {
  return {
    dataset: sourceLine === undefined ? {} : { sourceLine },
  };
}

test('finds the nearest previous heading for a source line', () => {
  const first = heading('3');
  const second = heading('10');
  const third = heading('20');
  const headings = [first, second, third];

  assert.equal(findHeadingForSourceLine(headings, 2), null);
  assert.equal(findHeadingForSourceLine(headings, 3), first);
  assert.equal(findHeadingForSourceLine(headings, 12), second);
  assert.equal(findHeadingForSourceLine(headings, 99), third);
});

test('skips headings without valid source line metadata', () => {
  const first = heading('5');
  const invalid = heading('not-a-number');
  const missing = heading();
  const second = heading('15');

  assert.equal(findHeadingForSourceLine([missing, first, invalid, second], 12), first);
  assert.equal(findHeadingForSourceLine([missing, invalid], 12), null);
});
