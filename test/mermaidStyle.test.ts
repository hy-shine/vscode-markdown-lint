import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const css = readFileSync(path.join(__dirname, '../media/main.css'), 'utf8');

test('sizes only the Mermaid fullscreen diagram SVG, not zoom control icons', () => {
  assert.match(css, /\.mermaid-fullscreen-content\s*>\s*svg\s*\{/);
  assert.doesNotMatch(css, /\.mermaid-fullscreen-content\s+svg\s*\{/);
});

test('keeps the narrow-screen fullscreen close override after the base rule', () => {
  const baseRuleIndex = css.indexOf('.mermaid-fullscreen-close {');
  const narrowRuleIndex = css.indexOf('@media (max-width: 520px)', baseRuleIndex);

  assert.notEqual(baseRuleIndex, -1);
  assert.notEqual(narrowRuleIndex, -1);
  assert.ok(narrowRuleIndex > baseRuleIndex);
});
