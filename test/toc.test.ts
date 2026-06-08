import assert from 'node:assert/strict';
import test from 'node:test';
import { extractToc, slugify } from '../src/core/toc';

test('extracts ATX headings with level, text, line, and slug', () => {
  const toc = extractToc([
    '# Intro',
    '',
    'Some body text.',
    '## Details',
  ].join('\n'));

  assert.deepEqual(toc, [
    { level: 1, text: 'Intro', line: 0, slug: 'intro' },
    { level: 2, text: 'Details', line: 3, slug: 'details' },
  ]);
});

test('deduplicates repeated heading slugs in document order', () => {
  const toc = extractToc([
    '# Intro',
    '## Intro',
    '### Intro',
  ].join('\n'));

  assert.deepEqual(toc.map((item) => item.slug), ['intro', 'intro-1', 'intro-2']);
});

test('preserves Chinese characters when slugifying headings', () => {
  assert.equal(slugify('中文标题 Test!'), '中文标题-test');
});

test('ignores headings inside backtick fenced code blocks', () => {
  const toc = extractToc([
    '# Real Heading',
    '```ts',
    '# Fake Heading',
    '```',
    '## Next Heading',
  ].join('\n'));

  assert.deepEqual(toc.map((item) => item.text), ['Real Heading', 'Next Heading']);
});

test('ignores headings inside tilde fenced code blocks', () => {
  const toc = extractToc([
    '# Real Heading',
    '~~~md',
    '# Fake Heading',
    '~~~',
    '## Next Heading',
  ].join('\n'));

  assert.deepEqual(toc.map((item) => item.text), ['Real Heading', 'Next Heading']);
});

test('strips ATX closing hashes from heading text', () => {
  const toc = extractToc([
    '# Title #',
    '## Details ##',
  ].join('\n'));

  assert.deepEqual(toc.map((item) => item.text), ['Title', 'Details']);
  assert.deepEqual(toc.map((item) => item.slug), ['title', 'details']);
});
