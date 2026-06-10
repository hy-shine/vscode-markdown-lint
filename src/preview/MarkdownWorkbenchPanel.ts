import * as vscode from 'vscode';
import { exportHtml } from '../core/export';
import { getWorkbenchConfig, updatePreviewStyle, updateShowToc, updateThemeMode } from '../core/config';
import { formatMarkdownDocument } from '../core/formatter';
import { collectLocalImageRootUris } from '../core/localPaths';
import { renderMarkdown } from '../core/markdown';
import { extractToc } from '../core/toc';
import { PreviewState, PreviewStyle, ThemeMode } from '../types';

interface PreviewEntry {
  panel: vscode.WebviewPanel;
  sourceUri: vscode.Uri;
  isScrollingFromPreview: boolean;
  isResizing: boolean;
  resizeTimer?: ReturnType<typeof setTimeout>;
  scrollSyncTimer?: ReturnType<typeof setTimeout>;
}

export class MarkdownWorkbenchPanel implements vscode.Disposable {
  private readonly previews = new Map<string, PreviewEntry>();
  private activeSourceUri: vscode.Uri | undefined;
  private readonly disposables: vscode.Disposable[] = [];

  constructor(private readonly context: vscode.ExtensionContext) {}

  public reveal(editor: vscode.TextEditor): void {
    if (editor.document.languageId !== 'markdown') {
      return;
    }

    void this.openOrRevealPreview(editor.document.uri, undefined, editor.document);
  }

  public async update(editor: vscode.TextEditor | undefined): Promise<void> {
    if (editor?.document.languageId === 'markdown') {
      const entry = this.getEntry(editor.document.uri);
      if (entry) {
        await this.updateEntry(entry, editor.document);
      }
      return;
    }

    const entry = this.activeSourceUri ? this.getEntry(this.activeSourceUri) : undefined;
    if (entry) {
      await this.updateEntry(entry);
    }
  }

  public async updateDocument(document: vscode.TextDocument): Promise<void> {
    if (!isPreviewableMarkdown(document)) {
      return;
    }

    const entry = this.getEntry(document.uri);
    if (entry) {
      await this.updateEntry(entry, document);
    }
  }

  public async updateAll(): Promise<void> {
    await Promise.all(Array.from(this.previews.values()).map((entry) => this.updateEntry(entry)));
  }

  public postVisibleLineRange(document: vscode.TextDocument, line: number): void {
    const entry = this.getEntry(document.uri);
    if (!entry || entry.isResizing) {
      return;
    }

    if (entry.scrollSyncTimer) {
      clearTimeout(entry.scrollSyncTimer);
    }
    entry.scrollSyncTimer = setTimeout(() => {
      if (!entry.isResizing) {
        void entry.panel.webview.postMessage({ type: 'scrollToLine', value: line });
      }
    }, 50);
  }

  public notifyResize(): void {
    for (const entry of this.previews.values()) {
      this.notifyResizeEntry(entry);
    }
  }

  public async formatActiveDocument(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (editor?.document.languageId === 'markdown') {
      await this.formatDocument(editor.document);
      return;
    }

    const entry = this.activeSourceUri ? this.getEntry(this.activeSourceUri) : undefined;
    if (!entry) {
      return;
    }

    const document = await vscode.workspace.openTextDocument(entry.sourceUri);
    await this.formatDocument(document);
  }

  public dispose(): void {
    while (this.disposables.length > 0) {
      this.disposables.pop()?.dispose();
    }

    for (const entry of this.previews.values()) {
      entry.panel.dispose();
    }
    this.previews.clear();
  }

  public isSyncingFromPreview(document?: vscode.TextDocument): boolean {
    if (document) {
      return this.getEntry(document.uri)?.isScrollingFromPreview ?? false;
    }

    return Array.from(this.previews.values()).some((entry) => entry.isScrollingFromPreview);
  }

  private async openOrRevealPreview(
    sourceUri: vscode.Uri,
    fragment?: string,
    knownDocument?: vscode.TextDocument,
  ): Promise<void> {
    const document = knownDocument ?? await vscode.workspace.openTextDocument(sourceUri);
    if (!isPreviewableMarkdown(document)) {
      return;
    }

    const entry = this.getOrCreateEntry(document.uri);
    this.activeSourceUri = document.uri;
    entry.panel.title = document.fileName.split(/[\\/]/).pop() ?? 'Untitled';
    entry.panel.reveal(vscode.ViewColumn.Beside);

    await this.updateEntry(entry, document);

    if (fragment) {
      await entry.panel.webview.postMessage({ type: 'scrollToAnchor', value: decodeFragment(fragment) });
    }
  }

  private getOrCreateEntry(sourceUri: vscode.Uri): PreviewEntry {
    const existing = this.getEntry(sourceUri);
    if (existing) {
      return existing;
    }

    return this.createEntry(sourceUri);
  }

  private getEntry(sourceUri: vscode.Uri): PreviewEntry | undefined {
    return this.previews.get(getPreviewKey(sourceUri));
  }

  private createEntry(sourceUri: vscode.Uri): PreviewEntry {
    const panel = vscode.window.createWebviewPanel(
      'markdown-lint.preview',
      sourceUri.fsPath.split(/[\\/]/).pop() ?? 'Markdown Preview Lite',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.joinPath(this.context.extensionUri, 'media'),
          vscode.Uri.joinPath(this.context.extensionUri, 'node_modules', 'katex', 'dist'),
          vscode.Uri.joinPath(this.context.extensionUri, 'node_modules', 'mermaid', 'dist'),
        ],
        retainContextWhenHidden: true,
      },
    );

    const entry: PreviewEntry = {
      panel,
      sourceUri,
      isScrollingFromPreview: false,
      isResizing: false,
    };

    panel.iconPath = {
      light: vscode.Uri.joinPath(this.context.extensionUri, 'images', 'open-preview.svg'),
      dark: vscode.Uri.joinPath(this.context.extensionUri, 'images', 'open-preview-dark.svg')
    };

    this.previews.set(getPreviewKey(sourceUri), entry);

    panel.onDidDispose(() => {
      this.previews.delete(getPreviewKey(entry.sourceUri));
      if (this.activeSourceUri?.toString() === entry.sourceUri.toString()) {
        this.activeSourceUri = this.previews.values().next().value?.sourceUri;
      }
    }, null, this.disposables);

    panel.webview.onDidReceiveMessage(async (message: WebviewMessage) => {
      await this.handleMessage(entry, message);
    }, null, this.disposables);

    panel.onDidChangeViewState(() => {
      this.notifyResizeEntry(entry);
    }, null, this.disposables);

    panel.webview.html = this.getHtml(panel.webview);

    return entry;
  }

  private async updateEntry(entry: PreviewEntry, document?: vscode.TextDocument): Promise<void> {
    const resolvedDocument = document ?? await vscode.workspace.openTextDocument(entry.sourceUri);
    if (!isPreviewableMarkdown(resolvedDocument)) {
      return;
    }

    entry.sourceUri = resolvedDocument.uri;
    const markdown = resolvedDocument.getText();
    const toc = extractToc(markdown);
    const baseUri = vscode.Uri.joinPath(resolvedDocument.uri, '..');
    const localResourceRoots = [
      vscode.Uri.joinPath(this.context.extensionUri, 'media'),
      vscode.Uri.joinPath(this.context.extensionUri, 'node_modules', 'katex', 'dist'),
      vscode.Uri.joinPath(this.context.extensionUri, 'node_modules', 'mermaid', 'dist'),
      baseUri,
    ];
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(resolvedDocument.uri);
    if (workspaceFolder) {
      localResourceRoots.push(workspaceFolder.uri);
    }
    localResourceRoots.push(...collectLocalImageRootUris(markdown, baseUri.toString()).map((uri) => vscode.Uri.parse(uri)));

    entry.panel.webview.options = {
      enableScripts: true,
      localResourceRoots,
    };
    const rendered = renderMarkdown(
      markdown,
      toc,
      baseUri,
      (uri) => entry.panel.webview.asWebviewUri(uri),
    );
    const config = getWorkbenchConfig();

    const state: PreviewState = {
      title: resolvedDocument.fileName.split(/[\\/]/).pop() ?? 'Untitled.md',
      html: rendered.html,
      rawText: markdown,
      toc,
      themeMode: config.themeMode,
      previewStyle: config.previewStyle,
      tocVisible: config.showToc,
      baseUrl: entry.panel.webview.asWebviewUri(baseUri).toString() + '/',
    };

    await entry.panel.webview.postMessage({ type: 'render', payload: state });
  }

  private notifyResizeEntry(entry: PreviewEntry): void {
    entry.isResizing = true;
    if (entry.resizeTimer) {
      clearTimeout(entry.resizeTimer);
    }
    entry.resizeTimer = setTimeout(() => {
      entry.isResizing = false;
    }, 300);
  }

  private async formatDocument(document: vscode.TextDocument): Promise<void> {
    if (document.languageId !== 'markdown') {
      return;
    }

    const editor = await this.resolveEditor(document);
    const filePath = document.uri.scheme === 'file' ? document.uri.fsPath : undefined;
    const formatted = await formatMarkdownDocument(document.getText(), filePath);
    const fullRange = new vscode.Range(
      document.positionAt(0),
      document.positionAt(document.getText().length),
    );

    await editor.edit((editBuilder: vscode.TextEditorEdit) => {
      editBuilder.replace(fullRange, formatted);
    });

    await this.updateDocument(document);
  }

  private async handleMessage(entry: PreviewEntry, message: WebviewMessage): Promise<void> {
    switch (message.type) {
      case 'setThemeMode':
        await updateThemeMode(message.value);
        await this.updateAll();
        return;
      case 'setPreviewStyle':
        await updatePreviewStyle(message.value);
        await this.updateAll();
        return;
      case 'toggleToc':
        await updateShowToc(message.value);
        await this.updateAll();
        return;
      case 'revealLine': {
        const editor = vscode.window.visibleTextEditors.find(
          (e) => e.document.uri.toString() === entry.sourceUri.toString(),
        );
        if (!editor) {
          return;
        }
        const position = new vscode.Position(message.value, 0);
        editor.selection = new vscode.Selection(position, position);
        editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
        return;
      }
      case 'scrollToLine': {
        const editor = vscode.window.visibleTextEditors.find(
          (e) => e.document.uri.toString() === entry.sourceUri.toString(),
        );
        if (!editor) {
          return;
        }
        const line = Math.min(message.value, editor.document.lineCount - 1);
        const position = new vscode.Position(line, 0);
        editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.Default);
        return;
      }
      case 'syncEditorScroll': {
        const editor = vscode.window.visibleTextEditors.find(
          (e) => e.document.uri.toString() === entry.sourceUri.toString(),
        );
        if (!editor) {
          return;
        }
        entry.isScrollingFromPreview = true;
        const line = Math.min(message.value, editor.document.lineCount - 1);
        const position = new vscode.Position(line, 0);
        editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
        setTimeout(() => { entry.isScrollingFromPreview = false; }, 150);
        return;
      }
      case 'formatDocument': {
        const document = await vscode.workspace.openTextDocument(entry.sourceUri);
        await this.formatDocument(document);
        return;
      }
      case 'refreshPreview':
        await this.updateEntry(entry);
        return;
      case 'exportHtml':
        await exportHtml(entry.sourceUri, this.context);
        return;
      case 'openLink':
        await this.openLink(entry, message.value);
        return;
      default:
        return;
    }
  }

  private async openLink(entry: PreviewEntry, href: string): Promise<void> {
    if (/^https?:/i.test(href)) {
      await vscode.env.openExternal(vscode.Uri.parse(href));
      return;
    }

    if (/^mailto:/i.test(href)) {
      await vscode.env.openExternal(vscode.Uri.parse(href));
      return;
    }

    if (/^file:/i.test(href)) {
      await this.openFileUriLink(href);
      return;
    }

    const { path, fragment } = splitLinkTarget(href);
    if (!path) {
      return;
    }

    const baseUri = vscode.Uri.joinPath(entry.sourceUri, '..');
    const linkUri = resolveLinkedUri(baseUri, decodeLinkPath(path));
    try {
      await vscode.workspace.fs.stat(linkUri);
    } catch {
      void vscode.window.showWarningMessage(`Linked file not found: ${href}`);
      return;
    }

    try {
      const doc = await vscode.workspace.openTextDocument(linkUri);
      if (isPreviewableMarkdown(doc)) {
        await this.openOrRevealPreview(doc.uri, fragment, doc);
      } else {
        await this.openNonMarkdownDocument(doc);
      }
    } catch {
      await vscode.env.openExternal(linkUri);
    }
  }

  private async openFileUriLink(href: string): Promise<void> {
    const uri = vscode.Uri.parse(href);
    const fragment = uri.fragment || undefined;
    const targetUri = uri.with({ fragment: '' });

    try {
      const doc = await vscode.workspace.openTextDocument(targetUri);
      if (isPreviewableMarkdown(doc)) {
        await this.openOrRevealPreview(doc.uri, fragment, doc);
      } else {
        await this.openNonMarkdownDocument(doc);
      }
    } catch {
      await vscode.env.openExternal(uri);
    }
  }

  private async openNonMarkdownDocument(document: vscode.TextDocument): Promise<void> {
    await vscode.window.showTextDocument(document, {
      preview: false,
      preserveFocus: false,
    });
  }

  private async resolveEditor(document: vscode.TextDocument): Promise<vscode.TextEditor> {
    const existingEditor = vscode.window.visibleTextEditors.find(
      (editor) => editor.document.uri.toString() === document.uri.toString(),
    );

    if (existingEditor) {
      return existingEditor;
    }

    return vscode.window.showTextDocument(document, { preserveFocus: true, preview: false });
  }

  private getHtml(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'main.js'));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'main.css'));
    const katexStyleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'node_modules', 'katex', 'dist', 'katex.min.css'),
    );
    const mermaidUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'node_modules', 'mermaid', 'dist', 'mermaid.min.js'),
    );
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline' https://cdn.jsdelivr.net; font-src ${webview.cspSource}; img-src ${webview.cspSource} data: https:; script-src 'nonce-${nonce}' ${webview.cspSource} https://cdn.jsdelivr.net; connect-src https://cdn.jsdelivr.net;">
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link href="${styleUri}" rel="stylesheet" />
    <link href="${katexStyleUri}" rel="stylesheet" />
    <title>Markdown Preview Lite</title>
  </head>
  <body>
    <div class="outline-control" id="outline-control">
      <button class="outline-trigger" id="outline-trigger" type="button" aria-label="TOC" title="TOC">&#9776;</button>
      <div class="outline-panel" id="outline-panel">
        <div class="outline-panel-title">TOC</div>
        <nav id="toc-list" class="toc-list"></nav>
      </div>
    </div>
    <div class="floating-controls" id="floating-controls">
      <button class="floating-refresh" id="floating-refresh" type="button" aria-label="Refresh preview" title="Refresh preview">↻</button>
      <button class="floating-trigger" id="floating-trigger" type="button" aria-label="Preview settings" title="Preview settings" aria-expanded="false">
        <span class="floating-trigger-ring"></span>
        <span class="floating-trigger-icon" aria-hidden="true">
          <svg viewBox="0 0 20 20" fill="none" focusable="false">
            <path d="M4 5.25h12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
            <path d="M4 10h12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
            <path d="M4 14.75h12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
            <circle cx="7" cy="5.25" r="1.9" fill="currentColor"/>
            <circle cx="13" cy="10" r="1.9" fill="currentColor"/>
            <circle cx="9.5" cy="14.75" r="1.9" fill="currentColor"/>
          </svg>
        </span>
      </button>
      <div class="floating-menu" id="floating-menu">
        <div class="floating-menu-header">
          <div class="floating-menu-eyebrow">Preview</div>
        </div>
        <button class="floating-menu-group" data-group="theme" type="button" aria-expanded="false">
          <span class="floating-menu-group-icon" aria-hidden="true">◐</span>
          <span class="floating-menu-group-copy">
            <span class="floating-menu-group-label">Theme</span>
          </span>
          <span class="floating-menu-group-value" id="theme-value">System</span>
          <span class="floating-menu-group-arrow">&#9656;</span>
        </button>
        <div class="floating-menu-sub" id="theme-options">
          <button class="floating-menu-item" data-value="auto">System</button>
          <button class="floating-menu-item" data-value="light">Light</button>
          <button class="floating-menu-item" data-value="dark">Dark</button>
        </div>
        <button class="floating-menu-group" data-group="style" type="button" aria-expanded="false">
          <span class="floating-menu-group-icon" aria-hidden="true">✦</span>
          <span class="floating-menu-group-copy">
            <span class="floating-menu-group-label">Style</span>
          </span>
          <span class="floating-menu-group-value" id="style-value">Default</span>
          <span class="floating-menu-group-arrow">&#9656;</span>
        </button>
        <div class="floating-menu-sub" id="style-options">
          <button class="floating-menu-item" data-value="default">Default</button>
          <button class="floating-menu-item" data-value="github">GitHub</button>
          <button class="floating-menu-item" data-value="notion">Notion</button>
          <button class="floating-menu-item" data-value="tokyo-night">Tokyo Night</button>
          <button class="floating-menu-item" data-value="obsidian">Obsidian</button>
          <button class="floating-menu-item" data-value="paper">Paper</button>
          <button class="floating-menu-item" data-value="typora">Typora</button>
        </div>
        <button class="floating-menu-action" id="format-button" type="button">
          <span class="floating-menu-action-icon" aria-hidden="true">⌘</span>
          <span class="floating-menu-action-copy">
            <span class="floating-menu-action-title">Format Document</span>
          </span>
        </button>
        <button class="floating-menu-action" id="export-button" type="button">
          <span class="floating-menu-action-icon" aria-hidden="true">↗</span>
          <span class="floating-menu-action-copy">
            <span class="floating-menu-action-title">Export HTML</span>
          </span>
        </button>
      </div>
    </div>
    <main id="preview-content" class="preview-content"></main>
    <script nonce="${nonce}">
      window.MDLINT_MERMAID_URI = "${mermaidUri}";
    </script>
    <script nonce="${nonce}" src="${scriptUri}"></script>
  </body>
</html>`;
  }
}

type WebviewMessage =
  | { type: 'setThemeMode'; value: ThemeMode }
  | { type: 'setPreviewStyle'; value: PreviewStyle }
  | { type: 'toggleToc'; value: boolean }
  | { type: 'revealLine'; value: number }
  | { type: 'formatDocument' }
  | { type: 'scrollToLine'; value: number }
  | { type: 'syncEditorScroll'; value: number }
  | { type: 'refreshPreview' }
  | { type: 'exportHtml' }
  | { type: 'openLink'; value: string };

function getPreviewKey(uri: vscode.Uri): string {
  return uri.toString();
}

function splitLinkTarget(href: string): { path: string; fragment?: string } {
  const hashIndex = href.indexOf('#');
  if (hashIndex === -1) {
    return { path: href };
  }

  return {
    path: href.slice(0, hashIndex),
    fragment: href.slice(hashIndex + 1) || undefined,
  };
}

function decodeLinkPath(path: string): string {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

function decodeFragment(fragment: string): string {
  try {
    return decodeURIComponent(fragment);
  } catch {
    return fragment;
  }
}

function resolveLinkedUri(baseUri: vscode.Uri, linkPath: string): vscode.Uri {
  const segments = linkPath.split('/').filter((segment) => segment.length > 0);
  return vscode.Uri.joinPath(baseUri, ...segments);
}

function isPreviewableMarkdown(document: vscode.TextDocument): boolean {
  return document.languageId === 'markdown';
}

function getNonce(): string {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}
