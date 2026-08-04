import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveReference, getContainingDirectoryUri, collectLocalImageRootUris } from '../src/core/localPaths';

test('resolves anchor references', () => {
  const result = resolveReference('file:///docs/', '#section-1');
  assert.deepStrictEqual(result, { type: 'anchor', fragment: 'section-1' });
});

test('resolves external HTTP and HTTPS URLs', () => {
  assert.deepStrictEqual(resolveReference('file:///docs/', 'https://example.com'), {
    type: 'external',
    href: 'https://example.com',
  });
  assert.deepStrictEqual(resolveReference('file:///docs/', 'http://example.com'), {
    type: 'external',
    href: 'http://example.com',
  });
});

test('resolves external FTP URLs', () => {
  const result = resolveReference('file:///docs/', 'ftp://files.example.com/doc.pdf');
  assert.deepStrictEqual(result, { type: 'external', href: 'ftp://files.example.com/doc.pdf' });
});

test('resolves relative file references', () => {
  const result = resolveReference('file:///docs/', './image.png');
  assert.deepStrictEqual(result, { type: 'local', uri: 'file:///docs/image.png' });
});

test('resolves relative directory references', () => {
  const result = resolveReference('file:///docs/', 'images/photo.jpg');
  assert.deepStrictEqual(result, { type: 'local', uri: 'file:///docs/images/photo.jpg' });
});

test('resolves parent directory references', () => {
  const result = resolveReference('file:///docs/subdir/', '../image.png');
  assert.deepStrictEqual(result, { type: 'local', uri: 'file:///docs/image.png' });
});

test('resolves references with fragments', () => {
  const result = resolveReference('file:///docs/', './page.html#top');
  assert.deepStrictEqual(result, { type: 'local', uri: 'file:///docs/page.html', fragment: 'top' });
});

test('resolves absolute file:// URLs', () => {
  const result = resolveReference('file:///docs/', 'file:///other/image.png');
  assert.deepStrictEqual(result, { type: 'local', uri: 'file:///other/image.png' });
});

test('handles empty fragment gracefully', () => {
  const result = resolveReference('file:///docs/', 'page.html#');
  assert.equal(result.type, 'local');
  if (result.type === 'local') {
    assert.equal(result.uri, 'file:///docs/page.html');
    assert.ok(!('fragment' in result) || result.fragment === undefined);
  }
});

test('returns anchor type for fragment-only references without path', () => {
  const result = resolveReference('file:///docs/', '#');
  assert.equal(result.type, 'anchor');
});

test('handles URL-encoded paths', () => {
  const result = resolveReference('file:///docs/', './%E4%B8%AD%E6%96%87%E6%96%87%E4%BB%B6.png');
  assert.deepStrictEqual(result, { type: 'local', uri: 'file:///docs/%E4%B8%AD%E6%96%87%E6%96%87%E4%BB%B6.png' });
});

test('handles paths with spaces', () => {
  const result = resolveReference('file:///docs/', './my%20file.md');
  assert.deepStrictEqual(result, { type: 'local', uri: 'file:///docs/my%20file.md' });
});

test('getContainingDirectoryUri returns parent directory', () => {
  const result = getContainingDirectoryUri('file:///docs/images/photo.jpg');
  assert.equal(result, 'file:///docs/images/');
});

test('getContainingDirectoryUri handles trailing slash', () => {
  const result = getContainingDirectoryUri('file:///docs/images/');
  assert.equal(result, 'file:///docs/images/');
});

test('collectLocalImageRootUris extracts local image roots', () => {
  const markdown = '![Alt](./images/photo.jpg)\n![Other](./icons/icon.png)';
  const result = collectLocalImageRootUris(markdown, 'file:///docs/');
  assert.deepStrictEqual(result.sort(), ['file:///docs/icons/', 'file:///docs/images/']);
});

test('collectLocalImageRootUris ignores external images', () => {
  const markdown = '![External](https://example.com/image.png)';
  const result = collectLocalImageRootUris(markdown, 'file:///docs/');
  assert.deepStrictEqual(result, []);
});

test('collectLocalImageRootUris handles HTML img tags', () => {
  const markdown = '<img src="./images/photo.jpg">';
  const result = collectLocalImageRootUris(markdown, 'file:///docs/');
  assert.deepStrictEqual(result, ['file:///docs/images/']);
});

test('collectLocalImageRootUris deduplicates roots', () => {
  const markdown = '![Alt1](./images/a.jpg)\n![Alt2](./images/b.jpg)';
  const result = collectLocalImageRootUris(markdown, 'file:///docs/');
  assert.deepStrictEqual(result, ['file:///docs/images/']);
});

test('collectLocalImageRootUris handles nested paths', () => {
  const markdown = '![Deep](./a/b/c/deep.png)';
  const result = collectLocalImageRootUris(markdown, 'file:///docs/');
  assert.deepStrictEqual(result, ['file:///docs/a/b/c/']);
});
