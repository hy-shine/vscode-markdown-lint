import * as vscode from 'vscode';
import { PreviewMode, PreviewStyle, ThemeMode } from '../types';
import { normalizePreviewMode } from './previewMode';

const SECTION = 'markdown-lint';

export interface WorkbenchConfig {
  themeMode: ThemeMode;
  previewMode: PreviewMode;
  previewStyle: PreviewStyle;
  showToc: boolean;
}

export function getWorkbenchConfig(): WorkbenchConfig {
  const config = vscode.workspace.getConfiguration(SECTION);

  return {
    themeMode: config.get<ThemeMode>('themeMode', 'auto'),
    previewMode: normalizePreviewMode(config.get<PreviewMode>('previewMode')),
    previewStyle: config.get<PreviewStyle>('previewStyle', 'default'),
    showToc: config.get<boolean>('showToc', true),
  };
}

export async function updateThemeMode(themeMode: ThemeMode): Promise<void> {
  await vscode.workspace.getConfiguration(SECTION).update('themeMode', themeMode, vscode.ConfigurationTarget.Global);
}

export async function updatePreviewMode(previewMode: PreviewMode): Promise<void> {
  await vscode.workspace.getConfiguration(SECTION).update('previewMode', previewMode, vscode.ConfigurationTarget.Global);
}

export async function updatePreviewStyle(previewStyle: PreviewStyle): Promise<void> {
  await vscode.workspace.getConfiguration(SECTION).update('previewStyle', previewStyle, vscode.ConfigurationTarget.Global);
}

export async function updateShowToc(showToc: boolean): Promise<void> {
  await vscode.workspace.getConfiguration(SECTION).update('showToc', showToc, vscode.ConfigurationTarget.Global);
}
