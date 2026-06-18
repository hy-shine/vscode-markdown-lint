import assert from 'node:assert/strict';
import test from 'node:test';
import { inlineLocalImagesAsBase64 } from '../src/core/exportPure';

/**
 * Build a fake filesystem and readFile that resolves `file://` URIs against it.
 * Each call is recorded so tests can assert dedup behaviour.
 */
function mockFilesystem(files: Record<string, Uint8Array>) {
  const reads: string[] = [];
  const readFile = async (uri: string): Promise<Uint8Array> => {
    const key = new URL(uri).pathname;
    reads.push(key);
    const data = files[key];
    if (!data) {
      throw new Error(`not found: ${key}`);
    }
    return data;
  };
  return { readFile, reads };
}

const PNG_MAGIC = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

test('inlines a single local image as base64 data URI', async () => {
  const { readFile } = mockFilesystem({ '/img/a.png': PNG_MAGIC });

  const result = await inlineLocalImagesAsBase64(
    '<img src="file:///img/a.png" alt="a">',
    readFile,
  );

  assert.match(result, /src="data:image\/png;base64,/);
  assert.match(result, /alt="a">$/);
  assert.doesNotMatch(result, /file:\/\//);
});

test('inlines multiple distinct images independently', async () => {
  const { readFile } = mockFilesystem({
    '/img/a.png': PNG_MAGIC,
    '/img/b.png': new Uint8Array([0x01, 0x02]),
  });

  const result = await inlineLocalImagesAsBase64(
    '<p><img src="file:///img/a.png" alt="a"></p><p><img src="file:///img/b.png" alt="b"></p>',
    readFile,
  );

  const matches = result.match(/data:image\/png;base64,[^"]+/g);
  assert.equal(matches?.length, 2, 'both images replaced with distinct data URIs');
  assert.notEqual(matches![0], matches![1]);
});

test('reads each unique full tag only once even when referenced multiple times', async () => {
  // Dedup is keyed on the complete <img> tag (match[0]), so two tags that are
  // byte-for-byte identical collapse to a single readFile call.
  const { readFile, reads } = mockFilesystem({ '/img/a.png': PNG_MAGIC });

  const tag = '<img src="file:///img/a.png" alt="a">';
  const result = await inlineLocalImagesAsBase64(tag + tag, readFile);

  assert.equal(reads.length, 1, 'deduplicates identical full tags');
  const matches = result.match(/data:image\/png;base64,[^"]+/g);
  assert.equal(matches?.length, 2, 'both occurrences rewritten');
});

test('reads the file once per distinct full tag even when src is shared', async () => {
  // Two tags that share a src but differ in other attributes (here: alt) are
  // distinct keys, so readFile is called for each. This documents the dedup
  // boundary rather than asserting it away.
  const { readFile, reads } = mockFilesystem({ '/img/a.png': PNG_MAGIC });

  const html = '<img src="file:///img/a.png" alt="one"><img src="file:///img/a.png" alt="two">';
  const result = await inlineLocalImagesAsBase64(html, readFile);

  assert.equal(reads.length, 2, 'distinct tags are not deduplicated');
  const matches = result.match(/data:image\/png;base64,[^"]+/g);
  assert.equal(matches?.length, 2, 'both occurrences rewritten');
});

test('does not corrupt one img tag that is a substring of another', async () => {
  // The first tag is a verbatim prefix substring of the second (longer alt).
  // The old replaceAll-based implementation would have matched the short tag
  // inside the long one and corrupted it.
  const { readFile } = mockFilesystem({
    '/img/short.png': PNG_MAGIC,
    '/img/long.png': new Uint8Array([0xff]),
  });

  const html = '<img src="file:///img/short.png" alt="x"><img src="file:///img/long.png" alt="x with suffix">';
  const result = await inlineLocalImagesAsBase64(html, readFile);

  assert.match(result, /src="data:image\/png;base64,[^"]+" alt="x">/);
  assert.match(result, /src="data:image\/png;base64,[^"]+" alt="x with suffix">/);
});

test('preserves $ characters in alt/title without treating them as replacement patterns', async () => {
  const { readFile } = mockFilesystem({ '/img/a.png': PNG_MAGIC });

  const result = await inlineLocalImagesAsBase64(
    '<img src="file:///img/a.png" alt="cost $5 $&amp; $1" title="$`special">',
    readFile,
  );

  assert.match(result, /alt="cost \$5 \$&amp; \$1"/);
  assert.match(result, /title="\$`special"/);
});

test('leaves non-file:// image sources untouched', async () => {
  const { readFile, reads } = mockFilesystem({});

  const html = [
    '<img src="https://example.com/a.png" alt="remote">',
    '<img src="data:image/png;base64,iVBORw0KGgo=" alt="already-inline">',
  ].join('');

  const result = await inlineLocalImagesAsBase64(html, readFile);

  assert.equal(result, html, 'remote and data: URIs are returned verbatim');
  assert.equal(reads.length, 0, 'no filesystem reads attempted');
});

test('keeps the original tag when readFile rejects', async () => {
  const { readFile } = mockFilesystem({ '/img/ok.png': PNG_MAGIC });

  const html = [
    '<img src="file:///img/missing.png" alt="missing">',
    '<img src="file:///img/ok.png" alt="ok">',
  ].join('');

  const result = await inlineLocalImagesAsBase64(html, readFile);

  assert.match(result, /src="file:\/\/\/img\/missing\.png" alt="missing"/);
  assert.match(result, /src="data:image\/png;base64,[^"]+" alt="ok"/);
});

test('returns the same string reference when there are no local images to inline', async () => {
  const { readFile } = mockFilesystem({});

  const html = '<img src="https://example.com/a.png" alt="remote">';
  const result = await inlineLocalImagesAsBase64(html, readFile);

  assert.equal(result, html);
});

test('derives correct MIME type from each supported extension', async () => {
  const files: Record<string, Uint8Array> = {
    '/img/a.png': PNG_MAGIC,
    '/img/b.jpg': new Uint8Array([0xff, 0xd8, 0xff]),
    '/img/c.jpeg': new Uint8Array([0xff, 0xd8, 0xff]),
    '/img/d.gif': new Uint8Array([0x47, 0x49, 0x46]),
    '/img/e.webp': new Uint8Array([0x52, 0x49, 0x46]),
    '/img/f.svg': new Uint8Array([0x3c]),
    '/img/g.bin': new Uint8Array([0x00]),
  };
  const { readFile } = mockFilesystem(files);

  const html = [
    '<img src="file:///img/a.png" alt="a">',
    '<img src="file:///img/b.jpg" alt="b">',
    '<img src="file:///img/c.jpeg" alt="c">',
    '<img src="file:///img/d.gif" alt="d">',
    '<img src="file:///img/e.webp" alt="e">',
    '<img src="file:///img/f.svg" alt="f">',
    '<img src="file:///img/g.bin" alt="g">',
  ].join('');

  const result = await inlineLocalImagesAsBase64(html, readFile);

  assert.match(result, /data:image\/png;base64,/);
  assert.match(result, /data:image\/jpeg;base64,/);
  assert.match(result, /data:image\/gif;base64,/);
  assert.match(result, /data:image\/webp;base64,/);
  assert.match(result, /data:image\/svg\+xml;base64,/);
  assert.match(result, /data:application\/octet-stream;base64,/);
});
