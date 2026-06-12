import { PreviewMode } from '../types';

export const DEFAULT_PREVIEW_MODE: PreviewMode = 'beside';

export function normalizePreviewMode(value: unknown): PreviewMode {
  return value === 'inline' || value === 'beside' ? value : DEFAULT_PREVIEW_MODE;
}

export function resolvePreviewMode(configuredMode: PreviewMode, override?: PreviewMode): PreviewMode {
  return override ?? configuredMode;
}
