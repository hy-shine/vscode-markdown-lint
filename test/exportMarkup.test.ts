import assert from 'node:assert/strict';
import test from 'node:test';
import { convertMermaidCodeBlocksForExport } from '../src/core/exportMarkup';

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

test('preserves escaped Mermaid HTML labels for browser decoding', () => {
  const html = '<pre><code class="language-mermaid">flowchart LR\nA["Line&lt;br&gt;Break"]</code></pre>';

  assert.equal(
    convertMermaidCodeBlocksForExport(html),
    '<div class="mermaid">flowchart LR\nA["Line&lt;br&gt;Break"]</div>',
  );
});
