import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { getWorkbenchConfig } from './config';
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

  // Convert local images to base64
  let finalHtmlContent = rendered.html;
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
    finalHtmlContent = finalHtmlContent.replace(oldMatch, newMatch);
  }

  const themeMode = config.themeMode === 'auto'
    ? (vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Light ? 'light' : 'dark')
    : config.themeMode;
  const styleCss = loadExportCss(context, themeMode, config.previewStyle);

  const tocHtml = config.showToc
    ? `<nav class="export-toc">${toc.map((item) => `<div class="export-toc-item level-${item.level}"><a href="#${escapeAttribute(item.slug)}">${escapeHtml(item.text)}</a></div>`).join('\n')}</nav>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(path.basename(sourceUri.fsPath, '.md'))}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.css">
  <style>${styleCss}</style>
</head>
<body class="export-body theme-${themeMode} style-${config.previewStyle}">
  ${tocHtml}
  <article class="preview-content">${finalHtmlContent}</article>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
  <script>
    document.addEventListener("DOMContentLoaded", function() {
      if (typeof mermaid !== 'undefined') {
        mermaid.initialize({ startOnLoad: true, theme: '${themeMode === 'dark' ? 'dark' : 'default'}' });
      }
    });
  </script>
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/"/g, '&quot;');
}

function loadExportCss(context: vscode.ExtensionContext, themeMode: string, previewStyle: string): string {
  const cssPath = vscode.Uri.joinPath(context.extensionUri, 'media', 'main.css').fsPath;
  try {
    let css = fs.readFileSync(cssPath, 'utf-8');
    css += `
.export-body {
  margin: 0 auto;
  max-width: 920px;
  padding: 40px 24px;
  overflow: auto;
  min-height: 100vh;
}
.export-toc {
  margin-bottom: 2rem;
  padding: 1rem 1.5rem;
  border: 1px solid rgba(128,128,128,0.2);
  border-radius: 8px;
}
.export-toc-item a {
  color: inherit;
  text-decoration: none;
}
.export-toc-item a:hover {
  text-decoration: underline;
}
.export-toc-item.level-1 { margin-left: 0; font-weight: 600; }
.export-toc-item.level-2 { margin-left: 1rem; }
.export-toc-item.level-3 { margin-left: 2rem; }
.export-toc-item.level-4 { margin-left: 3rem; }
.export-toc-item.level-5 { margin-left: 4rem; }
.export-toc-item.level-6 { margin-left: 5rem; }
.export-body {
  background: var(--bg);
  color: var(--text);
}
`;
    return css;
  } catch {
    return '';
  }
}
