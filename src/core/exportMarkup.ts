export function convertMermaidCodeBlocksForExport(html: string): string {
  return html.replace(
    /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g,
    '<div class="mermaid">$1</div>',
  );
}

export function buildMermaidExportRuntime(themeMode: string): string {
  const mermaidTheme = themeMode === 'dark' ? 'dark' : 'default';

  return `
    document.addEventListener("DOMContentLoaded", async function() {
      const diagrams = Array.from(document.querySelectorAll('.mermaid'));

      function showMermaidError(element, detail) {
        const message = String(detail || '').replace(/\\s+/g, ' ').trim().slice(0, 180);
        const error = document.createElement('div');
        error.className = 'mermaid-error';
        error.innerHTML = '<strong>Mermaid diagram unavailable</strong>' +
          (message ? '<span class="mermaid-error-detail">' + escapeMermaidError(message) + '</span>' : '');
        element.replaceWith(error);
      }

      function escapeMermaidError(value) {
        return value
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      }

      if (diagrams.length === 0) {
        return;
      }

      if (typeof mermaid === 'undefined') {
        for (const diagram of diagrams) {
          showMermaidError(diagram, 'Renderer failed to load.');
        }
        return;
      }

      try {
        mermaid.initialize({ startOnLoad: false, theme: '${mermaidTheme}' });
      } catch (error) {
        for (const diagram of diagrams) {
          showMermaidError(diagram, 'Renderer initialization failed.');
        }
        return;
      }

      for (const diagram of diagrams) {
        try {
          await mermaid.run({ nodes: [diagram] });
        } catch (error) {
          showMermaidError(diagram, error && (error.message || error.str) || 'Render failed.');
        }
      }
    });
  `;
}
