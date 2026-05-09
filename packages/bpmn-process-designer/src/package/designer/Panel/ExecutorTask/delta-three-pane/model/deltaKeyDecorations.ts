import type { editor } from 'monaco-editor';

const PROPERTY_KEY_RE = /"((?:\\.|[^"\\])*)"(?=\s*:)/g;

function isDeltaLikeKey(key: string): boolean {
  return (
    key.startsWith('$') ||
    key.includes('.') ||
    key.includes('[') ||
    key.includes(']') ||
    key.includes('+') ||
    key.includes('-') ||
    key.includes("'") ||
    key.includes('=')
  );
}

function isIdentifierStart(char: string): boolean {
  return /[A-Za-z_]/.test(char);
}

function isIdentifierPart(char: string): boolean {
  return /[A-Za-z0-9_-]/.test(char);
}

function pushDecoration(
  model: editor.ITextModel,
  decorations: editor.IModelDeltaDecoration[],
  startOffset: number,
  endOffset: number,
  className: string
) {
  if (endOffset <= startOffset) {
    return;
  }

  decorations.push({
    range: {
      startLineNumber: model.getPositionAt(startOffset).lineNumber,
      startColumn: model.getPositionAt(startOffset).column,
      endLineNumber: model.getPositionAt(endOffset).lineNumber,
      endColumn: model.getPositionAt(endOffset).column,
    },
    options: {
      inlineClassName: className,
    },
  });
}

function collectKeySegmentDecorations(model: editor.ITextModel, key: string, keyStartOffset: number, decorations: editor.IModelDeltaDecoration[]) {
  pushDecoration(model, decorations, keyStartOffset, keyStartOffset + key.length, 'delta-monaco-token--delta-key');

  let index = 0;
  while (index < key.length) {
    const current = key[index];

    if (current === '$') {
      let end = index + 1;
      while (end < key.length && isIdentifierPart(key[end])) {
        end += 1;
      }
      pushDecoration(model, decorations, keyStartOffset + index, keyStartOffset + end, 'delta-monaco-token--directive');
      index = end;
      continue;
    }

    if (current === "'") {
      let end = index + 1;
      while (end < key.length) {
        if (key[end] === "'" && key[end - 1] !== '\\') {
          end += 1;
          break;
        }
        end += 1;
      }
      pushDecoration(model, decorations, keyStartOffset + index, keyStartOffset + end, 'delta-monaco-token--selector-string');
      index = end;
      continue;
    }

    if (/\d/.test(current)) {
      let end = index + 1;
      while (end < key.length && /\d/.test(key[end])) {
        end += 1;
      }
      pushDecoration(model, decorations, keyStartOffset + index, keyStartOffset + end, 'delta-monaco-token--number');
      index = end;
      continue;
    }

    if (isIdentifierStart(current)) {
      let end = index + 1;
      while (end < key.length && isIdentifierPart(key[end])) {
        end += 1;
      }
      pushDecoration(model, decorations, keyStartOffset + index, keyStartOffset + end, 'delta-monaco-token--path');
      index = end;
      continue;
    }

    if ('[]()'.includes(current)) {
      pushDecoration(model, decorations, keyStartOffset + index, keyStartOffset + index + 1, 'delta-monaco-token--bracket');
      index += 1;
      continue;
    }

    if (
      key.startsWith('+>', index) ||
      key.startsWith('->', index) ||
      key.startsWith('>=', index) ||
      key.startsWith('<=', index) ||
      key.startsWith('!=', index)
    ) {
      pushDecoration(model, decorations, keyStartOffset + index, keyStartOffset + index + 2, 'delta-monaco-token--operator');
      index += 2;
      continue;
    }

    if ('.:=+-><,'.includes(current)) {
      const className = current === '.' ? 'delta-monaco-token--dot' : 'delta-monaco-token--operator';
      pushDecoration(model, decorations, keyStartOffset + index, keyStartOffset + index + 1, className);
      index += 1;
      continue;
    }

    index += 1;
  }
}

export function buildDeltaKeyDecorations(model: editor.ITextModel): editor.IModelDeltaDecoration[] {
  const source = model.getValue();
  const decorations: editor.IModelDeltaDecoration[] = [];

  for (const match of source.matchAll(PROPERTY_KEY_RE)) {
    const key = match[1] ?? '';
    if (!isDeltaLikeKey(key) || match.index == null) {
      continue;
    }
    collectKeySegmentDecorations(model, key, match.index + 1, decorations);
  }

  return decorations;
}
