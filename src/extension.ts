import * as vscode from 'vscode';
import { syncTranslationToAllLangs } from './localizationSync';

const COMMAND_ID = 'flutterLocaizationJsonTranslationAuto.translateToAllLangs';
const ACTION_TITLE = 'Translate to all langs';

/**
 * Extract a Dart/Flutter string literal from the current editor selection.
 * //& استخراج نص حرفي من التحديد الحالي في محرر Dart
 */
export function extractSelectedString(
  document: vscode.TextDocument,
  selection: vscode.Selection
): string | undefined {
  const selectedText = document.getText(selection).trim();
  if (!selectedText) {
    return undefined;
  }

  // Match quoted string literals: 'text' or "text"
  // //& مطابقة النصوص بين علامات اقتباس مفردة أو مزدوجة
  const quotedMatch = selectedText.match(/^(['"])(.*)\1$/s);
  if (quotedMatch) {
    return quotedMatch[2];
  }

  // Expand selection to surrounding quotes when user selects inner text only
  // //& توسيع التحديد ليشمل علامات الاقتباس عند تحديد النص الداخلي فقط
  const line = document.lineAt(selection.start.line).text;
  const startIndex = selection.start.character;
  const endIndex = selection.end.character;
  const before = line[startIndex - 1];
  const after = line[endIndex];

  if (
    (before === "'" && after === "'") ||
    (before === '"' && after === '"')
  ) {
    return selectedText;
  }

  // Accept plain selected text as a fallback
  // //& قبول النص المحدد مباشرة كحل بديل
  if (selectedText.length > 0) {
    return selectedText;
  }

  return undefined;
}

/**
 * Prompt the user for a JSON key and validate it.
 * //& مطالبة المستخدم بإدخال مفتاح JSON والتحقق منه
 */
async function promptForJsonKey(): Promise<string | undefined> {
  const jsonKey = await vscode.window.showInputBox({
    title: 'Flutter Localization Key',
    prompt: 'Enter the JSON key to add (e.g. welcome_message)',
    placeHolder: 'welcome_message',
    validateInput: (value) => {
      const trimmed = value.trim();
      if (!trimmed) {
        return 'Key cannot be empty.';
      }
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmed)) {
        return 'Use snake_case letters, numbers, and underscores only.';
      }
      return undefined;
    },
  });

  return jsonKey?.trim();
}

/**
 * Run the full translate-and-sync workflow.
 * //& تنفيذ سير عمل الترجمة والمزامنة بالكامل
 */
async function runTranslateToAllLangs(
  document: vscode.TextDocument,
  selection: vscode.Selection
): Promise<void> {
  if (document.languageId !== 'dart') {
    vscode.window.showWarningMessage('This action only works in Dart files.');
    return;
  }

  const sourceText = extractSelectedString(document, selection);
  if (!sourceText) {
    vscode.window.showWarningMessage(
      'Select a string literal in your Dart file first.'
    );
    return;
  }

  const jsonKey = await promptForJsonKey();
  if (!jsonKey) {
    return;
  }

  try {
    const result = await syncTranslationToAllLangs(sourceText, jsonKey);

    const summaryParts: string[] = [];
    if (result.updated.length > 0) {
      summaryParts.push(`Updated: ${result.updated.join(', ')}`);
    }
    if (result.skipped.length > 0) {
      summaryParts.push(`Skipped (key exists): ${result.skipped.join(', ')}`);
    }
    if (result.failed.length > 0) {
      summaryParts.push(
        `Failed: ${result.failed.map((item) => `${item.file} (${item.reason})`).join('; ')}`
      );
    }

    if (result.updated.length > 0) {
      vscode.window.showInformationMessage(
        `Localization synced for key "${jsonKey}". ${summaryParts.join(' | ')}`
      );
    } else if (result.skipped.length > 0 && result.failed.length === 0) {
      vscode.window.showWarningMessage(
        `Key "${jsonKey}" already exists in all translation files.`
      );
    } else {
      vscode.window.showErrorMessage(
        `Could not sync localization. ${summaryParts.join(' | ')}`
      );
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred.';
    vscode.window.showErrorMessage(`Translation failed: ${message}`);
  }
}

/**
 * Provides the lightbulb Code Action for selected Dart strings.
 * //& يوفر إجراء المصباح للنصوص المحددة في ملفات Dart
 */
class FlutterLocalizationCodeActionProvider implements vscode.CodeActionProvider {
  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext
  ): vscode.CodeAction[] | undefined {
    if (document.languageId !== 'dart') {
      return undefined;
    }

    const selection = normalizeSelection(range);
    if (selection.isEmpty) {
      return undefined;
    }

    const sourceText = extractSelectedString(document, selection);
    if (!sourceText) {
      return undefined;
    }

    const action = new vscode.CodeAction(
      ACTION_TITLE,
      vscode.CodeActionKind.QuickFix
    );
    action.command = {
      command: COMMAND_ID,
      title: ACTION_TITLE,
      arguments: [document.uri, selection],
    };
    action.isPreferred = true;

    return [action];
  }
}

function normalizeSelection(range: vscode.Range | vscode.Selection): vscode.Selection {
  if (range instanceof vscode.Selection) {
    return range;
  }

  return new vscode.Selection(range.start, range.end);
}

export function activate(context: vscode.ExtensionContext): void {
  // Register Code Action provider for Dart files
  // //& تسجيل مزود إجراءات التعليمات البرمجية لملفات Dart
  const codeActionProvider = new FlutterLocalizationCodeActionProvider();
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      { language: 'dart', scheme: 'file' },
      codeActionProvider,
      {
        providedCodeActionKinds: [vscode.CodeActionKind.QuickFix],
      }
    )
  );

  // Register command invoked by the Code Action
  // //& تسجيل الأمر الذي يُستدعى من إجراء المصباح
  context.subscriptions.push(
    vscode.commands.registerCommand(
      COMMAND_ID,
      async (uri: vscode.Uri, selection: vscode.Selection) => {
        const document = await vscode.workspace.openTextDocument(uri);
        await runTranslateToAllLangs(document, selection);
      }
    )
  );
}

export function deactivate(): void {
  // Nothing to clean up
  // //& لا يوجد تنظيف مطلوب عند إيقاف الإضافة
}
