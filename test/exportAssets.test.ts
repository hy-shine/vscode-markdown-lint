import assert from 'node:assert/strict';
import test from 'node:test';
import {
  KATEX_CDN_VERSION,
  MERMAID_CDN_VERSION,
  buildKatexStylesheetTag,
  buildMermaidScriptTag,
} from '../src/core/exportAssets';

test('uses explicit CDN versions for exported assets', () => {
  assert.equal(KATEX_CDN_VERSION, '0.16.45');
  assert.equal(MERMAID_CDN_VERSION, '11.15.0');
});

test('builds pinned KaTeX stylesheet tag', () => {
  assert.equal(
    buildKatexStylesheetTag(),
    '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.45/dist/katex.min.css">',
  );
});

test('builds pinned Mermaid script tag', () => {
  assert.equal(
    buildMermaidScriptTag(),
    '  <script src="https://cdn.jsdelivr.net/npm/mermaid@11.15.0/dist/mermaid.min.js"></script>',
  );
});
