import * as vscode from "vscode";
import { EDITOR_UPDATE_DEBOUNCE_MS } from "./core/constants";
import { exportHtml } from "./core/export";
import { getWorkbenchConfig } from "./core/config";
import { MarkdownFormattingProvider } from "./formatting/MarkdownFormattingProvider";
import { MarkdownPreviewEditorProvider } from "./preview/MarkdownPreviewEditorProvider";
import { MarkdownWorkbenchPanel } from "./preview/MarkdownWorkbenchPanel";
import { PREVIEW_EDITOR_VIEW_TYPE } from "./preview/constants";
import type { PreviewMode } from "./types";

export function activate(context: vscode.ExtensionContext): void {
	try {
		const diagnosticCollection = vscode.languages.createDiagnosticCollection(
			"markdown-preview-lite",
		);
		const panel = new MarkdownWorkbenchPanel(context, diagnosticCollection);
		const previewEditorProvider = new MarkdownPreviewEditorProvider(panel);
		const formattingProvider = new MarkdownFormattingProvider();
		const updateDebounces = new Map<string, NodeJS.Timeout>();
		const revealDirectPreview = async (
			toggleActivePreview = true,
		): Promise<void> => {
			if (toggleActivePreview && panel.isActiveInlinePreview()) {
				await panel.showSourceForActivePreview();
				return;
			}

			const editor = vscode.window.activeTextEditor;
			if (editor?.document.languageId === "markdown") {
				await vscode.commands.executeCommand(
					"reopenActiveEditorWith",
					PREVIEW_EDITOR_VIEW_TYPE,
				);
				return;
			}

			const sourceUri = panel.getActiveSourceUri();
			if (!sourceUri) {
				void vscode.window.showInformationMessage(
					"Open a Markdown file to use Markdown Preview Lite.",
				);
				return;
			}

			const sourceColumn =
				editor?.document.uri.toString() === sourceUri.toString()
					? editor.viewColumn
					: panel.getSourceViewColumn(sourceUri);
			await vscode.commands.executeCommand(
				"vscode.openWith",
				sourceUri,
				PREVIEW_EDITOR_VIEW_TYPE,
				sourceColumn ?? vscode.ViewColumn.Active,
			);
		};

		const revealPreview = async (modeOverride?: PreviewMode): Promise<void> => {
			if (
				modeOverride === "inline" ||
				(!modeOverride && getWorkbenchConfig().previewMode === "inline")
			) {
				await revealDirectPreview(modeOverride === undefined);
				return;
			}

			const didReveal = await panel.revealActive(modeOverride);
			if (!didReveal) {
				void vscode.window.showInformationMessage(
					"Open a Markdown file to use Markdown Preview Lite.",
				);
			}
		};

		const cleanupDebounces = () => {
			for (const timer of updateDebounces.values()) {
				clearTimeout(timer);
			}
			updateDebounces.clear();
		};

		context.subscriptions.push(
			{ dispose: cleanupDebounces },
			diagnosticCollection,
			panel,
			vscode.window.registerCustomEditorProvider(
				PREVIEW_EDITOR_VIEW_TYPE,
				previewEditorProvider,
				{ webviewOptions: { retainContextWhenHidden: true } },
			),
			vscode.window.registerWebviewPanelSerializer(
				"markdown-lint.preview",
				panel,
			),
			vscode.languages.registerDocumentFormattingEditProvider(
				{ language: "markdown" },
				formattingProvider,
			),
			vscode.commands.registerCommand("markdown-lint.openPreview", async () => {
				await revealPreview();
			}),
			vscode.commands.registerCommand(
				"markdown-lint.openPreviewInline",
				async () => {
					await revealPreview("inline");
				},
			),
			vscode.commands.registerCommand(
				"markdown-lint.openPreviewToSide",
				async () => {
					await revealPreview("beside");
				},
			),
			vscode.commands.registerCommand(
				"markdown-lint.formatDocument",
				async () => {
					await panel.formatActiveDocument();
				},
			),
			vscode.commands.registerCommand("markdown-lint.refreshToc", async () => {
				await panel.update(vscode.window.activeTextEditor);
			}),
			vscode.commands.registerCommand("markdown-lint.exportHtml", async () => {
				const editor = vscode.window.activeTextEditor;
				if (editor?.document.languageId === "markdown") {
					await exportHtml(editor.document, context);
					return;
				}

				const sourceUri = panel.getActiveSourceUri();
				if (!sourceUri) {
					void vscode.window.showInformationMessage(
						"Open a Markdown file to export.",
					);
					return;
				}

				await exportHtml(
					await vscode.workspace.openTextDocument(sourceUri),
					context,
				);
			}),
			vscode.commands.registerCommand(
				"markdown-lint.reopenAsSource",
				async () => {
					const didReveal = await panel.showSourceForActivePreview();
					if (!didReveal) {
						void vscode.window.showInformationMessage(
							"Open a Markdown preview first.",
						);
					}
				},
			),
			vscode.window.onDidChangeActiveTextEditor(
				async (editor: vscode.TextEditor | undefined) => {
					await panel.update(editor);
				},
			),
			vscode.workspace.onDidChangeTextDocument(
				(event: vscode.TextDocumentChangeEvent) => {
					if (event.document.languageId !== "markdown") {
						return;
					}

					const key = event.document.uri.toString();
					const existing = updateDebounces.get(key);
					if (existing) {
						clearTimeout(existing);
					}
					const timer = setTimeout(() => {
						updateDebounces.delete(key);
						void panel.updateDocument(event.document);
					}, EDITOR_UPDATE_DEBOUNCE_MS);
					updateDebounces.set(key, timer);
				},
			),
			vscode.workspace.onDidChangeConfiguration(
				async (event: vscode.ConfigurationChangeEvent) => {
					if (!event.affectsConfiguration("markdown-lint")) {
						return;
					}

					await panel.updateAll();
				},
			),
			vscode.window.onDidChangeActiveColorTheme(async () => {
				await panel.updateAll();
			}),
			vscode.window.onDidChangeTextEditorVisibleRanges(
				(event: vscode.TextEditorVisibleRangesChangeEvent) => {
					if (event.textEditor.document.languageId !== "markdown") {
						return;
					}

					if (panel.isSyncingFromPreview(event.textEditor.document)) {
						return;
					}

					const ranges = event.visibleRanges;
					if (ranges.length === 0) {
						return;
					}

					const topLine = ranges[0].start.line;
					panel.postVisibleLineRange(event.textEditor.document, topLine);
				},
			),
		);
	} catch (err) {
		console.error("[markdown-lint] activate error:", err);
		throw err;
	}
}

export function deactivate(): void {}
