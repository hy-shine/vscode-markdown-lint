import { resolveReference } from './localPaths';

export type PreviewLinkTarget =
  | { type: 'anchor'; fragment: string }
  | { type: 'external'; href: string }
  | { type: 'local'; uri: string; fragment?: string };

export function resolvePreviewLinkTarget(baseDirectoryUri: string, href: string): PreviewLinkTarget {
  const resolved = resolveReference(baseDirectoryUri, href);
  if (resolved.type !== 'local') {
    return resolved;
  }

  return resolved.fragment
    ? { ...resolved, fragment: decodeFragment(resolved.fragment) }
    : resolved;
}

function decodeFragment(fragment: string): string {
  try {
    return decodeURIComponent(fragment);
  } catch {
    return fragment;
  }
}
