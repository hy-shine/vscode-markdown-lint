import assert from 'node:assert/strict';
import test from 'node:test';

const { createTableEnhancement } = require('../media/tableEnhancement.js');

function createClassList() {
  const values = new Set<string>();
  return {
    add(...items: string[]) {
      for (const item of items) values.add(item);
    },
    remove(...items: string[]) {
      for (const item of items) values.delete(item);
    },
    contains(value: string) {
      return values.has(value);
    },
  };
}

function createElement(tagName: string, textContent = '') {
  const listeners = new Map<string, Array<(event: any) => void>>();
  const element: any = {
    tagName: tagName.toUpperCase(),
    children: [] as any[],
    classList: createClassList(),
    parentElement: null as any,
    textContent,
    scrollLeft: 0,
    scrollWidth: 400,
    clientWidth: 200,
    appendChild(child: any) {
      removeFromParent(child);
      child.parentElement = element;
      element.children.push(child);
      return child;
    },
    insertBefore(child: any, before: any) {
      removeFromParent(child);
      child.parentElement = element;
      const index = element.children.indexOf(before);
      if (index === -1) {
        element.children.push(child);
      } else {
        element.children.splice(index, 0, child);
      }
      return child;
    },
    addEventListener(type: string, listener: (event: any) => void) {
      const existing = listeners.get(type) ?? [];
      existing.push(listener);
      listeners.set(type, existing);
    },
    dispatch(type: string) {
      for (const listener of listeners.get(type) ?? []) {
        listener({ target: element });
      }
    },
    querySelectorAll(selector: string) {
      if (selector === 'table') {
        return findAll(element, (item) => item.tagName === 'TABLE');
      }
      if (selector === 'tr') {
        return findAll(element, (item) => item.tagName === 'TR');
      }
      if (selector === 'th, td') {
        return findAll(element, (item) => item.tagName === 'TH' || item.tagName === 'TD');
      }
      return [];
    },
  };
  return element;
}

function removeFromParent(child: any) {
  const parent = child.parentElement;
  if (!parent) {
    return;
  }
  const index = parent.children.indexOf(child);
  if (index !== -1) {
    parent.children.splice(index, 1);
  }
}

function findAll(root: any, predicate: (item: any) => boolean): any[] {
  const result: any[] = [];
  for (const child of root.children ?? []) {
    if (predicate(child)) result.push(child);
    result.push(...findAll(child, predicate));
  }
  return result;
}

function createDocumentFixture() {
  return {
    createElement,
  };
}

function appendRow(table: any, values: string[]) {
  const tr = createElement('tr');
  for (const value of values) {
    tr.appendChild(createElement('td', value));
  }
  table.appendChild(tr);
  return tr;
}

test('wraps tables and marks numeric columns without changing table semantics', () => {
  const document = createDocumentFixture();
  const previewContent = createElement('main');
  const table = createElement('table');
  previewContent.appendChild(table);
  appendRow(table, ['Name', 'Price', 'Change']);
  appendRow(table, ['Alpha', '123.45', '+6.7%']);
  appendRow(table, ['Beta', '98', '-1.2%']);

  createTableEnhancement({ document }).setup(previewContent);

  const wrapper = previewContent.children[0];
  const rows = table.querySelectorAll('tr');
  const firstDataCells = rows[1].querySelectorAll('th, td');

  assert.equal(wrapper.classList.contains('table-scroll'), true);
  assert.equal(wrapper.children[0], table);
  assert.equal(table.classList.contains('table-enhanced'), true);
  assert.equal(previewContent.children.length, 1);
  assert.equal(firstDataCells[0].classList.contains('is-numeric'), false);
  assert.equal(firstDataCells[1].classList.contains('is-numeric'), true);
  assert.equal(firstDataCells[2].classList.contains('is-numeric'), true);
});

test('clears stale numeric column markers when a table is enhanced again', () => {
  const document = createDocumentFixture();
  const previewContent = createElement('main');
  const table = createElement('table');
  previewContent.appendChild(table);
  appendRow(table, ['Name', 'Price']);
  appendRow(table, ['Alpha', '123.45']);
  appendRow(table, ['Beta', '98']);

  const enhancement = createTableEnhancement({ document });
  enhancement.setup(previewContent);

  const rows = table.querySelectorAll('tr');
  const alphaCells = rows[1].querySelectorAll('th, td');
  const betaCells = rows[2].querySelectorAll('th, td');
  assert.equal(alphaCells[1].classList.contains('is-numeric'), true);

  alphaCells[1].textContent = 'n/a';
  betaCells[1].textContent = 'pending';
  enhancement.setup(previewContent);

  assert.equal(alphaCells[1].classList.contains('is-numeric'), false);
  assert.equal(betaCells[1].classList.contains('is-numeric'), false);
});

test('does not wrap an already enhanced table twice', () => {
  const document = createDocumentFixture();
  const previewContent = createElement('main');
  const wrapper = createElement('div');
  wrapper.classList.add('table-scroll');
  const table = createElement('table');
  wrapper.appendChild(table);
  previewContent.appendChild(wrapper);
  appendRow(table, ['A', '1']);
  appendRow(table, ['B', '2']);

  const enhancement = createTableEnhancement({ document });
  enhancement.setup(previewContent);
  enhancement.setup(previewContent);

  assert.equal(previewContent.children.length, 1);
  assert.equal(previewContent.children[0], wrapper);
  assert.equal(wrapper.children.length, 1);
});
