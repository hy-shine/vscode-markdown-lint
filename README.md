# Markdown Preview Lite

<p align="center">
  <img src="./images/hero-dark.png" width="49%" alt="Dark Mode Preview">
  <img src="./images/hero-light.png" width="49%" alt="Light Mode Preview">
</p>
<p align="center">
  <em>Dark Mode Preview</em>&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;<em>Light Mode Preview</em>
</p>

A lightweight Markdown preview extension for VS Code. Open a direct preview in the current editor tab or a side-by-side preview with live rendering, table of contents, scroll sync, multiple themes, math formulas, code highlighting, and one-click HTML export.

---

## Quick Start

1. Open any `.md` file
2. Run `Open Preview Inline` for a direct preview, or `Open Preview to the Side` to keep the Markdown file on the left
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

Each style supports **System / Light / Dark** mode. System follows your VS Code theme and resolves to the preview's light or dark palette.

### Table of Contents & Scroll Sync

- TOC sidebar with automatic heading extraction
- Current section highlight as you scroll
- Click a heading to navigate; Inline keeps the navigation in the preview, while Beside reveals the source editor
- Click the Inline preview title-bar icon to switch to the Markdown source; use the same source editor preview command to switch back

### Rich Content Support

- **Code highlighting** with copy-to-clipboard buttons
- **Math formulas** via KaTeX (`$...$` inline, `$$...$$` block)
- **Mermaid diagrams** rendered on the fly

### Markdown Support

Supports common GitHub-flavored Markdown, including headings, lists, tables,
task lists, strikethrough, links, images, fenced code blocks, KaTeX math,
Mermaid diagrams, and YAML-like front matter hiding.

Known code languages use syntax highlighting; unknown languages fall back to
plain text. Raw inline HTML is rendered for compatibility and subject to the
extension's current security restrictions.

The supported file extension is `.md`.

### Preview Checks

The preview reports common Markdown issues as warnings in the Problems panel. It does not modify your document; use `Format Document` for formatting.

- Empty headings, heading level skips, duplicate headings
- Missing image alt text, broken local links, missing local images

A warning count badge on the preview gear button shows the number of active issues.

### One-Click Export

Export your Markdown to a shareable HTML file with preview styles and local images bundled. KaTeX and Mermaid assets may still load from CDN.

---

## Settings

Search for `Markdown Preview Lite` in VS Code Settings.

User settings provide the defaults. Workspace settings override them. Preview menu changes are written to User settings; use VS Code Settings to configure the table of contents.

For compatibility with earlier releases, the setting IDs still use the historical `markdown-lint.*` namespace:

| Setting                      | Default   | Options                                                                           |
| ---------------------------- | --------- | --------------------------------------------------------------------------------- |
| `markdown-lint.themeMode`    | `system`  | `system` · `light` · `dark`                                                       |
| `markdown-lint.previewMode`  | `inline`  | `beside` · `inline`                                                               |
| `markdown-lint.previewStyle` | `default` | `default` · `github` · `notion` · `tokyo-night` · `obsidian` · `paper` · `typora` |
| `markdown-lint.showToc`      | `true`    | `true` · `false`                                                                  |

---

## Available Commands

- `Markdown Preview Lite: Preview with Markdown Preview Lite` (`markdown-lint.openPreview`) — Open the preview using the configured default placement
- `Markdown Preview Lite: Open Preview Inline` (`markdown-lint.openPreviewInline`) — Open the preview in the current editor group
- `Markdown Preview Lite: Open Preview to the Side` (`markdown-lint.openPreviewToSide`) — Open the preview beside the Markdown editor
- `Markdown Preview Lite: Reopen as Markdown Source` (`markdown-lint.reopenAsSource`) — Switch a direct preview back to the Markdown editor
- `Markdown Preview Lite: Format Document` (`markdown-lint.formatDocument`) — Clean up Markdown structure
- `Markdown Preview Lite: Refresh TOC` (`markdown-lint.refreshToc`) — Re-extract headings
- `Markdown Preview Lite: Export HTML` (`markdown-lint.exportHtml`) — Export Markdown as HTML; Mermaid and KaTeX assets may require network access

---

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

## License

[MIT License](./LICENSE)
