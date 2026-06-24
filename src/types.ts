export type ThemeMode = 'system' | 'light' | 'dark';

export type PreviewMode = 'inline' | 'beside';

export type PreviewStyle = 'default' | 'github' | 'notion' | 'tokyo-night' | 'obsidian' | 'paper' | 'typora';

export interface TocItem {
  level: number;
  text: string;
  line: number;
  slug: string;
}

export type PreviewCheckType =
  | 'missing-image'
  | 'broken-link'
  | 'missing-alt'
  | 'empty-heading'
  | 'heading-skip'
  | 'duplicate-heading';

export interface PreviewCheck {
  line: number;
  endLine?: number;
  type: PreviewCheckType;
  message: string;
  targetUri?: string;
}

export interface PreviewState {
  title: string;
  html: string;
  rawText: string;
  toc: TocItem[];
  themeMode: ThemeMode;
  previewMode: PreviewMode;
  previewStyle: PreviewStyle;
  tocVisible: boolean;
  baseUrl: string;
  checks: PreviewCheck[];
}
