# markdown-lint

<p align="center">
  <img src="./images/hero-dark.png" width="49%" alt="Dark Mode Preview">
  <img src="./images/hero-light.png" width="49%" alt="Light Mode Preview">
</p>
<p align="center">
  <em>Dark Mode Preview</em>&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;<em>Light Mode Preview</em>
</p>

A polished Markdown preview extension for VS Code. Open a side panel with live rendering, table of contents, scroll sync, multiple themes, math formulas, code highlighting, and one-click HTML export.

---

## Quick Start

1. Open any `.md` file
2. Click the preview icon in the editor title bar, or run `Preview with Markdown Lint` from the Command Palette
3. Switch themes and styles from the floating menu in the preview panel

---

## Features

### Multiple Preview Styles

Choose a look that fits your workflow:

| Style           | Description                                    |
| --------------- | ---------------------------------------------- |
| **Default**     | Follows your VS Code color theme               |
| **GitHub**      | Matches GitHub's Markdown rendering            |
| **Notion**      | Clean, spacious editorial style                |
| **Tokyo Night** | Low-contrast dark inspired by the editor theme |
| **Obsidian**    | Inspired by the Obsidian app aesthetic         |
| **Paper**       | Ink on cream paper, print-ready                |
| **Typora**      | Typora-inspired Whitey / Night themes          |

Each style supports **Auto / Light / Dark** mode and switches with your VS Code theme when set to Auto.

### Table of Contents & Scroll Sync

- TOC sidebar with automatic heading extraction
- Current section highlight as you scroll
- Click a heading to jump to the editor
- Scroll sync between editor and preview

### Rich Content Support

- **Code highlighting** with copy-to-clipboard buttons
- **Math formulas** via KaTeX (`$...$` inline, `$$...$$` block)
- **Mermaid diagrams** rendered on the fly

### One-Click Export

Export your Markdown to a shareable HTML file with preview styles and local images bundled. KaTeX and Mermaid assets may still load from CDN.

---

## Settings

Search for `markdown-lint` in VS Code Settings:

| Setting                      | Default   | Options                                                                |
| ---------------------------- | --------- | ---------------------------------------------------------------------- |
| `markdown-lint.themeMode`    | `auto`    | `auto` · `light` · `dark`                                              |
| `markdown-lint.previewStyle` | `default` | `default` · `github` · `notion` · `tokyo-night` · `obsidian` · `paper` · `typora` |
| `markdown-lint.showToc`      | `true`    | `true` · `false`                                                       |

---

## Available Commands

- `markdown-lint: Preview with Markdown Lint` (`markdown-lint.openPreview`) — Open the preview panel
- `markdown-lint: Format Document` (`markdown-lint.formatDocument`) — Clean up Markdown structure
- `markdown-lint: Refresh TOC` (`markdown-lint.refreshToc`) — Re-extract headings
- `markdown-lint: Export HTML` (`markdown-lint.exportHtml`) — Save as standalone HTML

---

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

## License

[MIT License](./LICENSE)
