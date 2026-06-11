import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { getWorkbenchConfig } from './config';
import { buildMermaidExportRuntime, convertMermaidCodeBlocksForExport } from './exportMarkup';
import { escapeAttribute, escapeHtml } from './htmlUtils';
import { renderMarkdown } from './markdown';
import { extractToc } from './toc';

export async function exportHtml(sourceUri: vscode.Uri, context: vscode.ExtensionContext): Promise<void> {
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

  const markdown = await vscode.workspace.fs.readFile(sourceUri);
  const markdownText = new TextDecoder().decode(markdown);
  const config = getWorkbenchConfig();
  const toc = extractToc(markdownText);
  const baseUri = vscode.Uri.joinPath(sourceUri, '..');
  
  let rendered: { html: string };
  try {
    rendered = renderMarkdown(markdownText, toc, baseUri);
  } catch (err) {
    console.error('[markdown-lint] exportHtml: renderMarkdown failed', err);
    throw err;
  }

  // Convert Mermaid code blocks into renderable containers for exported HTML
  let finalHtmlContent = convertMermaidCodeBlocksForExport(rendered.html);

  // Convert local images to base64
  const imgRegex = /<img\s+([^>]*?)src="([^"]+)"([^>]*?)>/g;
  const replacements: { oldMatch: string, newMatch: string }[] = [];
  
  for (const match of finalHtmlContent.matchAll(imgRegex)) {
    const fullMatch = match[0];
    const src = match[2];
    
    if (src.startsWith('file://')) {
      try {
        const fileUri = vscode.Uri.parse(src);
        const fileData = await vscode.workspace.fs.readFile(fileUri);
        const ext = path.extname(fileUri.fsPath).toLowerCase().slice(1);
        const base64 = Buffer.from(fileData).toString('base64');
        const mime = getImageMime(ext);
        const newSrc = `data:${mime};base64,${base64}`;
        const newMatch = fullMatch.replace(`src="${src}"`, `src="${newSrc}"`);
        replacements.push({ oldMatch: fullMatch, newMatch });
      } catch (e) {
        console.warn(`[markdown-lint] exportHtml: failed to load image ${src}`, e);
      }
    }
  }

  for (const { oldMatch, newMatch } of replacements) {
    finalHtmlContent = finalHtmlContent.replaceAll(oldMatch, newMatch);
  }

  const themeMode = config.themeMode === 'auto'
    ? (vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Light ? 'light' : 'dark')
    : config.themeMode;
  const styleCss = loadExportCss(context, themeMode, config.previewStyle);
  const mermaidRuntime = buildMermaidExportRuntime(themeMode);

  const tocHtml = config.showToc && toc.length > 0
    ? `<aside class="export-toc"><div class="export-toc-title">Table of contents</div><nav class="export-toc-list">${toc.map((item) => `<div class="export-toc-item level-${item.level}"><a href="#${escapeAttribute(item.slug)}">${escapeHtml(item.text)}</a></div>`).join('\n')}</nav></aside>`
    : '';
  const bodyClass = `export-body theme-${themeMode} style-${config.previewStyle}${tocHtml ? '' : ' no-export-toc'}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(path.basename(sourceUri.fsPath, '.md'))}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.css">
  <style>${styleCss}</style>
</head>
<body class="${bodyClass}">
  <div class="export-layout">
    ${tocHtml}
    <article class="preview-content export-article">${finalHtmlContent}</article>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
  <script>${mermaidRuntime}</script>
</body>
</html>`;

  await vscode.workspace.fs.writeFile(targetUri, new TextEncoder().encode(html));
  
  await vscode.window.showInformationMessage(`Exported HTML: ${targetUri.fsPath}`, 'Open').then((choice) => {
    if (choice === 'Open') {
      void vscode.env.openExternal(targetUri);
    }
  });
}

function getImageMime(ext: string): string {
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'svg':
      return 'image/svg+xml';
    default:
      return 'application/octet-stream';
  }
}

function loadExportCss(context: vscode.ExtensionContext, themeMode: string, previewStyle: string): string {
  const cssPath = vscode.Uri.joinPath(context.extensionUri, 'media', 'main.css').fsPath;
  try {
    let css = fs.readFileSync(cssPath, 'utf-8');
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
