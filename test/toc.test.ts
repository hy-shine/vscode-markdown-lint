import assert from 'node:assert/strict';
import test from 'node:test';
import { extractToc, getFrontMatterLineCount, slugify } from '../src/core/toc';

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

test('normalizes inline Markdown markers in heading text', () => {
  const toc = extractToc([
    '#### **Bold Heading** Mapping',
    '#### Heading with `code`',
    '#### [Linked Heading](https://example.com)',
  ].join('\n'));

  assert.deepEqual(toc.map((item) => item.text), [
    'Bold Heading Mapping',
    'Heading with code',
    'Linked Heading',
  ]);
  assert.deepEqual(toc.map((item) => item.slug), [
    'bold-heading-mapping',
    'heading-with-code',
    'linked-heading',
  ]);
});

// --- Front matter ---

test('skips YAML front matter before extracting headings', () => {
  const md = [
    '---',
    'title: My Post',
    '---',
    '# Real Heading',
    '## Details',
  ].join('\n');

  const toc = extractToc(md);
  assert.deepEqual(toc, [
    { level: 1, text: 'Real Heading', line: 3, slug: 'real-heading' },
    { level: 2, text: 'Details', line: 4, slug: 'details' },
  ]);
});

test('skips front matter with YAML comments', () => {
  const md = [
    '---',
    '# This is a YAML comment',
    'title: My Post',
    '---',
    '# Actual Heading',
  ].join('\n');

  const toc = extractToc(md);
  assert.equal(toc.length, 1);
  assert.equal(toc[0].text, 'Actual Heading');
  assert.equal(toc[0].line, 4);
});

test('handles document without front matter', () => {
  const md = ['# Heading', '## Sub'].join('\n');
  const toc = extractToc(md);
  assert.equal(toc.length, 2);
  assert.equal(toc[0].line, 0);
  assert.equal(toc[1].line, 1);
});

test('getFrontMatterLineCount returns line count of front matter', () => {
  const md = ['---', 'title: Hello', '---', '# Heading'].join('\n');
  assert.equal(getFrontMatterLineCount(md), 3);
});

test('getFrontMatterLineCount returns 0 for no front matter', () => {
  assert.equal(getFrontMatterLineCount('# Heading'), 0);
});
