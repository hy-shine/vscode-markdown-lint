import * as prettier from 'prettier';

export async function formatMarkdownDocument(markdown: string): Promise<string> {
  try {
    const formatted = await prettier.format(markdown, {
      parser: 'markdown',
      proseWrap: 'preserve',
      printWidth: 80,
    });
    return formatted;
  } catch (err) {
    console.error('[markdown-lint] Prettier formatting error:', err);
    return markdown;
  }
}
