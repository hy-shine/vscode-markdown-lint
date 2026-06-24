import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const packageJson = JSON.parse(readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
const mainJs = readFileSync(path.join(__dirname, '../media/main.js'), 'utf8');
const panelTs = readFileSync(path.join(__dirname, '../src/preview/MarkdownWorkbenchPanel.ts'), 'utf8');
const configTs = readFileSync(path.join(__dirname, '../src/core/config.ts'), 'utf8');

test('uses System as the configurable automatic theme mode', () => {
  const themeModeConfig = packageJson.contributes.configuration.properties['markdown-lint.themeMode'];

  assert.deepEqual(themeModeConfig.enum, ['system', 'light', 'dark']);
  assert.equal(themeModeConfig.default, 'system');
  assert.match(panelTs, /data-value="system">System<\/button>/);
  assert.doesNotMatch(panelTs, /data-value="auto">Auto<\/button>/);
});

test('maps System mode to the current VS Code light or dark appearance', () => {
  assert.match(mainJs, /themeMode !== 'system'/);
  assert.match(mainJs, /body\.classList\.contains\('vscode-light'\) \? 'light' : 'dark'/);
  assert.doesNotMatch(mainJs, /body\.classList\.add\(`theme-\$\{themeMode\}`\)/);
});

test('normalizes the legacy auto setting to System', () => {
  assert.match(configTs, /normalizeThemeMode\(config\.get<ThemeMode \| 'auto'>\('themeMode', 'system'\)\)/);
  assert.match(configTs, /themeMode === 'light' \|\| themeMode === 'dark' \? themeMode : 'system'/);
});
