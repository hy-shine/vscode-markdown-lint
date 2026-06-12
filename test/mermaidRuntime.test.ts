import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const {
  MERMAID_SECURITY_LEVEL,
  createEventListenerScope,
  createMermaidRenderSession,
} = require('../media/mermaidRuntime.js');

test('uses antiscript as the default Mermaid security level', () => {
  assert.equal(MERMAID_SECURITY_LEVEL, 'antiscript');
});

test('render session invalidates older Mermaid render tokens', () => {
  const session = createMermaidRenderSession();

  const first = session.start();
  assert.equal(session.isCurrent(first), true);

  const second = session.start();
  assert.equal(session.isCurrent(first), false);
  assert.equal(session.isCurrent(second), true);
});

test('event listener scope uses AbortController signal when available', () => {
  const added: unknown[] = [];
  let aborted = false;
  class FakeAbortController {
    signal = { id: 'signal' };

    abort() {
      aborted = true;
    }
  }
  const target = {
    addEventListener(type: string, listener: () => void, options: unknown) {
      added.push({ type, listener, options });
    },
    removeEventListener() {
      throw new Error('AbortController-backed listeners should not need manual removal');
    },
  };

  const scope = createEventListenerScope({ AbortController: FakeAbortController });
  const listener = () => {};
  scope.add(target, 'keydown', listener, { capture: true });
  scope.abort();

  assert.equal(aborted, true);
  assert.deepEqual(added, [
    {
      type: 'keydown',
      listener,
      options: { capture: true, signal: { id: 'signal' } },
    },
  ]);
});

test('event listener scope falls back to removeEventListener without AbortController', () => {
  const removed: unknown[] = [];
  const target = {
    addEventListener() {},
    removeEventListener(type: string, listener: () => void, capture: boolean) {
      removed.push({ type, listener, capture });
    },
  };

  const scope = createEventListenerScope({ AbortController: null });
  const listener = () => {};
  scope.add(target, 'click', listener, { capture: true });
  scope.abort();
  scope.abort();

  assert.deepEqual(removed, [
    {
      type: 'click',
      listener,
      capture: true,
    },
  ]);
});
