import katex from 'katex';
import { marked, TokenizerAndRendererExtension, Tokens } from 'marked';
import { TocItem } from '../types';
import { resolveHeadingMeta } from './headings';
import hljs from './highlight';
import { escapeAttribute, escapeHtml } from './htmlUtils';
import { resolveReference } from './localPaths';

export interface RenderedMarkdown {
  html: string;
}

// --- Marked extensions for KaTeX math rendering ---
// Block math: $$...$$
const blockMathExtension: TokenizerAndRendererExtension = {
  name: 'blockMath',
  level: 'block',
  start(src: string) {
    return src.match(/^\$\$/m)?.index ?? -1;
  },
  tokenizer(src: string) {
    const match = src.match(/^\$\$([\s\S]+?)\$\$/);
    if (!match) {
      return undefined;
    }
    return {
      type: 'blockMath',
      raw: match[0],
      expression: match[1].trim(),
    };
  },
  renderer(token: Tokens.Generic) {
    return `<p>${katex.renderToString(token.expression as string, { displayMode: true, throwOnError: false })}</p>`;
  },
};

// Inline math: $...$
const inlineMathExtension: TokenizerAndRendererExtension = {
  name: 'inlineMath',
  level: 'inline',
  start(src: string) {
    return src.match(/(?<!\$)\$(?!\$)/)?.index ?? -1;
  },
  tokenizer(src: string) {
    const match = src.match(/^(?:^|[^\\])\$(?!\$)([^$\n]+?)\$(?!\$)/);
    if (!match) {
      return undefined;
    }
    return {
      type: 'inlineMath',
      raw: match[0],
      expression: match[1].trim(),
      prefix: match[0].startsWith('$') ? '' : match[0][0],
    };
  },
  renderer(token: Tokens.Generic) {
    const prefix = (token.prefix as string) ?? '';
    return `${prefix}${katex.renderToString(token.expression as string, { displayMode: false, throwOnError: false })}`;
  },
};

marked.use({ extensions: [blockMathExtension, inlineMathExtension] });

marked.setOptions({
  gfm: true,
  breaks: false,
});

export function renderMarkdown(
  markdown: string,
  toc: TocItem[],
  baseUri?: string,
  resolveImageUri?: (uri: string) => string,
): RenderedMarkdown {
  let headingIndex = 0;

  const renderer = new marked.Renderer();
  renderer.heading = ({ tokens, depth }: Tokens.Heading) => {
    const text = marked.Parser.parseInline(tokens);
    const meta = resolveHeadingMeta(toc, headingIndex++, text);
    return `<h${depth} id="${escapeAttribute(meta.slug)}" data-source-line="${meta.line}">${text}</h${depth}>`;
  };
  renderer.code = ({ text, lang }: Tokens.Code) => {
    const language = normalizeCodeFenceLanguage(lang);
    if (language === 'mermaid') {
      return `<pre><code class="language-mermaid">${escapeHtml(text)}</code></pre>`;
    }
    const highlightLanguage = language && hljs.getLanguage(language) ? language : 'plaintext';
    let highlighted = hljs.highlight(text, { language: highlightLanguage }).value;
    if (highlightLanguage === 'bash' || highlightLanguage === 'sh' || highlightLanguage === 'zsh') {
      highlighted = annotateShellCommands(highlighted);
    }
    const lineCount = text.split('\n').length;
    const isFoldable = lineCount > 10;
    const foldAttrs = isFoldable ? ' data-foldable data-folded="false"' : '';
    const lines = wrapHighlightedLines(highlighted);
    const languageLabel = `<span class="code-language-label">${escapeHtml(getCodeLanguageLabel(language))}</span>`;
    const copyButton = `<button class="code-copy-button" data-code="${escapeAttribute(text)}" aria-label="Copy code">Copy</button>`;
    const foldButton = isFoldable ? `<button class="code-fold-toggle" aria-expanded="true" aria-label="Collapse code">Collapse</button>` : '';
    return `<pre class="code-block"${foldAttrs}>${languageLabel}${copyButton}${foldButton}<code class="hljs language-${escapeAttribute(highlightLanguage)}">${lines}</code></pre>`;
  };
  renderer.image = ({ href, title, text }: Tokens.Image) => {
    const src = resolveImageSource(href, baseUri, resolveImageUri);
    const titleAttr = title ? ` title="${escapeAttribute(title)}"` : '';
    return `<img src="${escapeAttribute(src)}" alt="${escapeAttribute(text)}"${titleAttr}>`;
  };

  const stripped = stripFrontMatter(markdown);
  let finalHtml = marked.parse(stripped, { renderer }) as string;
  
  // Rewrite raw HTML <img src="..."> tags to resolve local relative paths
  finalHtml = finalHtml.replace(/<img\s+([^>]*?)src=["']([^"']+)["']([^>]*)>/gi, (match, before, src, after) => {
    const resolved = resolveImageSource(src, baseUri, resolveImageUri);
    return `<img ${before}src="${escapeAttribute(resolved)}"${after}>`;
  });

  return {
    html: finalHtml,
  };
}

function normalizeCodeFenceLanguage(lang: string | undefined): string {
  return (lang || '').trim().split(/\s+/, 1)[0].toLowerCase();
}

function getCodeLanguageLabel(language: string): string {
  return language ? language.toUpperCase() : 'TEXT';
}

function resolveImageSource(
  href: string,
  baseUri?: string,
  resolveImageUri?: (uri: string) => string,
): string {
  if (!baseUri) {
    return href;
  }

  const resolved = resolveReference(baseUri, href);
  if (resolved.type !== 'local') {
    return href;
  }

  return resolveImageUri ? resolveImageUri(resolved.uri) : resolved.uri;
}

// Common shell commands not in highlight.js built_in list
const shellCommands = [
  'npm', 'npx', 'yarn', 'pnpm', 'bun',
  'git',
  'docker', 'docker-compose', 'podman', 'kubectl', 'helm',
  'curl', 'wget',
  'pip', 'pip3', 'conda', 'poetry', 'uv',
  'node', 'python', 'python3', 'ruby', 'java', 'javac', 'go', 'rustc', 'cargo',
  'make', 'cmake', 'gradle', 'mvn',
  'grep', 'egrep', 'fgrep', 'rg',
  'find', 'locate',
  'awk', 'gawk', 'sed',
  'more', 'less', 'head', 'tail', 'cat', 'tee',
  'sort', 'uniq', 'diff', 'patch', 'comm',
  'tar', 'gzip', 'gunzip', 'zip', 'unzip', 'xz', 'bzip2',
  'ssh', 'scp', 'rsync', 'sftp',
  'apt', 'apt-get', 'yum', 'dnf', 'brew', 'pacman',
  'systemctl', 'service', 'journalctl',
  'crontab', 'at',
  'ip', 'ifconfig', 'ping', 'traceroute', 'netstat', 'ss', 'nslookup', 'dig',
  'gcc', 'g\\+\\+', 'clang',
  'vim', 'nano', 'emacs',
  'man', 'info', 'tldr',
  'jq', 'yq',
  'env', 'export', 'source',
];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const shellCommandRe = new RegExp(
  `(?<![\\w./-])(?:${shellCommands.map(escapeRegExp).join('|')})(?![\\w./-])`,
  'g',
);

function annotateShellCommands(html: string): string {
  return html.replace(shellCommandRe, (match) => {
    return `<span class="hljs-command">${match}</span>`;
  });
}

function wrapHighlightedLines(html: string): string {
  const rawLines = html.split('\n');
  return rawLines
    .map((line) => `<span class="code-line">${line}</span>`)
    .join('\n');
}

function stripFrontMatter(markdown: string): string {
  const normalized = markdown.charCodeAt(0) === 0xfeff ? markdown.slice(1) : markdown;
  const match = normalized.match(/^---\r?\n([\s\S]*?)\r?\n(?:---|\.\.\.)\r?\n?/);
  if (!match) {
    return markdown;
  }

  const body = match[1];
  const lines = body.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    return markdown;
  }

  const isYamlLike = lines.every((line) => {
    const trimmed = line.trim();
    return /^#/.test(trimmed)
      || /^[A-Za-z0-9_.-]+\s*:/.test(trimmed)
      || /^-\s+/.test(trimmed)
      || /^\s+/.test(line);
  });

  if (!isYamlLike) {
    return markdown;
  }

  return normalized.slice(match[0].length);
}
