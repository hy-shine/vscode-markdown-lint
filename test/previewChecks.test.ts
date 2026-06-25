import assert from 'node:assert/strict';
import test from 'node:test';
import { getCodeFencedLines } from '../src/core/codeFence';
import {
  findBrokenLinks,
  findDuplicateHeadings,
  findEmptyHeadings,
  findHeadingLevelSkips,
  findMissingAltText,
  findMissingImages,
} from '../src/core/previewChecksPure';
import { filterExistingTargetChecks } from '../src/core/previewChecksTargetFilter';
import type { PreviewCheck } from '../src/types';

function fenced(markdown: string): Set<number> {
  return getCodeFencedLines(markdown);
}

// --- Empty headings ---

test('detects empty headings', () => {
  const md = '#\n## \n###\ntext';
  const lines = md.split('\n');
  const checks = findEmptyHeadings(lines, fenced(md));
  assert.equal(checks.length, 3);
  assert.equal(checks[0].type, 'empty-heading');
  assert.equal(checks[0].line, 0);
  assert.equal(checks[1].line, 1);
  assert.equal(checks[2].line, 2);
});

test('ignores empty headings inside code blocks', () => {
  const md = ['#', '```', '# also heading', '```', '## real'].join('\n');
  const lines = md.split('\n');
  const checks = findEmptyHeadings(lines, fenced(md));
  assert.equal(checks.length, 1);
  assert.equal(checks[0].line, 0);
});

test('does not flag headings with text', () => {
  const lines = ['# Title', '## Subtitle'].join('\n').split('\n');
  const checks = findEmptyHeadings(lines, fenced(lines.join('\n')));
  assert.equal(checks.length, 0);
});

// --- Heading level skips ---

test('detects heading level skips', () => {
  const md = ['# H1', '### H3'].join('\n');
  const lines = md.split('\n');
  const checks = findHeadingLevelSkips(lines, fenced(md));
  assert.equal(checks.length, 1);
  assert.equal(checks[0].type, 'heading-skip');
  assert.equal(checks[0].line, 1);
  assert.match(checks[0].message, /H1.*H3/);
});

test('allows consecutive heading levels', () => {
  const md = ['# H1', '## H2', '### H3'].join('\n');
  const lines = md.split('\n');
  const checks = findHeadingLevelSkips(lines, fenced(md));
  assert.equal(checks.length, 0);
});

test('allows heading level decrease', () => {
  const md = ['### H3', '## H2', '# H1'].join('\n');
  const lines = md.split('\n');
  const checks = findHeadingLevelSkips(lines, fenced(md));
  assert.equal(checks.length, 0);
});

test('skips code blocks for heading level checks', () => {
  const md = ['# H1', '```', '### H3 in code', '```', '## H2'].join('\n');
  const lines = md.split('\n');
  const checks = findHeadingLevelSkips(lines, fenced(md));
  assert.equal(checks.length, 0);
});

// --- Duplicate headings ---

test('detects duplicate headings', () => {
  const md = ['# Intro', '## Intro'].join('\n');
  const lines = md.split('\n');
  const checks = findDuplicateHeadings(lines, fenced(md));
  assert.equal(checks.length, 2);
  assert.equal(checks[0].type, 'duplicate-heading');
  assert.equal(checks[0].line, 0);
  assert.equal(checks[1].line, 1);
});

test('does not flag unique headings', () => {
  const md = ['# Intro', '## Details', '### Summary'].join('\n');
  const lines = md.split('\n');
  const checks = findDuplicateHeadings(lines, fenced(md));
  assert.equal(checks.length, 0);
});

test('detects three duplicate headings', () => {
  const md = ['# A', '## A', '### A'].join('\n');
  const lines = md.split('\n');
  const checks = findDuplicateHeadings(lines, fenced(md));
  assert.equal(checks.length, 3);
});

test('ignores duplicates inside code blocks', () => {
  const md = ['# Real', '```', '# Fake', '```', '## Real'].join('\n');
  const lines = md.split('\n');
  const checks = findDuplicateHeadings(lines, fenced(md));
  assert.equal(checks.length, 2);
  assert.equal(checks[0].line, 0);
  assert.equal(checks[1].line, 4);
});

// --- Missing alt text ---

test('detects images with empty alt text', () => {
  const md = '![alt](img.png) and ![](no-alt.png)'.split('\n');
  const checks = findMissingAltText(md, fenced(md.join('\n')));
  assert.equal(checks.length, 1);
  assert.equal(checks[0].type, 'missing-alt');
  assert.equal(checks[0].line, 0);
});

test('does not flag images with alt text', () => {
  const md = '![description](image.png)'.split('\n');
  const checks = findMissingAltText(md, fenced(md.join('\n')));
  assert.equal(checks.length, 0);
});

test('ignores images inside code blocks', () => {
  const md = ['![](#)', '```', '![](#)', '```'].join('\n');
  const lines = md.split('\n');
  const checks = findMissingAltText(lines, fenced(md));
  assert.equal(checks.length, 1);
  assert.equal(checks[0].line, 0);
});

// --- Combined scenario ---

test('detects multiple check types in a single document', () => {
  const md = [
    '# H1',
    '### Skip',
    '![](img.png)',
  ].join('\n');
  const lines = md.split('\n');
  const f = fenced(md);

  const empty = findEmptyHeadings(lines, f);
  const skips = findHeadingLevelSkips(lines, f);
  const alts = findMissingAltText(lines, f);

  assert.equal(empty.length, 0);
  assert.equal(skips.length, 1);
  assert.equal(alts.length, 1);
});

// --- Missing images ---

test('flags local image references as missing-image candidates', () => {
  const md = '![photo](./images/photo.png)'.split('\n');
  const checks = findMissingImages(md.join('\n'), fenced(md.join('\n')), 'file:///tmp/docs/');
  assert.equal(checks.length, 1);
  assert.equal(checks[0].type, 'missing-image');
  assert.equal(checks[0].line, 0);
});

test('ignores external image URLs', () => {
  const md = '![photo](https://example.com/photo.png)'.split('\n');
  const checks = findMissingImages(md.join('\n'), fenced(md.join('\n')), 'file:///tmp/docs/');
  assert.equal(checks.length, 0);
});

test('ignores anchor-only references', () => {
  const md = '![photo](#anchor)'.split('\n');
  const checks = findMissingImages(md.join('\n'), fenced(md.join('\n')), 'file:///tmp/docs/');
  assert.equal(checks.length, 0);
});

test('ignores images inside code blocks', () => {
  const md = ['![photo](./missing.png)', '```', '![photo](./also-missing.png)', '```'].join('\n');
  const checks = findMissingImages(md, fenced(md), 'file:///tmp/docs/');
  assert.equal(checks.length, 1);
  assert.equal(checks[0].line, 0);
});

// --- Broken links ---

test('flags local link references as broken-link candidates', () => {
  const md = '[docs](./docs/README.md)'.split('\n');
  const checks = findBrokenLinks(md.join('\n'), fenced(md.join('\n')), 'file:///tmp/docs/');
  assert.equal(checks.length, 1);
  assert.equal(checks[0].type, 'broken-link');
  assert.equal(checks[0].line, 0);
});

test('does not classify image references as broken links', () => {
  const md = '![photo](./missing.png)';
  const checks = findBrokenLinks(md, fenced(md), 'file:///tmp/docs/');
  assert.equal(checks.length, 0);
});

test('ignores external link URLs', () => {
  const md = '[example](https://example.com)'.split('\n');
  const checks = findBrokenLinks(md.join('\n'), fenced(md.join('\n')), 'file:///tmp/docs/');
  assert.equal(checks.length, 0);
});

test('ignores anchor-only links', () => {
  const md = '[section](#section-1)'.split('\n');
  const checks = findBrokenLinks(md.join('\n'), fenced(md.join('\n')), 'file:///tmp/docs/');
  assert.equal(checks.length, 0);
});

test('ignores links inside code blocks', () => {
  const md = ['[link](./missing.md)', '```', '[link](./also-missing.md)', '```'].join('\n');
  const checks = findBrokenLinks(md, fenced(md), 'file:///tmp/docs/');
  assert.equal(checks.length, 1);
  assert.equal(checks[0].line, 0);
});

test('filters target checks with concurrent stat lookups while preserving order', async () => {
  const checks: PreviewCheck[] = [
    { line: 0, type: 'missing-alt', message: 'Missing alt text' },
    { line: 1, type: 'missing-image', message: 'Image exists', targetUri: 'file:///tmp/docs/existing.png' },
    { line: 2, type: 'broken-link', message: 'Link missing', targetUri: 'file:///tmp/docs/missing.md' },
    { line: 3, type: 'missing-image', message: 'Image missing', targetUri: 'file:///tmp/docs/slow-missing.png' },
  ];
  const calls: string[] = [];
  let activeStats = 0;
  let maxActiveStats = 0;

  const result = await filterExistingTargetChecks(checks, async (targetUri) => {
    calls.push(targetUri);
    activeStats += 1;
    maxActiveStats = Math.max(maxActiveStats, activeStats);
    await new Promise((resolve) => setTimeout(resolve, targetUri.includes('existing') ? 30 : 10));
    activeStats -= 1;

    if (targetUri.includes('existing')) {
      return;
    }

    throw new Error('missing');
  });

  assert.deepEqual(calls, [
    'file:///tmp/docs/existing.png',
    'file:///tmp/docs/missing.md',
    'file:///tmp/docs/slow-missing.png',
  ]);
  assert.equal(maxActiveStats, 3);
  assert.deepEqual(result.map((check) => check.line), [0, 2, 3]);
});
