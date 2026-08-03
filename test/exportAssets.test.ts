import assert from 'node:assert/strict';
import test from 'node:test';
import {
  KATEX_CDN_VERSION,
  MERMAID_CDN_VERSION,
  buildExportCsp,
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

test('builds a restrictive export CSP for the generated runtime', () => {
  const csp = buildExportCsp('testnonce');

  assert.match(csp, /default-src 'none'/);
  assert.match(csp, /script-src 'nonce-testnonce' https:\/\/cdn\.jsdelivr\.net/);
  assert.match(csp, /style-src 'unsafe-inline' https:\/\/cdn\.jsdelivr\.net/);
  assert.doesNotMatch(csp, /script-src[^;]*unsafe-inline/);
  assert.match(csp, /object-src 'none'/);
  assert.match(csp, /frame-src 'none'/);
});
