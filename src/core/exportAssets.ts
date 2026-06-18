export const KATEX_CDN_VERSION = '0.16.45';
export const MERMAID_CDN_VERSION = '11.15.0';

export function buildKatexStylesheetTag(): string {
  return `<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@${KATEX_CDN_VERSION}/dist/katex.min.css">`;
}

export function buildMermaidScriptTag(): string {
  return `  <script src="https://cdn.jsdelivr.net/npm/mermaid@${MERMAID_CDN_VERSION}/dist/mermaid.min.js"></script>`;
}
