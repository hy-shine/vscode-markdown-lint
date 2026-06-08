import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveHeadingMeta } from '../src/core/headings';
import { TocItem } from '../src/types';

const toc: TocItem[] = [
  { level: 1, text: 'Intro', line: 0, slug: 'intro' },
  { level: 2, text: 'Intro', line: 4, slug: 'intro-1' },
  { level: 1, text: '**Bold** Heading', line: 8, slug: 'bold-heading' },
];

test('resolves heading metadata by render order', () => {
  assert.deepEqual(resolveHeadingMeta(toc, 0, 'Intro'), { line: 0, slug: 'intro' });
  assert.deepEqual(resolveHeadingMeta(toc, 1, 'Intro'), { line: 4, slug: 'intro-1' });
});

test('uses TOC metadata even when rendered heading text differs', () => {
  assert.deepEqual(resolveHeadingMeta(toc, 2, '<strong>Bold</strong> Heading'), {
    line: 8,
    slug: 'bold-heading',
  });
});

test('falls back to a slugified plain heading when TOC is missing', () => {
  assert.deepEqual(resolveHeadingMeta(toc, 99, '<code>Code</code> Heading!'), {
    line: 0,
    slug: 'code-heading',
  });
});
