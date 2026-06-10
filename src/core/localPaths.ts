import { marked } from 'marked';

export type ResolvedReference =
  | { type: 'anchor'; fragment: string }
  | { type: 'external'; href: string }
  | { type: 'local'; uri: string; fragment?: string };

const ABSOLUTE_SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;

export function resolveReference(baseDirectoryUri: string, href: string): ResolvedReference {
  const target = href.trim();
  if (target.startsWith('#')) {
    return { type: 'anchor', fragment: target.slice(1) };
  }

  if (ABSOLUTE_SCHEME_RE.test(target) && !/^file:/i.test(target)) {
    return { type: 'external', href };
  }

  const { path, fragment } = splitFragment(target);
  if (!path) {
    return fragment ? { type: 'anchor', fragment } : { type: 'external', href };
  }

  const resolved = /^file:/i.test(path)
    ? new URL(path)
    : new URL(path, ensureTrailingSlash(baseDirectoryUri));
  resolved.hash = '';

  return fragment
    ? { type: 'local', uri: resolved.href, fragment }
    : { type: 'local', uri: resolved.href };
}

export function getContainingDirectoryUri(uri: string): string {
  return new URL('.', uri).href;
}

export function collectLocalImageRootUris(markdown: string, baseDirectoryUri: string): string[] {
  const roots = new Map<string, string>();

  for (const href of collectImageReferences(markdown)) {
    const resolved = resolveReference(baseDirectoryUri, href);
    if (resolved.type !== 'local') {
      continue;
    }

    const root = getContainingDirectoryUri(resolved.uri);
    roots.set(root, root);
  }

  return Array.from(roots.values());
}

function collectImageReferences(markdown: string): string[] {
  const references: string[] = [];
  const addReference = (href: string | undefined) => {
    if (href) {
      references.push(href);
    }
  };

  for (const match of markdown.matchAll(/!\[[^\]]*]\(([^)\n]+)\)/g)) {
    addReference(parseMarkdownImageTarget(match[1]));
  }

  const tokens = marked.lexer(markdown, { gfm: true });
  marked.walkTokens(tokens, (token) => {
    if (token.type === 'image') {
      addReference(token.href);
    }
  });

  const visit = (value: unknown) => {
    if (!value || typeof value !== 'object') {
      return;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        visit(item);
      }
      return;
    }

    const token = value as { type?: string; href?: string; tokens?: unknown; items?: unknown };
    if (token.type === 'image' && typeof token.href === 'string') {
      addReference(token.href);
    }

    visit(token.tokens);
    visit(token.items);
  };

  visit(tokens);

  for (const match of markdown.matchAll(/<img\s+[^>]*?src=["']([^"']+)["'][^>]*>/gi)) {
    addReference(match[1]);
  }

  return references;
}

function parseMarkdownImageTarget(value: string): string | undefined {
  const target = value.trim();
  if (!target) {
    return undefined;
  }

  if (target.startsWith('<')) {
    const end = target.indexOf('>');
    return end === -1 ? target.slice(1).trim() : target.slice(1, end).trim();
  }

  return target
    .replace(/\s+(?:"[^"]*"|'[^']*'|\([^)]*\))\s*$/, '')
    .trim();
}

function splitFragment(href: string): { path: string; fragment?: string } {
  const hashIndex = href.indexOf('#');
  if (hashIndex === -1) {
    return { path: href };
  }

  return {
    path: href.slice(0, hashIndex),
    fragment: href.slice(hashIndex + 1) || undefined,
  };
}

function ensureTrailingSlash(uri: string): string {
  return uri.endsWith('/') ? uri : `${uri}/`;
}
