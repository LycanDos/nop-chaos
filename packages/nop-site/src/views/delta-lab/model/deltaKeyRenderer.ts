/**
 * Delta key分段渲染工具
 * 用于在tree模式下实现类似源码模式的语法高亮效果
 */

export interface DeltaKeySegment {
  type: 'directive' | 'path' | 'bracket' | 'operator' | 'number' | 'selector-string' | 'dot' | 'other';
  text: string;
  start: number;
  end: number;
}

function isIdentifierStart(char: string): boolean {
  return /[A-Za-z_]/.test(char);
}

function isIdentifierPart(char: string): boolean {
  return /[A-Za-z0-9_-]/.test(char);
}

/**
 * 判断字符串是否是Delta路径key
 */
export function isDeltaLikeKey(key: string): boolean {
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

/**
 * 将Delta key解析为带类型的分段
 */
export function parseDeltaKeySegments(key: string): DeltaKeySegment[] {
  const segments: DeltaKeySegment[] = [];
  let index = 0;

  while (index < key.length) {
    const current = key[index];

    // 指令：$开头的标识符
    if (current === '$') {
      let end = index + 1;
      while (end < key.length && isIdentifierPart(key[end])) {
        end += 1;
      }
      segments.push({
        type: 'directive',
        text: key.substring(index, end),
        start: index,
        end,
      });
      index = end;
      continue;
    }

    // 选择器字符串：单引号包裹
    if (current === "'") {
      let end = index + 1;
      while (end < key.length) {
        if (key[end] === "'" && key[end - 1] !== '\\') {
          end += 1;
          break;
        }
        end += 1;
      }
      segments.push({
        type: 'selector-string',
        text: key.substring(index, end),
        start: index,
        end,
      });
      index = end;
      continue;
    }

    // 数字
    if (/\d/.test(current)) {
      let end = index + 1;
      while (end < key.length && /\d/.test(key[end])) {
        end += 1;
      }
      segments.push({
        type: 'number',
        text: key.substring(index, end),
        start: index,
        end,
      });
      index = end;
      continue;
    }

    // 标识符（路径部分）
    if (isIdentifierStart(current)) {
      let end = index + 1;
      while (end < key.length && isIdentifierPart(key[end])) {
        end += 1;
      }
      segments.push({
        type: 'path',
        text: key.substring(index, end),
        start: index,
        end,
      });
      index = end;
      continue;
    }

    // 括号
    if ('[]()'.includes(current)) {
      segments.push({
        type: 'bracket',
        text: current,
        start: index,
        end: index + 1,
      });
      index += 1;
      continue;
    }

    // 双字符操作符
    if (
      key.startsWith('+>', index) ||
      key.startsWith('->', index) ||
      key.startsWith('>=', index) ||
      key.startsWith('<=', index) ||
      key.startsWith('!=', index)
    ) {
      segments.push({
        type: 'operator',
        text: key.substring(index, index + 2),
        start: index,
        end: index + 2,
      });
      index += 2;
      continue;
    }

    // 点号或其他操作符
    if ('.:=+-><,'.includes(current)) {
      const type = current === '.' ? 'dot' : 'operator';
      segments.push({
        type,
        text: current,
        start: index,
        end: index + 1,
      });
      index += 1;
      continue;
    }

    // 其他字符
    segments.push({
      type: 'other',
      text: current,
      start: index,
      end: index + 1,
    });
    index += 1;
  }

  return segments;
}

/**
 * 将分段转换为带高亮的HTML字符串
 */
export function renderDeltaKeyAsHtml(key: string): string {
  if (!isDeltaLikeKey(key)) {
    return escapeHtml(key);
  }

  const segments = parseDeltaKeySegments(key);
  return segments
    .map((segment) => {
      const escapedText = escapeHtml(segment.text);
      return `<span class="delta-key-token delta-key-token--${segment.type}">${escapedText}</span>`;
    })
    .join('');
}

/**
 * 转义HTML特殊字符
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 获取括号对应的配对索引
 * @param segments 分段数组
 * @param bracketIndex 当前括号的索引
 * @returns 配对括号的索引，如果没找到返回-1
 */
export function findMatchingBracket(segments: DeltaKeySegment[], bracketIndex: number): number {
  if (bracketIndex < 0 || bracketIndex >= segments.length || segments[bracketIndex].type !== 'bracket') {
    return -1;
  }

  const bracket = segments[bracketIndex].text;
  const pairs: Record<string, string> = {
    '[': ']',
    ']': '[',
    '(': ')',
    ')': '(',
  };

  const target = pairs[bracket];
  if (!target) {
    return -1;
  }

  // 判断是左括号还是右括号
  const isOpening = bracket === '[' || bracket === '(';
  const direction = isOpening ? 1 : -1;
  const startIndex = bracketIndex + direction;
  const endIndex = isOpening ? segments.length : -1;

  let depth = 1;
  for (let i = startIndex; i !== endIndex; i += direction) {
    if (segments[i].type !== 'bracket') {
      continue;
    }

    if (segments[i].text === bracket) {
      depth += 1;
    } else if (segments[i].text === target) {
      depth -= 1;
      if (depth === 0) {
        return i;
      }
    }
  }

  return -1;
}
