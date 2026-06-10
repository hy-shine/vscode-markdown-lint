import assert from 'node:assert/strict';
import test from 'node:test';
import { ScrollSyncSuppressor } from '../src/core/scrollSync';

test('tracks active scroll sync suppression by source', () => {
  const timers: Array<() => void> = [];
  const suppressor = new ScrollSyncSuppressor({
    setTimeout(callback) {
      timers.push(callback);
      return timers.length - 1;
    },
    clearTimeout() {},
  });

  suppressor.suppress('preview', 250);
  assert.equal(suppressor.isActive('preview'), true);
  assert.equal(suppressor.isActive('resize'), false);
  assert.equal(suppressor.isActive(['preview', 'resize']), true);

  timers[0]();
  assert.equal(suppressor.isActive('preview'), false);
});

test('refreshes suppression windows without letting stale timers clear the new window', () => {
  const timers: Array<() => void> = [];
  const cleared: unknown[] = [];
  const suppressor = new ScrollSyncSuppressor({
    setTimeout(callback) {
      timers.push(callback);
      return timers.length - 1;
    },
    clearTimeout(handle) {
      cleared.push(handle);
    },
  });

  suppressor.suppress('preview', 250);
  suppressor.suppress('preview', 250);

  assert.deepEqual(cleared, [0]);
  timers[0]();
  assert.equal(suppressor.isActive('preview'), true);
  timers[1]();
  assert.equal(suppressor.isActive('preview'), false);
});

test('dispose clears all active suppression timers', () => {
  const cleared: unknown[] = [];
  const suppressor = new ScrollSyncSuppressor({
    setTimeout() {
      return Symbol('timer');
    },
    clearTimeout(handle) {
      cleared.push(handle);
    },
  });

  suppressor.suppress('preview', 250);
  suppressor.suppress('resize', 300);
  suppressor.dispose();

  assert.equal(cleared.length, 2);
  assert.equal(suppressor.isActive(['preview', 'resize']), false);
});
