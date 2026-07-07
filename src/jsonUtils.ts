import * as fs from 'fs';

export class DuplicateKeyError extends Error {
  constructor(key: string) {
    super(`Key "${key}" already exists in the JSON file.`);
    this.name = 'DuplicateKeyError';
  }
}

/**
 * Append a new key-value pair at the bottom of a JSON file.
 * //& إضافة زوج مفتاح-قيمة جديد في أسفل ملف JSON
 */
export function appendKeyToJsonFile(
  filePath: string,
  key: string,
  value: string
): void {
  const content = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(content) as Record<string, unknown>;

  // Validate JSON is an object and the key does not already exist
  // //& التحقق من أن JSON كائن وأن المفتاح غير موجود مسبقاً
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Translation file must contain a JSON object.');
  }

  if (Object.prototype.hasOwnProperty.call(parsed, key)) {
    throw new DuplicateKeyError(key);
  }

  const trimmed = content.trimEnd();
  const lastBraceIndex = trimmed.lastIndexOf('}');
  if (lastBraceIndex === -1) {
    throw new Error('Invalid JSON: missing closing brace.');
  }

  const head = trimmed.slice(0, lastBraceIndex).trimEnd();
  const isEmptyObject = /^\{\s*$/.test(head);
  const keyJson = JSON.stringify(key);
  const valueJson = JSON.stringify(value);
  const entry = `  ${keyJson}: ${valueJson}`;

  let updated: string;
  if (isEmptyObject) {
    updated = `{\n${entry}\n}\n`;
  } else {
    const separator = head.endsWith(',') ? '\n' : ',\n';
    updated = `${head}${separator}${entry}\n}\n`;
  }

  fs.writeFileSync(filePath, updated, 'utf8');
}
