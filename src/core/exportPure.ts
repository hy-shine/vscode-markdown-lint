import { fileURLToPath } from 'node:url';

export interface InlineLocalImageOptions {
  allowedRoot?: string;
  resolveRealPath?: (path: string) => Promise<string>;
}

/**
 * Replace local `file://` image sources with inline base64 data URIs.
 *
 * The {@link readFile} callback is invoked for each unique local image URI so
 * callers can inject whatever filesystem abstraction is appropriate (e.g.
 * `vscode.workspace.fs.readFile` in production, a test mock in unit tests).
 *
 * When {@link InlineLocalImageOptions.allowedRoot} is set, only `file://`
 * images inside that root are inlined; everything else is left unchanged.
 */
export async function inlineLocalImagesAsBase64(
  html: string,
  readFile: (uri: string) => Promise<Uint8Array>,
  options?: InlineLocalImageOptions,
): Promise<string> {
  const imgRegex = /<img\s+([^>]*?)src=(['"])([^"']+?)\2([^>]*?)>/gi;
  const rewrites = new Map<string, string>();

  for (const match of html.matchAll(imgRegex)) {
    const tag = match[0];
    const beforeSrc = match[1];
    const src = match[3];
    const afterSrc = match[4];
    if (!src.startsWith('file://') || rewrites.has(tag)) continue;
    if (!(await isWithinAllowedRoot(src, options))) continue;
    try {
      const data = await readFile(src);
      const ext = new URL(src).pathname.split('.').pop()?.toLowerCase() ?? '';
      const base64 = Buffer.from(data).toString('base64');
      const newSrc = `data:${getImageMime(ext)};base64,${base64}`;
      rewrites.set(tag, `<img ${beforeSrc}src="${newSrc}"${afterSrc}>`);
    } catch {
      // leave tag unchanged
    }
  }

  return rewrites.size > 0
    ? html.replace(imgRegex, (tag) => rewrites.get(tag) ?? tag)
    : html;
}

async function isWithinAllowedRoot(
  src: string,
  options?: InlineLocalImageOptions,
): Promise<boolean> {
  if (!options?.allowedRoot) {
    return true;
  }

  try {
    const root = await normalizePath(options.allowedRoot, options.resolveRealPath);
    const target = await normalizePath(src, options.resolveRealPath);
    if (root === '/') {
      return true;
    }
    return target === root || target.startsWith(`${root}/`);
  } catch {
    return false;
  }
}

async function normalizePath(
  uri: string,
  resolveRealPath?: (path: string) => Promise<string>,
): Promise<string> {
  let pathname = fileURLToPath(uri);
  if (resolveRealPath) {
    pathname = await resolveRealPath(pathname);
  }
  const normalized = pathname.replace(/\\/g, '/');
  if (normalized === '/') {
    return normalized;
  }
  return normalized
    .replace(/\/+$/, '')
    .replace(/^([a-zA-Z]):/, (_, drive: string) => `${drive.toLowerCase()}:`);
}

export function getImageMime(ext: string): string {
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'svg':
      return 'image/svg+xml';
    default:
      return 'application/octet-stream';
  }
}
