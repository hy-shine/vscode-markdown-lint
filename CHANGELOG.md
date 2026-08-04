# Changelog

## [0.7.1] - 2026-08-04

### Fixed

- Fix editor-to-preview scroll sync being fully suppressed by a misplaced resize guard.
- Fix export inlining arbitrary `file://` images; only images inside the workspace (or the document directory for single files) are inlined, with symlink resolution.
- Fix Format inside the Inline preview switching to the Markdown source editor.
- Fix Mermaid preview initialization failing when the active theme uses `color-mix` CSS colors.
- Fix Mermaid renderer loading being shadowed by a document element whose `id` is `mermaid` (for example a heading), which left every diagram showing "Renderer failed to load.".
- Upgrade dompurify to 3.4.13 and the nested esbuild used by tsx to 0.28.1 to clear dependency advisories.

## [0.7.0] - 2026-08-03

### Added

- Add an Inline custom editor preview with a title-bar command to switch between the preview and Markdown source.

### Changed

- Keep Inline TOC navigation inside the preview while Beside TOC navigation reveals the source editor.
- Harden exported HTML with a restrictive Content Security Policy and nonce-protected Mermaid runtime.
- Restrict external preview links to supported HTTP, HTTPS, mailto, and FTP schemes.

## [0.6.0] - 2026-06-25

### Added

- Add configurable inline or side-by-side preview placement with `markdown-lint.previewMode`.
- Add lightweight preview checks for missing images, broken links, empty headings, and duplicate headings.
- Label code blocks with their original fence language.

### Changed

- Open long code blocks expanded by default while keeping the manual collapse control.
- Improve performance with IntersectionObserver heading tracking and curated highlight.js languages.
- Split webview controls and Mermaid interactions into separate modules.
- Load external export assets only when needed.

### Fixed

- Fix Mermaid diagram theme integration to use CSS variables instead of hardcoded palettes.
- Fix inline code contrast in default light theme to meet WCAG AA standards.
- Fix scrollSyncTimer leak and align export CDN versions.
- Improve theme consistency across all preview styles.
- Skip YAML front matter in TOC extraction and preview checks.

## [0.5.0] - 2026-06-10

### Changed

- Reposition the extension as Markdown Preview Lite while preserving the existing extension ID, command IDs, and `markdown-lint.*` settings for Marketplace and user compatibility.
- Polish the preview reading experience with clearer table of contents states, active heading visibility, copy feedback, and image lightbox behavior.

### Fixed

- Normalize local path handling across preview rendering, webview resource roots, and HTML export for paths with spaces, Chinese characters, parent segments, raw HTML images, and `file:` URIs.
- Stabilize preview link handling so Markdown links open previews, local non-Markdown links open in the editor, external links open outside the webview, and missing local files show clearer warnings.
- Reduce scroll synchronization contention between the editor, preview, resize handling, and table of contents navigation.
- Make Mermaid rendering failures quiet and readable so one failed diagram does not break the preview or exported HTML.

## [0.4.0] - 2026-06-08

### Added

- Add click-to-enlarge lightbox for preview images
- Render Mermaid diagrams in exported HTML

### Changed

- Move exported document table of contents to side navigation
- Open Markdown preview links in separate preview panels
- Simplify preview settings menu labels

### Fixed

- Fix extension activation crash after the 0.3.0 release
- Load local images referenced from Markdown and raw HTML image tags
- Preserve editor tabs when opening local non-Markdown files
- Open only Markdown links inside preview panels
- Normalize heading text for table of contents matching
- Respect project Prettier configuration when formatting Markdown
- Harden TOC metadata mapping and export handling

## [0.3.0] - 2026-04-27

### Added

- Code block folding for blocks with more than 10 lines
- Line numbers in code blocks
- Hide YAML front matter in preview
- Custom SVG icon for preview command

## [0.2.1] - 2026-04-24

### Added

- Clickable link support in preview panel
- Spin animation on refresh button for visual feedback

### Fixed

- Improve preview sync between editor and preview
- TOC deduplication to prevent duplicate entries

## [0.2.0] - 2026-04-23

### Added

- Add typora preview style (Whitey light / Night dark themes)

### Changed

- Theme mode display name: 'Auto' → 'System' for better clarity

### Fixed

- Tokyo Night: fix font family and light mode colors
- Obsidian: update colors to match official design tokens
- Notion Dark mode: update colors to match official design
- GitHub: update style to latest Primer tokens

## [0.1.1] - 2026-04-23

### Changed

- Rename extension from md-lint to markdown-lint
- Add keywords: preview, mermaid, formatter
- Update repository URLs to vscode-markdown-lint
- Remove debug console.log statements from extension.ts

## [0.1.0] - 2026-04-23

### Added

- Markdown preview panel with real-time rendering
- 6 preview themes: Default, GitHub, Notion, Tokyo Night, Obsidian, Paper
- Auto / Light / Dark theme mode
- Table of contents sidebar with scroll sync
- Code syntax highlighting with copy button
- Math formula rendering (KaTeX)
- Mermaid diagram rendering with fullscreen and zoom
- Markdown document formatting
- Export to standalone HTML
- Floating settings menu

### Fixed

- Preview content flickering when resizing panel
- Blockquote background color in light theme
- Scroll sync between editor and preview
- Nested code block rendering
