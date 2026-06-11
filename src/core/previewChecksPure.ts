import { PreviewCheck } from '../types';
import { getCodeFencedLines } from './codeFence';
import { resolveReference } from './localPaths';
import { getFrontMatterLineCount, slugify } from './toc';

const HEADING_RE = /^(#{1,6})\s+(.+?)\s*$/;
const EMPTY_HEADING_RE = /^(#{1,6})\s*$/;
const ALT_TEXT_RE = /!\[\s*\]\([^)]+\)/;
const ABSOLUTE_SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;
const IMAGE_RE = /!\[[^\]]*]\(([^)\n]+)\)/g;
const HTML_IMG_RE = /<img\s+[^>]*?src=["']([^"']+)["'][^>]*>/gi;
const LINK_RE = /\[([^\]]+)\]\(([^)\n]+)\)/g;

export function findEmptyHeadings(lines: string[], fenced: Set<number>): PreviewCheck[] {
  const checks: PreviewCheck[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (fenced.has(i)) continue;
    const m = lines[i].match(EMPTY_HEADING_RE);
    if (m) {
      checks.push({ line: i, type: 'empty-heading', message: `Empty heading (${m[1].length} levels)` });
    }
  }
  return checks;
}

export function findHeadingLevelSkips(lines: string[], fenced: Set<number>): PreviewCheck[] {
  const checks: PreviewCheck[] = [];
  let prevLevel = 0;

  for (let i = 0; i < lines.length; i++) {
    if (fenced.has(i)) continue;
    const m = lines[i].match(HEADING_RE);
    if (!m) continue;

    const level = m[1].length;
    if (prevLevel > 0 && level > prevLevel + 1) {
      checks.push({
        line: i,
        type: 'heading-skip',
        message: `Heading level skipped from H${prevLevel} to H${level}`,
      });
    }
    prevLevel = level;
  }
  return checks;
}

export function findDuplicateHeadings(lines: string[], fenced: Set<number>): PreviewCheck[] {
  const checks: PreviewCheck[] = [];
  const slugCounts = new Map<string, number[]>();

  for (let i = 0; i < lines.length; i++) {
    if (fenced.has(i)) continue;
    const m = lines[i].match(HEADING_RE);
    if (!m) continue;

    const text = m[2].trim().replace(/\s+#+\s*$/, '').trim();
    const slug = slugify(text);
    const existing = slugCounts.get(slug);
    if (existing) {
      existing.push(i);
    } else {
      slugCounts.set(slug, [i]);
    }
  }

  for (const [, lineNumbers] of slugCounts) {
    if (lineNumbers.length > 1) {
      for (const line of lineNumbers) {
        checks.push({
          line,
          type: 'duplicate-heading',
          message: 'Duplicate heading generates ambiguous anchor',
        });
      }
    }
  }
  return checks;
}

export function findMissingAltText(lines: string[], fenced: Set<number>): PreviewCheck[] {
  const checks: PreviewCheck[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (fenced.has(i)) continue;
    if (ALT_TEXT_RE.test(lines[i])) {
      checks.push({ line: i, type: 'missing-alt', message: 'Image missing alt text' });
    }
  }
  return checks;
}

function isLocalFileHref(href: string): boolean {
  if (href.startsWith('#')) return false;
  if (ABSOLUTE_SCHEME_RE.test(href) && !/^file:/i.test(href)) return false;
  return true;
}

function stripTitle(href: string): string {
  return href.replace(/\s+(?:"[^"]*"|'[^']*'|\([^)]*\))\s*$/, '').trim();
}

function collectImageRefs(markdown: string, fenced: Set<number>): Array<{ href: string; line: number }> {
  const refs: Array<{ href: string; line: number }> = [];
  const lines = markdown.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (fenced.has(i)) continue;
    for (const m of lines[i].matchAll(IMAGE_RE)) {
      refs.push({ href: stripTitle(m[1]), line: i });
    }
    for (const m of lines[i].matchAll(HTML_IMG_RE)) {
      refs.push({ href: m[1].trim(), line: i });
    }
  }
  return refs;
}

function collectLinkRefs(markdown: string, fenced: Set<number>): Array<{ href: string; line: number }> {
  const refs: Array<{ href: string; line: number }> = [];
  const lines = markdown.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (fenced.has(i)) continue;
    for (const m of lines[i].matchAll(LINK_RE)) {
      refs.push({ href: stripTitle(m[2]), line: i });
    }
  }
  return refs;
}

export function findMissingImages(
  markdown: string,
  fenced: Set<number>,
  baseUri: string,
): PreviewCheck[] {
  const checks: PreviewCheck[] = [];
  const refs = collectImageRefs(markdown, fenced);
  for (const ref of refs) {
    if (!isLocalFileHref(ref.href)) continue;
    const resolved = resolveReference(baseUri, ref.href);
    if (resolved.type !== 'local') continue;
    checks.push({ line: ref.line, type: 'missing-image', message: `Image not found: ${ref.href}`, targetUri: resolved.uri });
  }
  return checks;
}

export function findBrokenLinks(
  markdown: string,
  fenced: Set<number>,
  baseUri: string,
): PreviewCheck[] {
  const checks: PreviewCheck[] = [];
  const refs = collectLinkRefs(markdown, fenced);
  for (const ref of refs) {
    if (!isLocalFileHref(ref.href)) continue;
    const resolved = resolveReference(baseUri, ref.href);
    if (resolved.type !== 'local') continue;
    checks.push({ line: ref.line, type: 'broken-link', message: `Link target not found: ${ref.href}`, targetUri: resolved.uri });
  }
  return checks;
}

export function findAllChecks(markdown: string, baseUri: string): PreviewCheck[] {
  const lines = markdown.split(/\r?\n/);
  const fenced = getCodeFencedLines(markdown);
  const startLine = getFrontMatterLineCount(markdown);
  const bodyLines = lines.slice(startLine);
  const bodyFenced = new Set<number>();
  for (const line of fenced) {
    if (line >= startLine) {
      bodyFenced.add(line - startLine);
    }
  }

  const checks: PreviewCheck[] = [];
  checks.push(...findEmptyHeadings(bodyLines, bodyFenced).map((c) => ({ ...c, line: c.line + startLine })));
  checks.push(...findHeadingLevelSkips(bodyLines, bodyFenced).map((c) => ({ ...c, line: c.line + startLine })));
  checks.push(...findDuplicateHeadings(bodyLines, bodyFenced).map((c) => ({ ...c, line: c.line + startLine })));
  checks.push(...findMissingAltText(bodyLines, bodyFenced).map((c) => ({ ...c, line: c.line + startLine })));
  const bodyMarkdown = bodyLines.join('\n');
  checks.push(...findMissingImages(bodyMarkdown, bodyFenced, baseUri).map((c) => ({ ...c, line: c.line + startLine })));
  checks.push(...findBrokenLinks(bodyMarkdown, bodyFenced, baseUri).map((c) => ({ ...c, line: c.line + startLine })));
  return checks;
}
