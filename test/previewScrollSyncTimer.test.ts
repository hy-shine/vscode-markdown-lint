import assert from 'node:assert/strict';
import test from 'node:test';
import { clearPreviewScrollSyncTimer } from '../src/preview/scrollSyncTimer';

test('clears a pending preview scroll sync timer and resets the handle', async () => {
  let fired = false;
  const owner: { scrollSyncTimer?: ReturnType<typeof setTimeout> } = {
    scrollSyncTimer: setTimeout(() => {
      fired = true;
    }, 10),
  };

  clearPreviewScrollSyncTimer(owner);

  assert.equal(owner.scrollSyncTimer, undefined);
  await new Promise((resolve) => setTimeout(resolve, 25));
  assert.equal(fired, false);
});

test('allows clearing an owner with no timer', () => {
  const owner: { scrollSyncTimer?: ReturnType<typeof setTimeout> } = {};

  clearPreviewScrollSyncTimer(owner);

  assert.equal(owner.scrollSyncTimer, undefined);
});
