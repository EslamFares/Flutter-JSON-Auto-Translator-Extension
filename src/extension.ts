import * as vscode from 'vscode';
import translate from 'google-translate-api-x';
import { syncTranslationToAllLangs } from './localizationSync';

const COMMAND_ID = 'flutterLocaizationJsonTranslationAuto.translateToAllLangs';
const ACTION_TITLE = 'Translate to all langs';
const COMMAND_ID_AR = 'flutterLocaizationJsonTranslationAuto.translateToAllLangsFromAr';
const ACTION_TITLE_AR = 'Translate to all langs From Ar';

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
 * Generate a camelCase JSON key from selected text.
 * //& إنشاء مفتاح JSON بصيغة camelCase من النص المحدد
 * Examples: "My name Eslam" -> "myNameEslam", "Go" -> "go"
 */
export function suggestJsonKeyFromText(text: string, maxWords?: number): string {
  const words = text
    .trim()
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean);

  if (words.length === 0) {
    return '';
  }

  const limited = maxWords !== undefined && maxWords > 0
    ? words.slice(0, maxWords)
    : words;

  return limited
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (index === 0) {
        return lower;
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join('');
}

/**
 * Prompt the user for a JSON key and validate it.
 * //& مطالبة المستخدم بإدخال مفتاح JSON والتحقق منه
 */
async function promptForJsonKey(defaultKey: string): Promise<string | undefined> {
  const jsonKey = await vscode.window.showInputBox({
    title: 'Flutter Localization Key',
    prompt: 'Enter the JSON key to add (camelCase)',
    value: defaultKey,
    placeHolder: defaultKey || 'myNameEslam',
    validateInput: (value) => {
      const trimmed = value.trim();
      if (!trimmed) {
        return 'Key cannot be empty.';
      }
      if (!/^[a-z][a-zA-Z0-9]*$/.test(trimmed)) {
        return 'Use camelCase: start with a lowercase letter, then letters or numbers.';
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

  const config = vscode.workspace.getConfiguration('flutterLocaizationJsonTranslationAuto');
  const abbreviate = config.get<boolean>('abbreviateLongKeys', false);
  const maxWords = abbreviate ? config.get<number>('maxKeyWords', 5) : undefined;
  const jsonKey = await promptForJsonKey(suggestJsonKeyFromText(sourceText, maxWords));
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
 * Translate Arabic text to English for key generation.
 * //& ترجمة النص العربي إلى الإنجليزية لإنشاء المفتاح
 */
async function translateArabicToEnglish(arabicText: string): Promise<string> {
  const result = await translate(arabicText, { to: 'en', from: 'ar', forceTo: true });
  return result.text;
}

/**
 * Run the translate-and-sync workflow for Arabic source text.
 * //& تنفيذ سير عمل الترجمة للنص العربي
 */
async function runTranslateToAllLangsFromAr(
  document: vscode.TextDocument,
  selection: vscode.Selection
): Promise<void> {
  if (document.languageId !== 'dart') {
    vscode.window.showWarningMessage('This action only works in Dart files.');
    return;
  }

  const arabicText = extractSelectedString(document, selection);
  if (!arabicText) {
    vscode.window.showWarningMessage(
      'Select a string literal in your Dart file first.'
    );
    return;
  }

  let englishText: string;
  try {
    englishText = await translateArabicToEnglish(arabicText);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown translation error.';
    vscode.window.showErrorMessage(`Arabic to English translation failed: ${message}`);
    return;
  }

  const config = vscode.workspace.getConfiguration('flutterLocaizationJsonTranslationAuto');
  const abbreviate = config.get<boolean>('abbreviateLongKeys', false);
  const maxWords = abbreviate ? config.get<number>('maxKeyWords', 5) : undefined;
  const jsonKey = await promptForJsonKey(suggestJsonKeyFromText(englishText, maxWords));
  if (!jsonKey) {
    return;
  }

  try {
    const result = await syncTranslationToAllLangs(
      arabicText,
      jsonKey,
      { sourceLocaleValue: englishText, fromLanguage: 'ar' }
    );

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

    const actionEn = new vscode.CodeAction(
      ACTION_TITLE,
      vscode.CodeActionKind.QuickFix
    );
    actionEn.command = {
      command: COMMAND_ID,
      title: ACTION_TITLE,
      arguments: [document.uri, selection],
    };
    actionEn.isPreferred = true;

    const actionAr = new vscode.CodeAction(
      ACTION_TITLE_AR,
      vscode.CodeActionKind.QuickFix
    );
    actionAr.command = {
      command: COMMAND_ID_AR,
      title: ACTION_TITLE_AR,
      arguments: [document.uri, selection],
    };

    return [actionEn, actionAr];
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

  // Register command invoked by the Code Action or Command Palette
  // //& تسجيل الأمر الذي يُستدعى من إجراء المصباح أو لوحة الأوامر
  context.subscriptions.push(
    vscode.commands.registerCommand(
      COMMAND_ID,
      async (uri?: vscode.Uri, selection?: vscode.Selection) => {
        let document: vscode.TextDocument;
        let activeSelection: vscode.Selection;

        if (uri && selection) {
          // Invoked from Code Action with explicit document + selection
          // //& يُستدعى من إجراء المصباح مع المستند والتحديد
          document = await vscode.workspace.openTextDocument(uri);
          activeSelection = selection;
        } else {
          // Invoked from Command Palette — use the active editor
          // //& يُستدعى من لوحة الأوامر — استخدام المحرر النشط
          const editor = vscode.window.activeTextEditor;
          if (!editor) {
            vscode.window.showWarningMessage(
              'Open a Dart file and select a string first.'
            );
            return;
          }
          document = editor.document;
          activeSelection = editor.selection;
        }

        await runTranslateToAllLangs(document, activeSelection);
      }
    )
  );

  // Register Arabic command
  // //& تسجيل الأمر العربي
  context.subscriptions.push(
    vscode.commands.registerCommand(
      COMMAND_ID_AR,
      async (uri?: vscode.Uri, selection?: vscode.Selection) => {
        let document: vscode.TextDocument;
        let activeSelection: vscode.Selection;

        if (uri && selection) {
          document = await vscode.workspace.openTextDocument(uri);
          activeSelection = selection;
        } else {
          const editor = vscode.window.activeTextEditor;
          if (!editor) {
            vscode.window.showWarningMessage(
              'Open a Dart file and select a string first.'
            );
            return;
          }
          document = editor.document;
          activeSelection = editor.selection;
        }

        await runTranslateToAllLangsFromAr(document, activeSelection);
      }
    )
  );
}

export function deactivate(): void {
  // Nothing to clean up
  // //& لا يوجد تنظيف مطلوب عند إيقاف الإضافة
}
