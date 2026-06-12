import assert from 'node:assert/strict';
import test from 'node:test';

const { createCodeBlockControls } = require('../media/codeBlockControls.js');

function createClassList() {
  const values = new Set<string>();
  return {
    add(value: string) {
      values.add(value);
    },
    remove(value: string) {
      values.delete(value);
    },
    toggle(value: string, force?: boolean) {
      const shouldAdd = force ?? !values.has(value);
      if (shouldAdd) {
        values.add(value);
      } else {
        values.delete(value);
      }
      return shouldAdd;
    },
    contains(value: string) {
      return values.has(value);
    },
  };
}

function createButton(pre?: ReturnType<typeof createPre>) {
  const attrs = new Map<string, string>();
  let clickHandler: ((event: { stopPropagation(): void }) => void | Promise<void>) | undefined;

  return {
    classList: createClassList(),
    dataset: {} as Record<string, string>,
    textContent: '',
    addEventListener(type: string, handler: (event: { stopPropagation(): void }) => void | Promise<void>) {
      if (type === 'click') {
        clickHandler = handler;
      }
    },
    closest(selector: string) {
      return selector === 'pre' ? pre : null;
    },
    getAttribute(name: string) {
      return attrs.get(name) ?? null;
    },
    setAttribute(name: string, value: string) {
      attrs.set(name, value);
    },
    async click() {
      await clickHandler?.({ stopPropagation() {} });
    },
  };
}

function createPre() {
  const attrs = new Map<string, string>();
  return {
    getAttribute(name: string) {
      return attrs.get(name) ?? null;
    },
    setAttribute(name: string, value: string) {
      attrs.set(name, value);
    },
  };
}

test('toggles foldable code block state and accessible labels', () => {
  const controls = createCodeBlockControls();
  const pre = createPre();
  const button = createButton(pre);
  pre.setAttribute('data-folded', 'false');

  controls.toggleCodeFoldButton(button);

  assert.equal(pre.getAttribute('data-folded'), 'true');
  assert.equal(button.getAttribute('aria-expanded'), 'false');
  assert.equal(button.getAttribute('aria-label'), 'Expand code');
  assert.equal(button.textContent, 'Expand');

  controls.toggleCodeFoldButton(button);

  assert.equal(pre.getAttribute('data-folded'), 'false');
  assert.equal(button.getAttribute('aria-expanded'), 'true');
  assert.equal(button.getAttribute('aria-label'), 'Collapse code');
  assert.equal(button.textContent, 'Collapse');
});

test('copies code and shows success feedback', async () => {
  let copied = '';
  let reset: (() => void) | undefined;
  const controls = createCodeBlockControls({
    clipboard: {
      async writeText(value: string) {
        copied = value;
      },
    },
    setTimeout(callback: () => void) {
      reset = callback;
      return 1;
    },
    clearTimeout() {},
  });
  const button = createButton();
  button.dataset.code = 'console.log(1);';
  const previewContent = {
    querySelectorAll(selector: string) {
      return selector === '.code-copy-button' ? [button] : [];
    },
  };

  controls.setupCodeCopyButtons(previewContent);
  await button.click();

  assert.equal(copied, 'console.log(1);');
  assert.equal(button.textContent, 'Copied');
  assert.equal(button.getAttribute('aria-label'), 'Code copied');
  assert.equal(button.classList.contains('copied'), true);

  reset?.();

  assert.equal(button.textContent, 'Copy');
  assert.equal(button.getAttribute('aria-label'), 'Copy code');
  assert.equal(button.classList.contains('copied'), false);
});
