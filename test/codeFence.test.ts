import assert from 'node:assert/strict';
import test from 'node:test';
import { getCodeFencedLines } from '../src/core/codeFence';

test('identifies backtick fenced blocks', () => {
  const md = '```js\ncode\n```';
  const fenced = getCodeFencedLines(md);
  assert.deepEqual([...fenced].sort((a, b) => a - b), [0, 1, 2]);
});

test('identifies tilde fenced blocks', () => {
  const md = '~~~\ncode\n~~~';
  const fenced = getCodeFencedLines(md);
  assert.deepEqual([...fenced].sort((a, b) => a - b), [0, 1, 2]);
});

test('does not close fence with different marker', () => {
  const md = '```\ncode\n~~~';
  const fenced = getCodeFencedLines(md);
  assert.deepEqual([...fenced].sort((a, b) => a - b), [0, 1, 2]);
});

test('handles info string on opening fence', () => {
  const md = '```javascript\nconst x = 1;\n```';
  const fenced = getCodeFencedLines(md);
  assert.deepEqual([...fenced].sort((a, b) => a - b), [0, 1, 2]);
});

test('recognizes indented fences up to 3 spaces', () => {
  const md = '   ```\ncode\n   ```';
  const fenced = getCodeFencedLines(md);
  assert.deepEqual([...fenced].sort((a, b) => a - b), [0, 1, 2]);
});

test('rejects fences indented more than 3 spaces', () => {
  const md = '    ```\ncode\n    ```';
  const fenced = getCodeFencedLines(md);
  assert.equal(fenced.size, 0);
});

test('closing fence must be at least as long as opening', () => {
  const md = '~~~~\ncode\n```';
  const fenced = getCodeFencedLines(md);
  assert.deepEqual([...fenced].sort((a, b) => a - b), [0, 1, 2]);
});

test('longer closing fence closes shorter opening', () => {
  const md = '```\ncode\n````';
  const fenced = getCodeFencedLines(md);
  assert.deepEqual([...fenced].sort((a, b) => a - b), [0, 1, 2]);
});

test('marks all lines as fenced when fence is unclosed', () => {
  const md = '```\ncode\ncode';
  const fenced = getCodeFencedLines(md);
  assert.deepEqual([...fenced].sort((a, b) => a - b), [0, 1, 2]);
});

test('returns empty set for markdown without fences', () => {
  const md = 'text\nmore text';
  const fenced = getCodeFencedLines(md);
  assert.equal(fenced.size, 0);
});

test('returns empty set for empty string', () => {
  const fenced = getCodeFencedLines('');
  assert.equal(fenced.size, 0);
});

test('handles multiple fenced blocks', () => {
  const md = ['```', 'code1', '```', '', '~~~', 'code2', '~~~'].join('\n');
  const fenced = getCodeFencedLines(md);
  assert.deepEqual([...fenced].sort((a, b) => a - b), [0, 1, 2, 4, 5, 6]);
});

test('handles CRLF line endings', () => {
  const md = '```\r\ncode\r\n```';
  const fenced = getCodeFencedLines(md);
  assert.deepEqual([...fenced].sort((a, b) => a - b), [0, 1, 2]);
});
