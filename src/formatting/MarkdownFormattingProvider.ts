import * as vscode from 'vscode';
import { formatMarkdownDocument } from '../core/formatter';

export class MarkdownFormattingProvider implements vscode.DocumentFormattingEditProvider {
  public async provideDocumentFormattingEdits(document: vscode.TextDocument): Promise<vscode.TextEdit[]> {
    if (document.languageId !== 'markdown') {
      return [];
    }

    const fullRange = new vscode.Range(
      document.positionAt(0),
      document.positionAt(document.getText().length),
    );

    const filePath = document.uri.scheme === 'file' ? document.uri.fsPath : undefined;

    return [vscode.TextEdit.replace(fullRange, await formatMarkdownDocument(document.getText(), filePath))];
  }
}
