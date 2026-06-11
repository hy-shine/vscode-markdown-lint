import assert from 'node:assert/strict';
import test from 'node:test';
import { escapeAttribute, escapeHtml } from '../src/core/htmlUtils';

test('escapes ampersands, angle brackets', () => {
  assert.equal(escapeHtml('a & b < c > d'), 'a &amp; b &lt; c &gt; d');
});

test('escapes double quotes in attributes', () => {
  assert.equal(escapeAttribute('a "b" c'), 'a &quot;b&quot; c');
});

test('escapesHtml does not escape quotes', () => {
  assert.equal(escapeHtml('a "b" c'), 'a "b" c');
});

test('handles empty string', () => {
  assert.equal(escapeHtml(''), '');
  assert.equal(escapeAttribute(''), '');
});

test('escapes mixed HTML entities', () => {
  assert.equal(escapeAttribute('<script>alert("xss")</script>'),
    '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
});
