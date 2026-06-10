import assert from 'node:assert/strict';
import test from 'node:test';
import {
  collectLocalImageRootUris,
  getContainingDirectoryUri,
  resolveReference,
} from '../src/core/localPaths';

test('resolves relative paths with spaces, Chinese characters, and parent segments', () => {
  const resolved = resolveReference(
    'file:///Users/jessy/docs/%E9%A1%B9%E7%9B%AE/notes/',
    '../assets/图 1.png',
  );

  assert.deepEqual(resolved, {
    type: 'local',
    uri: 'file:///Users/jessy/docs/%E9%A1%B9%E7%9B%AE/assets/%E5%9B%BE%201.png',
  });
});

test('preserves local file URI fragments separately from the file target', () => {
  const resolved = resolveReference(
    'file:///Users/jessy/docs/notes/',
    'file:///Users/jessy/docs/guide.md#section-2',
  );

  assert.deepEqual(resolved, {
    type: 'local',
    uri: 'file:///Users/jessy/docs/guide.md',
    fragment: 'section-2',
  });
});

test('keeps external and anchor references out of local path handling', () => {
  assert.deepEqual(resolveReference('file:///tmp/docs/', 'https://example.com/a b'), {
    type: 'external',
    href: 'https://example.com/a b',
  });
  assert.deepEqual(resolveReference('file:///tmp/docs/', 'ftp://example.com/file.md'), {
    type: 'external',
    href: 'ftp://example.com/file.md',
  });
  assert.deepEqual(resolveReference('file:///tmp/docs/', 'vscode://file/Users/jessy/docs/readme.md'), {
    type: 'external',
    href: 'vscode://file/Users/jessy/docs/readme.md',
  });
  assert.deepEqual(resolveReference('file:///tmp/docs/', '#local-heading'), {
    type: 'anchor',
    fragment: 'local-heading',
  });
});

test('finds local image roots from Markdown and raw HTML image references', () => {
  const roots = collectLocalImageRootUris(
    [
      '![Chart](../assets/图 1.png)',
      '![Logo](images/logo light.svg "Logo")',
      '<img src="./raw html/图 2.png" alt="Raw">',
      '<img src="https://example.com/remote.png" alt="Remote">',
      '<img src="data:image/png;base64,abc" alt="Inline">',
    ].join('\n'),
    'file:///Users/jessy/docs/%E9%A1%B9%E7%9B%AE/notes/',
  );

  assert.deepEqual(roots, [
    'file:///Users/jessy/docs/%E9%A1%B9%E7%9B%AE/assets/',
    'file:///Users/jessy/docs/%E9%A1%B9%E7%9B%AE/notes/images/',
    'file:///Users/jessy/docs/%E9%A1%B9%E7%9B%AE/notes/raw%20html/',
  ]);
});

test('returns the containing directory for file targets', () => {
  assert.equal(
    getContainingDirectoryUri('file:///Users/jessy/docs/%E9%A1%B9%E7%9B%AE/assets/%E5%9B%BE%201.png'),
    'file:///Users/jessy/docs/%E9%A1%B9%E7%9B%AE/assets/',
  );
});
