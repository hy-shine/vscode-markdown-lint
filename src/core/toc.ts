import { TocItem } from '../types';

export function extractToc(markdown: string): TocItem[] {
  const slugCounts = new Map<string, number>();
  const items: TocItem[] = [];
  const lines = markdown.split(/\r?\n/);
  
  let inCodeFence = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.match(/^```/)) {
      inCodeFence = !inCodeFence;
      continue;
    }
    
    if (inCodeFence) {
      continue;
    }
    
    const match = line.match(/^(#{1,6})\s+(.+?)\s*$/);
    if (!match) {
      continue;
    }
    
    const level = match[1].length;
    const text = match[2].trim();
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
