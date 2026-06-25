import assert from 'node:assert/strict';
import test from 'node:test';
import { renderMarkdown } from '../src/core/markdown';
import { TocItem } from '../src/types';

// --- Heading tests ---

test('renders basic heading with correct id and source-line', () => {
  const toc: TocItem[] = [{ level: 1, text: 'Hello', line: 0, slug: 'hello' }];
  const result = renderMarkdown('# Hello', toc);
  assert.match(result.html, /<h1 id="hello" data-source-line="0">Hello<\/h1>/);
});

test('renders heading with closing hashes', () => {
  const toc: TocItem[] = [{ level: 2, text: 'Title', line: 0, slug: 'title' }];
  const result = renderMarkdown('## Title ##', toc);
  assert.match(result.html, /<h2 id="title"[^>]*>Title<\/h2>/);
});

// --- Code block tests ---

test('renders code block with language label', () => {
  const result = renderMarkdown('```typescript\nconst x = 1;\n```', []);
  assert.match(result.html, /code-language-label/);
  assert.match(result.html, /TYPESCRIPT/);
  assert.match(result.html, /hljs language-typescript/);
});

test('renders code block without language as TEXT', () => {
  const result = renderMarkdown('```\nconsole.log(1);\n```', []);
  assert.match(result.html, /TEXT/);
});

test('renders mermaid code block with language-mermaid class', () => {
  const result = renderMarkdown('```mermaid\ngraph TD\n```', []);
  assert.match(result.html, /language-mermaid/);
  assert.doesNotMatch(result.html, /hljs/);
});

test('renders uppercase mermaid fence', () => {
  const result = renderMarkdown('```MERMAID\ngraph TD\n```', []);
  assert.match(result.html, /language-mermaid/);
});

test('handles mermaid info-string metadata', () => {
  const result = renderMarkdown('```mermaid theme=dark\ngraph TD\n```', []);
  assert.match(result.html, /language-mermaid/);
});

test('handles language aliases', () => {
  const result = renderMarkdown('```js\nconst x = 1;\n```', []);
  assert.match(result.html, /hljs language-js/);
});

test('renders code block copy button', () => {
  const result = renderMarkdown('```js\nconsole.log(1);\n```', []);
  assert.match(result.html, /code-copy-button/);
  assert.match(result.html, /Copy code/);
});

test('marks long code blocks as foldable', () => {
  const longCode = '```js\n' + 'const x = 1;\n'.repeat(15) + '```';
  const result = renderMarkdown(longCode, []);
  assert.match(result.html, /data-foldable/);
  assert.match(result.html, /code-fold-toggle/);
});

test('does not mark short code blocks as foldable', () => {
  const result = renderMarkdown('```js\nconst x = 1;\n```', []);
  assert.doesNotMatch(result.html, /data-foldable/);
  assert.doesNotMatch(result.html, /code-fold-toggle/);
});

test('wraps highlighted lines in code-line spans', () => {
  const result = renderMarkdown('```js\nconst a = 1;\nconst b = 2;\n```', []);
  assert.match(result.html, /code-line/);
});

test('escapes HTML in code blocks', () => {
  const result = renderMarkdown('```html\n<div>\n```', []);
  assert.doesNotMatch(result.html, /<div>/);
  assert.match(result.html, /&lt;div&gt;/);
});

// --- Shell command annotation ---

test('annotates shell commands in bash code blocks', () => {
  const result = renderMarkdown('```bash\ngit status\n```', []);
  assert.match(result.html, /hljs-command/);
  assert.match(result.html, /git/);
});

test('annotates shell commands in sh code blocks', () => {
  const result = renderMarkdown('```sh\ndocker ps\n```', []);
  assert.match(result.html, /hljs-command/);
  assert.match(result.html, /docker/);
});

test('annotates shell commands in zsh code blocks', () => {
  const result = renderMarkdown('```zsh\nnpm install\n```', []);
  assert.match(result.html, /hljs-command/);
  assert.match(result.html, /npm/);
});

test('does not annotate shell commands in non-shell languages', () => {
  const result = renderMarkdown('```python\ngit = "status"\n```', []);
  assert.doesNotMatch(result.html, /hljs-command/);
});

test('does not annotate shell commands inside inline code', () => {
  const result = renderMarkdown('Use `git status` to check.', []);
  assert.doesNotMatch(result.html, /hljs-command/);
});

// --- Math (KaTeX) tests ---

test('renders KaTeX block math', () => {
  const result = renderMarkdown('$$E = mc^2$$', []);
  assert.match(result.html, /katex/);
  assert.match(result.html, /katex-display/);
});

test('renders KaTeX inline math', () => {
  const result = renderMarkdown('The equation $E = mc^2$ is famous.', []);
  assert.match(result.html, /katex/);
  assert.match(result.html, /E = mc\^2/);
});

test('renders KaTeX with complex symbols', () => {
  const result = renderMarkdown('$$\\int_0^\\infty e^{-x} dx = 1$$', []);
  assert.match(result.html, /katex-display/);
});

test('handles malformed KaTeX gracefully', () => {
  const result = renderMarkdown('$$unclosed math', []);
  assert.ok(result.html.length > 0);
});

test('does not render dollar signs inside inline code', () => {
  const result = renderMarkdown('Use `$100` for display.', []);
  assert.doesNotMatch(result.html, /katex/);
  assert.match(result.html, /\$100/);
});

test('handles escaped dollar signs', () => {
  const result = renderMarkdown('Price is \\$50.', []);
  assert.doesNotMatch(result.html, /katex/);
});

// --- Front matter tests ---

test('strips YAML front matter', () => {
  const md = '---\ntitle: Test\n---\n# Hello';
  const result = renderMarkdown(md, []);
  assert.match(result.html, /Hello/);
  assert.doesNotMatch(result.html, /title/);
});

test('preserves front matter with YAML comments', () => {
  const md = '---\n# This is a comment\n---\nContent';
  const result = renderMarkdown(md, []);
  assert.match(result.html, /Content/);
  assert.doesNotMatch(result.html, /comment/);
});

test('does not strip non-YAML content between --- delimiters', () => {
  const md = '---\nThis is not YAML\n---\nContent';
  const result = renderMarkdown(md, []);
  assert.match(result.html, /This is not YAML/);
  assert.match(result.html, /Content/);
});

test('handles BOM in markdown', () => {
  const md = '\uFEFF# Hello';
  const result = renderMarkdown(md, []);
  assert.match(result.html, /Hello/);
});

// --- Image tests ---

test('renders images with resolved source', () => {
  const resolveImageUri = (uri: string) => `https://resolved.com/${uri}`;
  const result = renderMarkdown('![Alt](image.png)', [], 'file:///docs/', resolveImageUri);
  assert.match(result.html, /resolved\.com/);
  assert.match(result.html, /Alt/);
});

test('renders inline HTML img tags with resolved source', () => {
  const resolveImageUri = (uri: string) => `https://resolved.com/${uri}`;
  const result = renderMarkdown('<img src="./photo.jpg">', [], 'file:///docs/', resolveImageUri);
  assert.match(result.html, /resolved\.com/);
});

test('renders inline HTML img tags with single-quote src', () => {
  const resolveImageUri = (uri: string) => `https://resolved.com/${uri}`;
  const result = renderMarkdown("<img src='./photo.jpg'>", [], 'file:///docs/', resolveImageUri);
  assert.match(result.html, /resolved\.com/);
});

// Note: unquoted src attributes are not standard HTML and are not processed by the renderer

// Note: marked allows inline HTML in headings by default (standard Markdown behavior)
