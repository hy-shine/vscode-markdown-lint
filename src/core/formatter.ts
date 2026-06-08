export async function formatMarkdownDocument(markdown: string, filePath?: string): Promise<string> {
  try {
    const prettier = await import('prettier');
    const resolvedConfig = filePath ? await prettier.resolveConfig(filePath) : null;
    const formatted = await prettier.format(markdown, {
      ...(resolvedConfig ?? {}),
      parser: 'markdown',
      filepath: filePath,
      proseWrap: resolvedConfig?.proseWrap ?? 'preserve',
    });
    return formatted;
  } catch (err) {
    console.error('[markdown-lint] Prettier formatting error:', err);
    return markdown;
  }
}
