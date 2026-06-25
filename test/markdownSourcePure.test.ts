import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseMarkdownSource, readDiskMarkdown } from '../src/core/markdownSourcePure';

test('dirty document uses the editor buffer even when disk differs', () => {
  const result = chooseMarkdownSource(true, 'buffer-content', 'disk-content');
  assert.equal(result, 'buffer-content');
});

test('clean document prefers disk content over stale buffer', () => {
  const result = chooseMarkdownSource(false, 'stale-buffer', 'disk-content');
  assert.equal(result, 'disk-content');
});

test('clean document falls back to buffer when disk read is unavailable', () => {
  const result = chooseMarkdownSource(false, 'buffer-content', undefined);
  assert.equal(result, 'buffer-content');
});

test('readDiskMarkdown decodes disk bytes as UTF-8 for a clean document', async () => {
  const bytes = new TextEncoder().encode('disk-content');
  const result = await readDiskMarkdown(false, async () => bytes);
  assert.equal(result, 'disk-content');
});

test('readDiskMarkdown skips the disk read for a dirty document', async () => {
  let called = false;
  const result = await readDiskMarkdown(true, async () => {
    called = true;
    return new Uint8Array();
  });
  assert.equal(result, undefined);
  assert.equal(called, false);
});

test('readDiskMarkdown returns undefined when the disk read throws', async () => {
  const result = await readDiskMarkdown(false, async () => {
    throw new Error('ENOENT');
  });
  assert.equal(result, undefined);
});
