# FlutterLocaizationJsonTranslationAuto

VS Code extension that helps Flutter developers auto-translate and sync localization JSON files from selected Dart strings.

## Features

- Shows a **Code Action** (lightbulb) when you select a string in a Dart file
- Prompts for a JSON key (e.g. `welcome_message`)
- Finds all `.json` files in `assets/translations/`
- Writes the original text to `en-US.json`
- Translates into every other locale using `google-translate-api-x`
- Appends each new key-value pair at the bottom of each JSON file

## Project structure

```
.
├── package.json
├── esbuild.js
├── tsconfig.json
├── src/
│   ├── extension.ts          # Activation, Code Action, command
│   ├── localizationSync.ts   # Translation workflow
│   └── jsonUtils.ts          # JSON append helper
└── dist/
    └── extension.js          # Bundled output (generated)
```

## Setup

```bash
npm install
npm run compile
```

## Run in development

1. Open this folder in VS Code / Cursor.
2. Press `F5` to launch an Extension Development Host.
3. Open a Flutter project that contains `assets/translations/*.json`.
4. Open a Dart file, select a string, click the lightbulb, and choose **Translate to all langs**.

## Package as VSIX

```bash
npm install -g @vscode/vsce   # one-time
npm run package
vsce package
```

Install the generated `.vsix` file:

```bash
code --install-extension flutter-localization-json-translation-auto-0.1.0.vsix
```

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `flutterLocaizationJsonTranslationAuto.translationsPath` | `assets/translations` | Relative path to translation JSON files |
| `flutterLocaizationJsonTranslationAuto.sourceLocaleFile` | `en-US.json` | Source locale file (original text, no translation) |

## Example workflow

**Dart file**

```dart
Text('Welcome to our app')
```

1. Select `'Welcome to our app'` (or the inner text).
2. Choose **Translate to all langs**.
3. Enter key: `welcome_message`.

**Result in `assets/translations/ar-EG.json`**

```json
{
  "existing_key": "existing value",
  "welcome_message": "مرحبًا بكم في تطبيقنا"
}
```

## Notes

- Translation uses the free unofficial Google Translate client (`google-translate-api-x`). Network access is required.
- Language codes are derived from filenames: `ar-EG.json` → `ar`, `fr-FR.json` → `fr`.
- If a key already exists in a file, that file is skipped.
