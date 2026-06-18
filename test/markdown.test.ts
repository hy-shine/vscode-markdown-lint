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

test('renders long code blocks expanded by default with a manual collapse control', () => {
  const code = Array.from({ length: 11 }, (_, index) => `console.log(${index});`).join('\n');
  const markdown = ['```js', code, '```'].join('\n');

  const rendered = renderMarkdown(markdown, []);

  assert.match(rendered.html, /<pre class="code-block" data-foldable data-folded="false">/);
  assert.match(rendered.html, /<button class="code-fold-toggle" aria-expanded="true" aria-label="Collapse code">Collapse<\/button>/);
});

test('highlights curated GitHub-common languages and falls back for long-tail languages', () => {
  const markdown = [
    '```ts',
    'const count: number = 1;',
    '```',
    '',
    '```python',
    'print("hello")',
    '```',
    '',
    '```elixir',
    'IO.puts("hello")',
    '```',
  ].join('\n');

  const rendered = renderMarkdown(markdown, []);

  assert.match(rendered.html, /language-ts/);
  assert.match(rendered.html, /language-python/);
  assert.doesNotMatch(rendered.html, /language-elixir/);
  assert.match(rendered.html, /language-plaintext/);
});

test('labels code blocks with the original fence language', () => {
  const markdown = [
    '```yml',
    'enabled: true',
    '```',
    '',
    '```elixir',
    'IO.puts("hello")',
    '```',
    '',
    '```',
    'plain text',
    '```',
  ].join('\n');

  const rendered = renderMarkdown(markdown, []);

  assert.match(rendered.html, /<span class="code-language-label">YML<\/span>/);
  assert.match(rendered.html, /<span class="code-language-label">ELIXIR<\/span>/);
  assert.match(rendered.html, /<span class="code-language-label">TEXT<\/span>/);
  assert.match(rendered.html, /<code class="hljs language-plaintext"><span class="code-line">IO\.puts/);
});

test('recognizes common configuration language aliases', () => {
  const markdown = [
    '```yml',
    'enabled: true',
    '```',
    '',
    '```toml',
    'enabled = true',
    '```',
    '',
    '```jsonc',
    '{ "enabled": true }',
    '```',
    '',
    '```env',
    'APP_ENV=local',
    '```',
    '',
    '```dotenv',
    'APP_ENV=local',
    '```',
    '',
    '```conf',
    'enabled=true',
    '```',
  ].join('\n');

  const rendered = renderMarkdown(markdown, []);

  for (const language of ['yml', 'toml', 'jsonc', 'env', 'dotenv', 'conf']) {
    assert.match(rendered.html, new RegExp(`language-${language}`));
  }
  assert.doesNotMatch(rendered.html, /language-plaintext/);
});
