import assert from 'node:assert/strict';
import test from 'node:test';

const { createImageLightbox } = require('../media/imageLightbox.js');

function createClassList() {
  const values = new Set<string>();
  return {
    add(value: string) {
      values.add(value);
    },
    remove(value: string) {
      values.delete(value);
    },
    contains(value: string) {
      return values.has(value);
    },
  };
}

function createElement(tagName: string) {
  const attrs = new Map<string, string>();
  const handlers = new Map<string, Array<(event: any) => void>>();
  const capturedPointers = new Set<number>();
  const element: any = {
    tagName: tagName.toUpperCase(),
    children: [] as any[],
    classList: createClassList(),
    parentElement: null as any,
    hidden: false,
    tabIndex: -1,
    textContent: '',
    focused: false,
    style: {} as Record<string, string>,
    appendChild(child: any) {
      child.parentElement = element;
      element.children.push(child);
      return child;
    },
    addEventListener(type: string, handler: (event: any) => void) {
      const existing = handlers.get(type) ?? [];
      existing.push(handler);
      handlers.set(type, existing);
    },
    dispatch(type: string, event: Record<string, unknown> = {}) {
      for (const handler of handlers.get(type) ?? []) {
        handler({
          preventDefault() {},
          stopPropagation() {},
          target: element,
          ...event,
        });
      }
    },
    click() {
      element.dispatch('click');
    },
    focus() {
      element.focused = true;
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
    closest(selector: string) {
      let current: any = element;
      while (current) {
        if (selector === 'a' && current.tagName === 'A') {
          return current;
        }
        if (selector.startsWith('.') && current.classList.contains(selector.slice(1))) {
          return current;
        }
        current = current.parentElement;
      }
      return null;
    },
    getAttribute(name: string) {
      if (name === 'src' && element.src) {
        return element.src;
      }
      return attrs.get(name) ?? null;
    },
    setAttribute(name: string, value: string) {
      attrs.set(name, value);
      if (name === 'id') {
        element.id = value;
      }
      if (name === 'class') {
        element.className = value;
      }
    },
    removeAttribute(name: string) {
      attrs.delete(name);
      delete element[name];
    },
    replaceChildren() {
      element.children = [];
      element.textContent = '';
    },
    querySelector(selector: string) {
      return find(element, (item) => selector.startsWith('.') && item.classList.contains(selector.slice(1)));
    },
  };

  Object.defineProperty(element, 'className', {
    get() {
      return Array.from((element.classList as any).values ?? []).join(' ');
    },
    set(value: string) {
      for (const item of value.split(/\s+/).filter(Boolean)) {
        element.classList.add(item);
      }
    },
  });

  return element;
}

function find(root: any, predicate: (item: any) => boolean): any {
  for (const child of root.children ?? []) {
    if (predicate(child)) {
      return child;
    }
    const found = find(child, predicate);
    if (found) {
      return found;
    }
  }
  return null;
}

function createDocument() {
  const body = createElement('body');
  return {
    body,
    createElement,
    getElementById(id: string) {
      return find(body, (item) => item.id === id);
    },
  };
}

test('opens image lightbox from preview image and restores focus on close', () => {
  const document = createDocument();
  const controls = createImageLightbox({ document });
  const image = createElement('img');
  image.src = 'file:///tmp/diagram.png';
  image.currentSrc = 'webview://diagram.png';
  image.alt = 'Architecture diagram';
  const previewContent = {
    querySelectorAll(selector: string) {
      return selector === 'img' ? [image] : [];
    },
  };

  controls.setup(previewContent);
  image.click();

  const lightbox = document.getElementById('image-lightbox');
  const lightboxImage = lightbox.querySelector('.image-lightbox-image');
  const caption = lightbox.querySelector('.image-lightbox-caption');
  const closeButton = lightbox.querySelector('.image-lightbox-close');

  assert.equal(image.classList.contains('preview-image-lightbox-trigger'), true);
  assert.equal(image.tabIndex, 0);
  assert.equal(lightbox.classList.contains('is-open'), true);
  assert.equal(document.body.classList.contains('has-image-lightbox'), true);
  assert.equal(lightboxImage.src, 'webview://diagram.png');
  assert.equal(lightboxImage.alt, 'Architecture diagram');
  assert.equal(caption.textContent, 'Architecture diagram');
  assert.equal(caption.hidden, false);
  assert.equal(closeButton.focused, true);

  assert.equal(controls.closeIfOpen(), true);

  assert.equal(lightbox.classList.contains('is-open'), false);
  assert.equal(document.body.classList.contains('has-image-lightbox'), false);
  assert.equal(lightboxImage.src, undefined);
  assert.equal(caption.hidden, true);
  assert.equal(image.focused, true);
});

test('zooms, pans, and resets the open image without changing preview content', () => {
  const document = createDocument();
  const controls = createImageLightbox({ document });
  const image = createElement('img');
  image.src = 'file:///tmp/diagram.png';
  image.currentSrc = 'webview://diagram.png';
  image.alt = 'Architecture diagram';
  const previewContent = {
    querySelectorAll(selector: string) {
      return selector === 'img' ? [image] : [];
    },
  };

  controls.setup(previewContent);
  image.click();

  const lightbox = document.getElementById('image-lightbox');
  const lightboxImage = lightbox.querySelector('.image-lightbox-image');
  const zoomIn = lightbox.querySelector('.image-lightbox-zoom-in');
  const reset = lightbox.querySelector('.image-lightbox-reset');

  assert.equal(zoomIn.getAttribute('aria-label'), 'Zoom image in');
  assert.equal(reset.getAttribute('aria-label'), 'Reset image view');

  zoomIn.click();
  assert.equal(lightboxImage.style.transform, 'translate(0px, 0px) scale(1.15)');

  lightboxImage.dispatch('pointerdown', { button: 0, clientX: 10, clientY: 20, pointerId: 4 });
  lightboxImage.dispatch('pointermove', { clientX: 30, clientY: 45, pointerId: 4 });
  assert.equal(lightboxImage.style.transform, 'translate(20px, 25px) scale(1.15)');

  lightboxImage.dispatch('pointerup', { pointerId: 4 });
  assert.equal(lightboxImage.hasPointerCapture(4), false);

  lightboxImage.dispatch('dblclick');
  assert.equal(lightboxImage.style.transform, 'translate(0px, 0px) scale(1)');

  zoomIn.click();
  reset.click();
  assert.equal(lightboxImage.style.transform, 'translate(0px, 0px) scale(1)');
  assert.equal(image.src, 'file:///tmp/diagram.png');
});
