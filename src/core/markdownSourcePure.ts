export function chooseMarkdownSource(
  isDirty: boolean,
  bufferText: string,
  diskText: string | undefined,
): string {
  if (isDirty) {
    return bufferText;
  }
  return diskText ?? bufferText;
}

export async function readDiskMarkdown(
  isDirty: boolean,
  readFile: () => PromiseLike<Uint8Array>,
): Promise<string | undefined> {
  if (isDirty) {
    return undefined;
  }
  try {
    return new TextDecoder('utf-8').decode(await readFile());
  } catch {
    return undefined; // 读盘失败时回退到缓冲区
  }
}
