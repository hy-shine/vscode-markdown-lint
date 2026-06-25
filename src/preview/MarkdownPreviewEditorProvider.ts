import * as vscode from 'vscode';
import { MarkdownWorkbenchPanel } from './MarkdownWorkbenchPanel';
import { PREVIEW_EDITOR_VIEW_TYPE } from './constants';

export { PREVIEW_EDITOR_VIEW_TYPE };

export class MarkdownPreviewEditorProvider implements vscode.CustomTextEditorProvider {
  public constructor(private readonly panel: MarkdownWorkbenchPanel) {}

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    token: vscode.CancellationToken,
  ): Promise<void> {
    if (token.isCancellationRequested) {
      return;
    }

    this.panel.attachCustomEditor(
      document,
      webviewPanel,
      document.uri.fragment ? decodeFragment(document.uri.fragment) : undefined,
    );
  }
}

function decodeFragment(fragment: string): string {
  try {
    return decodeURIComponent(fragment);
  } catch {
    return fragment;
  }
}
