import { TocItem } from '../types';
import { slugify } from './toc';

export interface HeadingMeta {
  line: number;
  slug: string;
}

export function resolveHeadingMeta(toc: TocItem[], index: number, fallbackText: string): HeadingMeta {
  const tocItem = toc[index];
  if (tocItem) {
    return {
      line: tocItem.line,
      slug: tocItem.slug,
    };
  }

  return {
    line: 0,
    slug: slugify(stripHtml(fallbackText)),
  };
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, '');
}
