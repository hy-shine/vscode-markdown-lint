import * as vscode from 'vscode';
import { PreviewCheck } from '../types';
import { findAllChecks } from './previewChecksPure';

export async function runPreviewChecks(markdown: string, documentUri: vscode.Uri): Promise<PreviewCheck[]> {
  const baseUri = vscode.Uri.joinPath(documentUri, '..').toString();
  const allChecks = findAllChecks(markdown, baseUri);
  const finalChecks: PreviewCheck[] = [];

  for (const check of allChecks) {
    if ((check.type === 'missing-image' || check.type === 'broken-link') && check.targetUri) {
      try {
        const targetUri = vscode.Uri.parse(check.targetUri);
        await vscode.workspace.fs.stat(targetUri);
        // File exists, so do nothing (i.e. do not push the error)
      } catch (e) {
        // File doesn't exist or other error, keep the error check
        finalChecks.push(check);
      }
    } else {
      finalChecks.push(check);
    }
  }

  return finalChecks;
}

export { findEmptyHeadings, findHeadingLevelSkips, findDuplicateHeadings, findMissingAltText } from './previewChecksPure';
