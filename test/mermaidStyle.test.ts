import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const css = readFileSync(path.join(__dirname, "../media/main.css"), "utf8");

function cssRule(selector: string): string {
	const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const match = css.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`));

	assert.ok(match, `Missing CSS rule: ${selector}`);
	return match[1];
}

test("sizes only the Mermaid fullscreen diagram SVG, not zoom control icons", () => {
	assert.match(css, /\.mermaid-fullscreen-content\s*>\s*svg\s*\{/);
	assert.doesNotMatch(css, /\.mermaid-fullscreen-content\s+svg\s*\{/);
});

test("keeps the narrow-screen fullscreen close override after the base rule", () => {
	const baseRuleIndex = css.indexOf(".mermaid-fullscreen-close {");
	const narrowRuleIndex = css.indexOf(
		"@media (max-width: 520px)",
		baseRuleIndex,
	);

	assert.notEqual(baseRuleIndex, -1);
	assert.notEqual(narrowRuleIndex, -1);
	assert.ok(narrowRuleIndex > baseRuleIndex);
});

test("keeps Mermaid diagram hover visually stable", () => {
	const mermaidHover = cssRule(".mermaid-diagram:hover");

	assert.match(mermaidHover, /border-color:/);
	assert.doesNotMatch(mermaidHover, /transform:/);
});

test("defines style-specific syntax colors for non-paper presets", () => {
	for (const style of [
		"github",
		"notion",
		"tokyo-night",
		"obsidian",
		"typora",
	]) {
		assert.match(
			css,
			new RegExp(`body\\.style-${style}[\\s\\S]*--syntax-text:`),
		);
	}

	assert.match(
		css,
		/:is\(\.hljs, \.language-bash\)[\s\S]*color: var\(--syntax-text\)/,
	);
	assert.match(
		css,
		/:is\(\.hljs-keyword, \.hljs-doctag, \.hljs-formula\)[\s\S]*color: var\(--syntax-keyword\)/,
	);
	assert.match(
		css,
		/:is\(\s*\.hljs-string,\s*\.hljs-regexp,\s*\.hljs-addition,\s*\.hljs-attribute,\s*\.hljs-meta \.hljs-string\s*\)[\s\S]*color: var\(--syntax-string\)/,
	);
});

test("keeps named theme details aligned with their references", () => {
	assert.match(
		css,
		/body\.style-github \.preview-content h4 \{[\s\S]*?color: var\(--text\);[\s\S]*?\}/,
	);
	assert.match(
		css,
		/body\.theme-light\.style-typora \{[\s\S]*?--bg: #fefefe !important;/,
	);
});

test("does not define a third auto visual theme", () => {
	assert.doesNotMatch(css, /theme-auto/);
});

test("keeps Notion dark and Obsidian notes close to their references", () => {
	const obsidianQuote = cssRule(
		"body.style-obsidian .preview-content blockquote",
	);

	assert.match(
		css,
		/body\.style-notion \{[\s\S]*?--bg: #191919 !important;[\s\S]*?--panel: #252525 !important;[\s\S]*?--text: #fffcef !important;/,
	);
	assert.match(
		obsidianQuote,
		/background: color-mix\(in srgb, var\(--accent\) 7%, var\(--panel\)\);[\s\S]*?border-radius: 6px;/,
	);
	assert.doesNotMatch(obsidianQuote, /font-style: italic;/);
});

test("defines preview polish surfaces for tables and image tools", () => {
	assert.match(css, /\.table-scroll\s*\{/);
	assert.match(css, /\.table-scroll\.is-overflowing::after\s*\{/);
	assert.match(css, /\.preview-content table\.table-enhanced\s*\{/);
	assert.match(css, /\.preview-content \.is-numeric\s*\{/);
	assert.match(css, /\.image-lightbox-toolbar\s*\{/);
	assert.match(css, /\.image-lightbox-tool\s*\{/);
});

test("reduces preview polish motion for reduced motion users", () => {
	assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
	assert.match(css, /transition-duration: 0\.001ms !important;/);
});
