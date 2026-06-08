import { TocItem } from '../types';

export function extractToc(markdown: string): TocItem[] {
  const slugCounts = new Map<string, number>();
  const items: TocItem[] = [];
  const lines = markdown.split(/\r?\n/);
  
  let codeFenceMarker: '`' | '~' | undefined;
  let codeFenceLength = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fenceMatch = line.match(/^ {0,3}(`{3,}|~{3,})/);

    if (fenceMatch) {
      const marker = fenceMatch[1][0] as '`' | '~';
      const length = fenceMatch[1].length;
      if (!codeFenceMarker) {
        codeFenceMarker = marker;
        codeFenceLength = length;
        continue;
      }
      if (marker === codeFenceMarker && length >= codeFenceLength) {
        codeFenceMarker = undefined;
        codeFenceLength = 0;
        continue;
      }
    }

    if (codeFenceMarker) {
      continue;
    }

    const match = line.match(/^(#{1,6})\s+(.+?)\s*$/);
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
