import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { formatMarkdownDocument } from '../src/core/formatter';

test('preserves prose wrapping by default', async () => {
  const paragraph = 'This paragraph should stay on one line when no project Prettier config overrides the extension default proseWrap behavior.';
  const input = ['# Title', '', paragraph].join('\n');

  const formatted = await formatMarkdownDocument(input);

  assert.match(formatted, new RegExp(paragraph));
});

test('respects project Prettier config when a file path is provided', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'mdlint-format-'));

  try {
    const filePath = path.join(dir, 'doc.md');
    await writeFile(
      path.join(dir, '.prettierrc'),
      JSON.stringify({ proseWrap: 'always', printWidth: 30 }),
    );

    const paragraph = 'This paragraph should wrap into multiple short lines when project configuration is loaded.';
    const input = ['# Title', '', paragraph].join('\n');

    const formatted = await formatMarkdownDocument(input, filePath);
    const bodyLines = formatted.trim().split('\n').slice(2);

    assert.ok(bodyLines.length > 1, formatted);
    assert.ok(bodyLines.every((line) => line.length <= 30), formatted);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
