import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildMermaidExportRuntime,
  convertMermaidCodeBlocksForExport,
  htmlContainsClass,
  stripPreviewOnlyCodeControlsForExport,
} from '../src/core/exportMarkup';

test('converts Mermaid code blocks into export render containers', () => {
  const html = '<pre><code class="language-mermaid">flowchart LR\nA --&gt; B</code></pre>';

  assert.equal(
    convertMermaidCodeBlocksForExport(html),
    '<div class="mermaid">flowchart LR\nA --&gt; B</div>',
  );
});

test('keeps non-Mermaid code blocks unchanged', () => {
  const html = '<pre><button>Copy</button><code class="hljs language-ts">const x = 1;</code></pre>';

  assert.equal(convertMermaidCodeBlocksForExport(html), html);
});

test('strips preview-only code controls from exported HTML', () => {
  const html = [
    '<pre class="code-block" data-foldable data-folded="false">',
    '<span class="code-language-label">JS</span>',
    '<button class="code-copy-button" data-code="console.log(1)" aria-label="Copy code">Copy</button>',
    '<button class="code-fold-toggle" aria-expanded="true" aria-label="Collapse code">Collapse</button>',
    '<code class="hljs language-js"><span class="code-line">console.log(1)</span></code>',
    '</pre>',
  ].join('');

  assert.equal(
    stripPreviewOnlyCodeControlsForExport(html),
    [
      '<pre class="code-block">',
      '<span class="code-language-label">JS</span>',
      '<code class="hljs language-js"><span class="code-line">console.log(1)</span></code>',
      '</pre>',
    ].join(''),
  );
});

test('preserves escaped Mermaid HTML labels for browser decoding', () => {
  const html = '<pre><code class="language-mermaid">flowchart LR\nA["Line&lt;br&gt;Break"]</code></pre>';

  assert.equal(
    convertMermaidCodeBlocksForExport(html),
    '<div class="mermaid">flowchart LR\nA["Line&lt;br&gt;Break"]</div>',
  );
});

test('detects exact class names in exported HTML fragments', () => {
  assert.equal(htmlContainsClass('<span class="katex-display katex">x</span>', 'katex'), true);
  assert.equal(htmlContainsClass("<div class='preview-content mermaid'>graph TD</div>", 'mermaid'), true);
  assert.equal(htmlContainsClass('<code class="language-mermaid">graph TD</code>', 'mermaid'), false);
  assert.equal(htmlContainsClass('<span data-class="katex">x</span>', 'katex'), false);
});

test('builds Mermaid export runtime with quiet per-diagram failures', () => {
  const runtime = buildMermaidExportRuntime('dark');

  assert.match(runtime, /try/);
  assert.match(runtime, /catch/);
  assert.match(runtime, /querySelectorAll\('\.mermaid'\)/);
  assert.match(runtime, /mermaid-error/);
  assert.match(runtime, /Mermaid diagram unavailable/);
  assert.match(runtime, /securityLevel: 'antiscript'/);
  assert.match(runtime, /theme: 'dark'/);
});
