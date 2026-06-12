import * as vscode from 'vscode';
import { exportHtml } from './core/export';
import { MarkdownFormattingProvider } from './formatting/MarkdownFormattingProvider';
import { MarkdownWorkbenchPanel } from './preview/MarkdownWorkbenchPanel';
import { PreviewMode } from './types';

export function activate(context: vscode.ExtensionContext): void {
  try {
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('markdown-preview-lite');
    const panel = new MarkdownWorkbenchPanel(context, diagnosticCollection);
    const formattingProvider = new MarkdownFormattingProvider();
    const updateDebounces = new Map<string, NodeJS.Timeout>();
    const revealPreview = async (modeOverride?: PreviewMode): Promise<void> => {
      const didReveal = await panel.revealActive(modeOverride);
      if (!didReveal) {
        void vscode.window.showInformationMessage('Open a Markdown file to use Markdown Preview Lite.');
      }
    };

    context.subscriptions.push(
      diagnosticCollection,
      panel,
      vscode.languages.registerDocumentFormattingEditProvider({ language: 'markdown' }, formattingProvider),
      vscode.commands.registerCommand('markdown-lint.openPreview', async () => {
        await revealPreview();
      }),
      vscode.commands.registerCommand('markdown-lint.openPreviewInline', async () => {
        await revealPreview('inline');
      }),
      vscode.commands.registerCommand('markdown-lint.openPreviewToSide', async () => {
        await revealPreview('beside');
      }),
      vscode.commands.registerCommand('markdown-lint.formatDocument', async () => {
        await panel.formatActiveDocument();
      }),
      vscode.commands.registerCommand('markdown-lint.refreshToc', async () => {
        await panel.update(vscode.window.activeTextEditor);
      }),
      vscode.commands.registerCommand('markdown-lint.exportHtml', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document.languageId !== 'markdown') {
          void vscode.window.showInformationMessage('Open a Markdown file to export.');
          return;
        }
        await exportHtml(editor.document.uri, context);
      }),
      vscode.window.onDidChangeActiveTextEditor(async (editor: vscode.TextEditor | undefined) => {
        await panel.update(editor);
      }),
      vscode.workspace.onDidChangeTextDocument((event: vscode.TextDocumentChangeEvent) => {
        if (event.document.languageId !== 'markdown') {
          return;
        }

        const key = event.document.uri.toString();
        const existing = updateDebounces.get(key);
        if (existing) {
          clearTimeout(existing);
        }
        const timer = setTimeout(() => {
          updateDebounces.delete(key);
          void panel.updateDocument(event.document);
        }, 300);
        updateDebounces.set(key, timer);
      }),
      vscode.workspace.onDidChangeConfiguration(async (event: vscode.ConfigurationChangeEvent) => {
        if (!event.affectsConfiguration('markdown-lint')) {
          return;
        }

        await panel.updateAll();
      }),
      vscode.window.onDidChangeTextEditorVisibleRanges((event: vscode.TextEditorVisibleRangesChangeEvent) => {
        if (event.textEditor.document.languageId !== 'markdown') {
          return;
        }

        if (panel.isSyncingFromPreview(event.textEditor.document)) {
          return;
        }

        panel.notifyResize();

        const ranges = event.visibleRanges;
        if (ranges.length === 0) {
          return;
        }

        const topLine = ranges[0].start.line;
        panel.postVisibleLineRange(event.textEditor.document, topLine);
      }),
    );

  } catch (err) {
    console.error('[markdown-lint] activate error:', err);
    throw err;
  }
}

export function deactivate(): void {}
