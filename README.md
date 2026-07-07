# Flutter JSON Auto-Translator

Auto-translate and sync Flutter localization JSON files from selected Dart strings. Supports both English and Arabic source text.

## Features

- Shows a **Code Action** (lightbulb) when you select a string in a Dart file
- Two commands: **Translate to all langs** (English) and **Translate to all langs From Ar** (Arabic)
- Translates Arabic text to English first for key suggestion, then to all target languages
- Prompts for a JSON key with auto-generated camelCase suggestion
- Finds all `.json` files in your translations directory
- Writes original text to the source locale file (e.g. `en-US.json`)
- Translates into every other locale using `google-translate-api-x`
- Appends each new key-value pair at the bottom of each JSON file

## How to Use

1. Open a Dart file in a Flutter project with `assets/translations/*.json`
2. Select a string literal (e.g. `'Welcome to our app'`) or Arabic text
3. Click the lightbulb or open the command palette
4. Choose:
   - **Translate to all langs** — for English source text
   - **Translate to all langs From Ar** — for Arabic source text (automatically translates to English for key suggestion)
5. Confirm or edit the suggested camelCase JSON key
6. Wait for translation to complete — all locale files are updated

### Example

```dart
Text('Welcome to our app')
```

1. Select `'Welcome to our app'`
2. Choose **Translate to all langs**
3. Enter key: `welcome_message`

**Result in `assets/translations/ar-EG.json`:**
```json
{
  "existing_key": "existing value",
  "welcome_message": "مرحبًا بكم في تطبيقنا"
}
```

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `flutterJsonAutoTranslator.translationsPath` | `assets/translations` | Relative path from workspace root to translation JSON files |
| `flutterJsonAutoTranslator.sourceLocaleFile` | `en-US.json` | Source locale filename — receives original text (or English translation for Arabic flow) |
| `flutterJsonAutoTranslator.abbreviateLongKeys` | `false` | When enabled, suggested keys use only the first N words for very long text |
| `flutterJsonAutoTranslator.maxKeyWords` | `5` | Maximum words to use in abbreviated keys (only when `abbreviateLongKeys` is enabled) |
| `flutterJsonAutoTranslator.stripSelection` | `true` | Strip surrounding quotes (`'`, `"`, `'''`, `"""`) and trailing semicolons from selected text |

## Requirements

- Flutter project with localization JSON files in a translations directory
- Network access (uses Google Translate API)

## Extension Settings

You can configure these in VS Code Settings → Extensions → Flutter JSON Auto-Translator, or in `.vscode/settings.json`.

## Known Issues

- Translation uses the free unofficial Google Translate client — rate limits may apply
- Language codes are derived from filenames: `ar-EG.json` → `ar`, `fr-FR.json` → `fr`
- If a key already exists in a file, that file is skipped

## Release Notes

### 0.1.4

- Added Arabic source text support ("Translate to all langs From Ar")
- Added key abbreviation settings (`abbreviateLongKeys`, `maxKeyWords`)
- Added selection stripping setting (`stripSelection`)

### 0.1.0

- Initial release with English translation and Code Action support
