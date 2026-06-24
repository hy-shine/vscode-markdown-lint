import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const {
  MERMAID_CDN_SRC,
  MERMAID_SECURITY_LEVEL,
  createEventListenerScope,
  createMermaidRenderSession,
  getMermaidScriptSources,
  isDarkPreviewAppearance,
  loadScriptSequence,
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

function classList(...classes: string[]) {
  return {
    contains(className: string) {
      return classes.includes(className);
    },
  };
}

test('preview appearance follows the resolved light or dark theme class', () => {
  assert.equal(isDarkPreviewAppearance(classList('theme-light', 'vscode-dark')), false);
  assert.equal(isDarkPreviewAppearance(classList('theme-dark', 'vscode-light')), true);
  assert.equal(isDarkPreviewAppearance(classList('vscode-dark')), false);
});

test('Mermaid script sources try local URI before pinned CDN fallback', () => {
  assert.deepEqual(getMermaidScriptSources('vscode-webview://local/mermaid.min.js'), [
    'vscode-webview://local/mermaid.min.js',
    'https://cdn.jsdelivr.net/npm/mermaid@11.15.0/dist/mermaid.min.js',
  ]);
});

test('Mermaid script sources avoid duplicate CDN entries', () => {
  assert.deepEqual(getMermaidScriptSources(MERMAID_CDN_SRC), [MERMAID_CDN_SRC]);
});

test('script sequence loader retries the next source after an error', async () => {
  const appended: any[] = [];
  const environment: any = {
    mermaid: undefined,
    document: {
      createElement() {
        return {};
      },
      head: {
        appendChild(script: any) {
          appended.push(script);
          if (appended.length === 1) {
            script.onerror();
            return;
          }
          environment.mermaid = { render: () => undefined };
          script.onload();
        },
      },
    },
  };

  const result = await loadScriptSequence(environment, ['local.js', 'cdn.js'], 'mermaid');

  assert.equal(result, environment.mermaid);
  assert.deepEqual(appended.map((script) => script.src), ['local.js', 'cdn.js']);
});

test('script sequence loader retries when a loaded script does not expose the global', async () => {
  const appended: any[] = [];
  const environment: any = {
    mermaid: undefined,
    document: {
      createElement() {
        return {};
      },
      head: {
        appendChild(script: any) {
          appended.push(script);
          if (appended.length === 1) {
            script.onload();
            return;
          }
          environment.mermaid = { render: () => undefined };
          script.onload();
        },
      },
    },
  };

  const result = await loadScriptSequence(environment, ['local.js', 'cdn.js'], 'mermaid');

  assert.equal(result, environment.mermaid);
  assert.deepEqual(appended.map((script) => script.src), ['local.js', 'cdn.js']);
});
