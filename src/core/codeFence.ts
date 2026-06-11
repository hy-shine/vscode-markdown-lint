const FENCE_RE = /^ {0,3}(`{3,}|~{3,})/;

export function getCodeFencedLines(markdown: string): Set<number> {
  const lines = markdown.split(/\r?\n/);
  const fenced = new Set<number>();
  let marker: '`' | '~' | undefined;
  let markerLength = 0;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(FENCE_RE);
    if (match) {
      const m = match[1][0] as '`' | '~';
      const len = match[1].length;
      if (!marker) {
        marker = m;
        markerLength = len;
        fenced.add(i);
        continue;
      }
      if (m === marker && len >= markerLength) {
        marker = undefined;
        markerLength = 0;
        fenced.add(i);
        continue;
      }
    }
    if (marker) {
      fenced.add(i);
    }
  }

  return fenced;
}
