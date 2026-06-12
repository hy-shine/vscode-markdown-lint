import assert from 'node:assert/strict';
import test from 'node:test';

const { createMermaidFullscreen, createMermaidInteraction } = require('../media/mermaidInteraction.js');

function createClassList(initial: string[] = []) {
  const values = new Set(initial);
  return {
    add(value: string) {
      values.add(value);
    },
    contains(value: string) {
      return values.has(value);
    },
  };
}

function createElement(tagName: string) {
  const attrs = new Map<string, string>();
  const listeners = new Map<string, Function[]>();
  const capturedPointers = new Set<number>();
  const element = {
    tagName,
    children: [] as ReturnType<typeof createElement>[],
    className: '',
    classList: createClassList(),
    innerHTML: '',
    parentElement: null as ReturnType<typeof createElement> | null,
    style: {} as Record<string, string>,
    appendChild(child: ReturnType<typeof createElement>) {
      child.parentElement = element;
      element.children.push(child);
      return child;
    },
    addEventListener(type: string, listener: Function) {
      const existing = listeners.get(type) ?? [];
      existing.push(listener);
      listeners.set(type, existing);
    },
    dispatch(type: string, event: Record<string, unknown> = {}) {
      for (const listener of listeners.get(type) ?? []) {
        listener({
          preventDefault() {},
          stopPropagation() {},
          ...event,
        });
      }
    },
    getAttribute(name: string) {
      return attrs.get(name) ?? null;
    },
    setAttribute(name: string, value: string) {
      attrs.set(name, value);
    },
    setPointerCapture(pointerId: number) {
      capturedPointers.add(pointerId);
    },
    hasPointerCapture(pointerId: number) {
      return capturedPointers.has(pointerId);
    },
    releasePointerCapture(pointerId: number) {
      capturedPointers.delete(pointerId);
    },
    remove() {
      if (!element.parentElement) {
        return;
      }
      element.parentElement.children = element.parentElement.children.filter((child) => child !== element);
      element.parentElement = null;
    },
    querySelector(selector: string) {
      if (selector.startsWith('.')) {
        return findByClass(element, selector.slice(1));
      }
      return null;
    },
    cloneNode(deep: boolean) {
      const clone = createElement(tagName);
      clone.className = element.className;
      clone.classList = createClassList(element.className.split(/\s+/).filter(Boolean));
      clone.innerHTML = element.innerHTML;
      for (const [name, value] of attrs) {
        clone.setAttribute(name, value);
      }
      if (deep) {
        for (const child of element.children) {
          clone.appendChild(child.cloneNode(true));
        }
      }
      return clone;
    },
  };

  return element;
}

function findByClass(root: ReturnType<typeof createElement>, className: string): ReturnType<typeof createElement> | null {
  if (root.className.split(/\s+/).includes(className)) {
    return root;
  }

  for (const child of root.children) {
    const found = findByClass(child, className);
    if (found) {
      return found;
    }
  }

  return null;
}

function createDocumentFixture() {
  const body = createElement('body');
  const documentRef = {
    body,
    createElement,
  };

  return documentRef;
}

function createFixture(options: { fullscreen?: boolean } = {}) {
  const svg = createElement('svg');
  const container = {
    ...createElement('div'),
    classList: createClassList(options.fullscreen ? ['mermaid-fullscreen-content'] : []),
    querySelector(selector: string) {
      if (selector === 'svg') {
        return svg;
      }
      if (selector.startsWith('.')) {
        return findByClass(container, selector.slice(1));
      }
      return null;
    },
  };
  const documentRef = createDocumentFixture();

  return {
    container,
    documentRef,
    svg,
  };
}

test('adds Mermaid zoom controls and applies zoom transforms', () => {
  const { container, documentRef, svg } = createFixture();
  const interaction = createMermaidInteraction({ document: documentRef });

  interaction.setup(container);
  const controls = container.querySelector('.mermaid-zoom-controls');
  const zoomIn = container.querySelector('.mermaid-zoom-in');
  const zoomOut = container.querySelector('.mermaid-zoom-out');
  const reset = container.querySelector('.mermaid-zoom-reset');

  assert.ok(controls);
  assert.equal(zoomIn?.getAttribute('aria-label'), 'Zoom in');
  assert.equal(zoomOut?.getAttribute('aria-label'), 'Zoom out');
  assert.equal(reset?.getAttribute('aria-label'), 'Reset zoom');

  zoomIn?.dispatch('click');
  assert.equal(svg.style.transform, 'translate(0px, 0px) scale(1.25)');

  zoomOut?.dispatch('click');
  assert.equal(svg.style.transform, 'translate(0px, 0px) scale(1)');

  zoomIn?.dispatch('click');
  reset?.dispatch('click');
  assert.equal(svg.style.transform, 'translate(0px, 0px) scale(1)');
});

test('pans Mermaid SVG with pointer capture and resets on double click', () => {
  const { container, documentRef, svg } = createFixture();
  const interaction = createMermaidInteraction({ document: documentRef });

  interaction.setup(container);
  svg.dispatch('pointerdown', { button: 0, clientX: 10, clientY: 20, pointerId: 7 });
  assert.equal(svg.style.cursor, 'grabbing');
  assert.equal(svg.hasPointerCapture(7), true);

  svg.dispatch('pointermove', { clientX: 30, clientY: 45, pointerId: 7 });
  assert.equal(svg.style.transform, 'translate(20px, 25px) scale(1)');

  svg.dispatch('pointerup', { pointerId: 7 });
  assert.equal(svg.hasPointerCapture(7), false);
  assert.equal(svg.style.cursor, 'grab');
  assert.equal(svg.style.transition, 'transform 0.15s ease');

  svg.dispatch('dblclick');
  assert.equal(svg.style.transform, 'translate(0px, 0px) scale(1)');
});

test('opens fullscreen only for unmodified click interactions', () => {
  const { container, documentRef, svg } = createFixture();
  let opened = 0;
  const interaction = createMermaidInteraction({
    document: documentRef,
    openFullscreen(target: unknown) {
      assert.equal(target, container);
      opened += 1;
    },
  });

  interaction.setup(container);
  container.dispatch('click', { detail: 2 });
  assert.equal(opened, 0);

  const zoomIn = container.querySelector('.mermaid-zoom-in');
  zoomIn?.dispatch('click');
  container.dispatch('click', { detail: 1 });
  assert.equal(opened, 0);

  const reset = container.querySelector('.mermaid-zoom-reset');
  reset?.dispatch('click');
  svg.dispatch('pointerdown', { button: 0, clientX: 10, clientY: 10, pointerId: 1 });
  svg.dispatch('pointermove', { clientX: 14, clientY: 10, pointerId: 1 });
  svg.dispatch('pointerup', { pointerId: 1 });
  container.dispatch('click', { detail: 1 });
  assert.equal(opened, 0);

  svg.dispatch('dblclick');
  container.dispatch('click', { detail: 1 });
  assert.equal(opened, 1);
});

test('does not open fullscreen from fullscreen clone content', () => {
  const { container, documentRef } = createFixture({ fullscreen: true });
  let opened = 0;
  const interaction = createMermaidInteraction({
    document: documentRef,
    openFullscreen() {
      opened += 1;
    },
  });

  interaction.setup(container);
  container.dispatch('click', { detail: 1 });

  assert.equal(opened, 0);
});

test('opens Mermaid fullscreen overlay, removes clone controls, and wires close actions', () => {
  const documentRef = createDocumentFixture();
  const container = createElement('div');
  const zoomControls = createElement('div');
  zoomControls.className = 'mermaid-zoom-controls';
  zoomControls.classList = createClassList(['mermaid-zoom-controls']);
  container.appendChild(zoomControls);
  let setupClone: unknown = null;
  let aborted = 0;
  const keydownListeners: Function[] = [];
  const fullscreen = createMermaidFullscreen({
    document: documentRef,
    environment: { name: 'window' },
    createEventListenerScope(environment: unknown) {
      assert.deepEqual(environment, { name: 'window' });
      return {
        add(target: unknown, type: string, listener: Function) {
          assert.equal(target, documentRef);
          assert.equal(type, 'keydown');
          keydownListeners.push(listener);
        },
        abort() {
          aborted += 1;
        },
      };
    },
    setupInteraction(clone: unknown) {
      setupClone = clone;
    },
  });

  const overlay = fullscreen.open(container);
  const clone = overlay.children[0];
  const closeButton = overlay.children[1];

  assert.equal(overlay.className, 'mermaid-fullscreen-overlay');
  assert.equal(documentRef.body.children.includes(overlay), true);
  assert.equal(clone.classList.contains('mermaid-fullscreen-content'), true);
  assert.equal(clone.querySelector('.mermaid-zoom-controls'), null);
  assert.equal(closeButton.className, 'mermaid-fullscreen-close');
  assert.equal(closeButton.getAttribute('aria-label'), 'Close fullscreen');
  assert.equal(setupClone, clone);

  closeButton.dispatch('click');
  assert.equal(aborted, 1);
  assert.equal(documentRef.body.children.includes(overlay), false);
});

test('closes Mermaid fullscreen from overlay click and Escape key', () => {
  const documentRef = createDocumentFixture();
  const container = createElement('div');
  let aborted = 0;
  let keydownListener: Function | null = null;
  const fullscreen = createMermaidFullscreen({
    document: documentRef,
    createEventListenerScope() {
      return {
        add(_target: unknown, type: string, listener: Function) {
          if (type === 'keydown') {
            keydownListener = listener;
          }
        },
        abort() {
          aborted += 1;
        },
      };
    },
  });

  const overlay = fullscreen.open(container);
  overlay.dispatch('click', { target: overlay });
  assert.equal(aborted, 1);
  assert.equal(documentRef.body.children.includes(overlay), false);

  const secondOverlay = fullscreen.open(container);
  keydownListener?.({ key: 'Escape' });
  assert.equal(aborted, 2);
  assert.equal(documentRef.body.children.includes(secondOverlay), false);
});
