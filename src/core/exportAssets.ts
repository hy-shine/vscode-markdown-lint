import { KATEX_CDN_VERSION, MERMAID_CDN_VERSION } from './constants';

export { KATEX_CDN_VERSION, MERMAID_CDN_VERSION };

export function buildKatexStylesheetTag(): string {
  return `<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@${KATEX_CDN_VERSION}/dist/katex.min.css">`;
}

export function buildMermaidScriptTag(): string {
  return `  <script src="https://cdn.jsdelivr.net/npm/mermaid@${MERMAID_CDN_VERSION}/dist/mermaid.min.js"></script>`;
}

export function buildExportCsp(nonce: string): string {
  return [
    "default-src 'none'",
    "base-uri 'none'",
    "object-src 'none'",
    "frame-src 'none'",
    "style-src 'unsafe-inline' https://cdn.jsdelivr.net",
    "font-src https://cdn.jsdelivr.net data:",
    "img-src data: https:",
    `script-src 'nonce-${nonce}' https://cdn.jsdelivr.net`,
  ].join('; ');
}
