import * as vscode from 'vscode';
import type { PreviewCheck } from '../types';
import { findAllChecks } from './previewChecksPure';
import { filterExistingTargetChecks } from './previewChecksTargetFilter';

export async function runPreviewChecks(markdown: string, documentUri: vscode.Uri): Promise<PreviewCheck[]> {
  const baseUri = vscode.Uri.joinPath(documentUri, '..').toString();
  const allChecks = findAllChecks(markdown, baseUri);

  return filterExistingTargetChecks(allChecks, async (targetUri) => {
    await vscode.workspace.fs.stat(vscode.Uri.parse(targetUri));
  });
}

export { findEmptyHeadings, findHeadingLevelSkips, findDuplicateHeadings, findMissingAltText } from './previewChecksPure';
