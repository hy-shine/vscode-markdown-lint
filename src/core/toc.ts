import { TocItem } from '../types';
import { getCodeFencedLines } from './codeFence';

export function extractToc(markdown: string): TocItem[] {
  const slugCounts = new Map<string, number>();
  const items: TocItem[] = [];
  const lines = markdown.split(/\r?\n/);
  const fenced = getCodeFencedLines(markdown);
  const startLine = getFrontMatterLineCount(markdown);

  for (let i = startLine; i < lines.length; i++) {
    if (fenced.has(i)) {
      continue;
    }

    const match = lines[i].match(/^(#{1,6})\s+(.+?)\s*$/);
    if (!match) {
      continue;
    }

    const level = match[1].length;
    const text = normalizeHeadingText(match[2].trim().replace(/\s+#+\s*$/, '').trim());
    const base = slugify(text);

    const count = slugCounts.get(base) ?? 0;
    slugCounts.set(base, count + 1);
    const slug = count === 0 ? base : `${base}-${count}`;

    items.push({
      level,
      text,
      line: i,
      slug,
    });
  }

  return items;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function normalizeHeadingText(value: string): string {
  return value
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/<[^>]+>/g, '')
    .trim();
}

export function getFrontMatterLineCount(markdown: string): number {
  const normalized = markdown.charCodeAt(0) === 0xfeff ? markdown.slice(1) : markdown;
  const match = normalized.match(/^---\r?\n([\s\S]*?)\r?\n(?:---|\.\.\.)\r?\n?/);
  if (!match) {
    return 0;
  }

  const body = match[1];
  const bodyLines = body.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (bodyLines.length === 0) {
    return 0;
  }

  const isYamlLike = bodyLines.every((line) => {
    const trimmed = line.trim();
    return /^#/.test(trimmed)
      || /^[A-Za-z0-9_.-]+\s*:/.test(trimmed)
      || /^-\s+/.test(trimmed)
      || /^\s+/.test(line);
  });

  if (!isYamlLike) {
    return 0;
  }

  return match[0].replace(/\r?\n$/, '').split(/\r?\n/).length;
}
