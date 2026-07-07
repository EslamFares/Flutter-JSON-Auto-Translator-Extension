import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import translate from 'google-translate-api-x';
import { appendKeyToJsonFile, DuplicateKeyError } from './jsonUtils';

const EXTENSION_ID = 'flutterJsonAutoTranslator';

export interface SyncResult {
  updated: string[];
  skipped: string[];
  failed: { file: string; reason: string }[];
}

export interface SyncOptions {
  sourceLocaleValue?: string;
  fromLanguage?: string;
}

/**
 * Extract language code from a locale filename (e.g. ar-EG.json -> ar).
 * //& استخراج رمز اللغة من اسم ملف الترجمة
 */
export function getLanguageCodeFromFilename(filename: string): string {
  const baseName = path.basename(filename, '.json');
  return baseName.split('-')[0].toLowerCase();
}

/**
 * Resolve the translations directory inside the workspace.
 * //& العثور على مجلد الترجمات داخل مساحة العمل
 */
export function findTranslationsDirectory(): string | undefined {
  const config = vscode.workspace.getConfiguration(EXTENSION_ID);
  const relativePath = config.get<string>('translationsPath', 'assets/translations');

  for (const folder of vscode.workspace.workspaceFolders ?? []) {
    const fullPath = path.join(folder.uri.fsPath, relativePath);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
      return fullPath;
    }
  }

  return undefined;
}

/**
 * List all JSON translation files in the translations directory.
 * //& إرجاع قائمة بجميع ملفات JSON في مجلد الترجمات
 */
export function listTranslationFiles(translationsDir: string): string[] {
  return fs
    .readdirSync(translationsDir)
    .filter((file) => file.endsWith('.json'))
    .map((file) => path.join(translationsDir, file))
    .sort((a, b) => path.basename(a).localeCompare(path.basename(b)));
}

/**
 * Translate text to the target language using google-translate-api-x.
 * //& ترجمة النص إلى اللغة المطلوبة
 */
async function translateText(text: string, toLanguage: string, fromLanguage?: string): Promise<string> {
  const params: Record<string, unknown> = {
    to: toLanguage,
    forceTo: true,
  };
  if (fromLanguage) {
    params.from = fromLanguage;
  }
  const result = await translate(text, params);
  return result.text;
}

/**
 * Sync the selected string to all translation JSON files.
 * //& مزامنة النص المحدد مع جميع ملفات الترجمة
 */
export async function syncTranslationToAllLangs(
  sourceText: string,
  jsonKey: string,
  options?: SyncOptions
): Promise<SyncResult> {
  const config = vscode.workspace.getConfiguration(EXTENSION_ID);
  const sourceLocaleFile = config.get<string>('sourceLocaleFile', 'en-US.json');

  const translationsDir = findTranslationsDirectory();
  if (!translationsDir) {
    throw new Error(
      'Could not find assets/translations directory. Check flutterJsonAutoTranslator.translationsPath setting.'
    );
  }

  const files = listTranslationFiles(translationsDir);
  if (files.length === 0) {
    throw new Error(`No JSON files found in ${translationsDir}`);
  }

  const result: SyncResult = {
    updated: [],
    skipped: [],
    failed: [],
  };

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Translating localization files',
      cancellable: false,
    },
    async (progress) => {
      for (let index = 0; index < files.length; index++) {
        const filePath = files[index];
        const fileName = path.basename(filePath);
        progress.report({
          message: `${index + 1}/${files.length}: ${fileName}`,
          increment: 100 / files.length,
        });

        try {
          let translatedValue: string;

          if (fileName === sourceLocaleFile) {
            translatedValue = options?.sourceLocaleValue ?? sourceText;
          } else {
            const languageCode = getLanguageCodeFromFilename(fileName);
            translatedValue = await translateText(sourceText, languageCode, options?.fromLanguage);
          }

          appendKeyToJsonFile(filePath, jsonKey, translatedValue);
          result.updated.push(fileName);
        } catch (error) {
          if (error instanceof DuplicateKeyError) {
            result.skipped.push(fileName);
            continue;
          }

          const reason =
            error instanceof Error ? error.message : 'Unknown translation error';
          result.failed.push({ file: fileName, reason });
        }
      }
    }
  );

  return result;
}
