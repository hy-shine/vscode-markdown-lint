import assert from 'node:assert/strict';
import test from 'node:test';
import { renderMarkdown } from '../src/core/markdown';

test('renders Mermaid fences with uppercase language names', () => {
  const markdown = '```Mermaid\nflowchart TD\nA-->B\n```';

  const rendered = renderMarkdown(markdown, []);

  assert.match(rendered.html, /<pre><code class="language-mermaid">flowchart TD\nA--&gt;B<\/code><\/pre>/);
});

test('renders Mermaid fences with additional info string metadata', () => {
  const markdown = '```mermaid title="Workflow"\nflowchart TD\nA-->B\n```';

  const rendered = renderMarkdown(markdown, []);

  assert.match(rendered.html, /<pre><code class="language-mermaid">flowchart TD\nA--&gt;B<\/code><\/pre>/);
});

test('resolves local image references without requiring vscode at runtime', () => {
  const markdown = [
    '![Diagram](images/flow-chart.png)',
    '<img src="./assets/raw image.png" alt="Raw">',
  ].join('\n');

  const rendered = renderMarkdown(
    markdown,
    [],
    'file:///Users/jessy/docs/',
    (uri) => `webview:${uri}`,
  );

  assert.match(rendered.html, /src="webview:file:\/\/\/Users\/jessy\/docs\/images\/flow-chart\.png"/);
  assert.match(rendered.html, /src="webview:file:\/\/\/Users\/jessy\/docs\/assets\/raw%20image\.png"/);
});
