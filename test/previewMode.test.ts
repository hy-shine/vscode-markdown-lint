import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_PREVIEW_MODE, normalizePreviewMode, resolvePreviewMode } from '../src/core/previewMode';

test('normalizes valid preview modes', () => {
  assert.equal(normalizePreviewMode('inline'), 'inline');
  assert.equal(normalizePreviewMode('beside'), 'beside');
});

test('falls back to the default preview mode for invalid values', () => {
  assert.equal(DEFAULT_PREVIEW_MODE, 'beside');
  assert.equal(normalizePreviewMode(undefined), DEFAULT_PREVIEW_MODE);
  assert.equal(normalizePreviewMode('unknown'), DEFAULT_PREVIEW_MODE);
});

test('uses command override before the configured preview mode', () => {
  assert.equal(resolvePreviewMode('beside', 'inline'), 'inline');
  assert.equal(resolvePreviewMode('inline', 'beside'), 'beside');
  assert.equal(resolvePreviewMode('inline'), 'inline');
});
