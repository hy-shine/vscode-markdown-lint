import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { getWorkbenchConfig } from './config';
import {
  buildMermaidExportRuntime,
  convertMermaidCodeBlocksForExport,
  htmlContainsClass,
  stripPreviewOnlyCodeControlsForExport,
} from './exportMarkup';
import { buildKatexStylesheetTag, buildMermaidScriptTag, buildExportCsp } from './exportAssets';
import { escapeAttribute, escapeHtml } from './htmlUtils';
import { inlineLocalImagesAsBase64 } from './exportPure';
import { renderMarkdown } from './markdown';
import { chooseMarkdownSource, readDiskMarkdown } from './markdownSourcePure';
import { extractToc } from './toc';

export async function exportHtml(document: vscode.TextDocument, context: vscode.ExtensionContext): Promise<void> {
  const sourceUri = document.uri;
  const targetUri = await vscode.window.showSaveDialog({
    title: 'Export Markdown to HTML',
    defaultUri: vscode.Uri.file(sourceUri.fsPath.replace(/\.md$/, '.html')),
    filters: {
      'HTML Files': ['html'],
    },
  });

  if (!targetUri) {
    return;
  }

  const diskText = await readDiskMarkdown(document.isDirty, () =>
    vscode.workspace.fs.readFile(sourceUri),
  );
  const markdownText = chooseMarkdownSource(document.isDirty, document.getText(), diskText);
  const config = getWorkbenchConfig();
  const toc = extractToc(markdownText);
  const baseUri = vscode.Uri.joinPath(sourceUri, '..');
  
  let rendered: { html: string };
  try {
    rendered = renderMarkdown(markdownText, toc, baseUri.toString());
  } catch (err) {
    console.error('[markdown-lint] exportHtml: renderMarkdown failed', err);
    throw err;
  }

  // Convert Mermaid code blocks into renderable containers for exported HTML
  let finalHtmlContent = stripPreviewOnlyCodeControlsForExport(
    convertMermaidCodeBlocksForExport(rendered.html),
  );

  // Inline local images as base64 data URIs so the exported HTML is
  // self-contained.
  const workspaceRoot = vscode.workspace.getWorkspaceFolder(sourceUri)?.uri;
  const allowedRoot = workspaceRoot ?? vscode.Uri.joinPath(sourceUri, '..');
  finalHtmlContent = await inlineLocalImagesAsBase64(
    finalHtmlContent,
    async (uri) => {
      try {
        return await vscode.workspace.fs.readFile(vscode.Uri.parse(uri));
      } catch (e) {
        console.warn(`[markdown-lint] exportHtml: failed to load image ${uri}`, e);
        throw e;
      }
    },
    {
      allowedRoot: allowedRoot.toString(),
      resolveRealPath: async (p) => fs.promises.realpath(p),
    },
  );

  const themeMode = config.themeMode === 'system'
    ? (vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Light ? 'light' : 'dark')
    : config.themeMode;
  const styleCss = await loadExportCss(context);
  const katexStyleTag = htmlContainsClass(finalHtmlContent, 'katex')
    ? buildKatexStylesheetTag()
    : '';
  const exportNonce = randomUUID().replace(/-/g, '');
  const exportCsp = buildExportCsp(exportNonce);
  const mermaidRuntime = htmlContainsClass(finalHtmlContent, 'mermaid')
    ? `${buildMermaidScriptTag()}
  <script nonce="${exportNonce}">${buildMermaidExportRuntime(themeMode)}</script>`
    : '';

  const tocHtml = config.showToc && toc.length > 0
    ? `<aside class="export-toc"><div class="export-toc-title">Table of contents</div><nav class="export-toc-list">${toc.map((item) => `<div class="export-toc-item level-${item.level}"><a href="#${escapeAttribute(item.slug)}">${escapeHtml(item.text)}</a></div>`).join('\n')}</nav></aside>`
    : '';
  const bodyClass = `export-body theme-${themeMode} style-${config.previewStyle}${tocHtml ? '' : ' no-export-toc'}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="${exportCsp}" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(path.basename(sourceUri.fsPath, '.md'))}</title>
  ${katexStyleTag}
  <style>${styleCss}</style>
</head>
<body class="${bodyClass}">
  <div class="export-layout">
    ${tocHtml}
    <article class="preview-content export-article">${finalHtmlContent}</article>
  </div>
${mermaidRuntime}
</body>
</html>`;

  await vscode.workspace.fs.writeFile(targetUri, new TextEncoder().encode(html));
  
  await vscode.window.showInformationMessage(`Exported HTML: ${targetUri.fsPath}`, 'Open').then((choice) => {
    if (choice === 'Open') {
      void vscode.env.openExternal(targetUri);
    }
  });
}

async function loadExportCss(context: vscode.ExtensionContext): Promise<string> {
  const cssUri = vscode.Uri.joinPath(context.extensionUri, 'media', 'main.css');
  try {
    let css = new TextDecoder().decode(await vscode.workspace.fs.readFile(cssUri));
    css += `
.export-body {
  margin: 0;
  overflow: auto;
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
}
.export-layout {
  display: grid;
  grid-template-columns: 260px minmax(0, 920px);
  gap: 32px;
  max-width: 1240px;
  margin: 0 auto;
  padding: 40px 32px;
}
.export-body.no-export-toc .export-layout {
  display: block;
  max-width: 920px;
}
.export-toc {
  position: sticky;
  top: 32px;
  align-self: start;
  max-height: calc(100vh - 64px);
  overflow: auto;
  padding: 4px 0;
  color: var(--muted);
  font-size: 13px;
}
.export-toc-title {
  margin-bottom: 10px;
  color: var(--text);
  font-weight: 700;
}
.export-toc-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.export-toc-item {
  line-height: 1.35;
}
.export-toc-item a {
  color: inherit;
  text-decoration: none;
}
.export-toc-item a:hover {
  color: var(--accent);
  text-decoration: underline;
}
.export-toc-item.level-1 { margin-left: 0; font-weight: 600; }
.export-toc-item.level-2 { margin-left: 0.75rem; }
.export-toc-item.level-3 { margin-left: 1.5rem; }
.export-toc-item.level-4 { margin-left: 2.25rem; }
.export-toc-item.level-5 { margin-left: 3rem; }
.export-toc-item.level-6 { margin-left: 3.75rem; }
`;
    return css;
  } catch {
    return '';
  }
}
