/**
 * 导出引擎
 * 将表单数据导出为 XML 格式
 */

import type {
  ConditionNode,
  CheckData,
  FormData
} from '../types';

/**
 * 导出引擎
 */
export class ExportEngine {
  /**
   * 导出为 XML
   */
  exportToXml(data: FormData, options: ExportOptions = {}): string {
    const { pretty = true, indent = '  ' } = options;

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<validator>\n';

    // 导出全局条件
    if (data.globalCondition) {
      xml += `${indent}<!-- 全局条件 -->\n`;
      xml += `${indent}<condition>\n`;
      xml += this.exportCondition(data.globalCondition, indent + indent);
      xml += `${indent}</condition>\n`;
    }

    // 导出检查规则
    xml += `${indent}<!-- 检查规则 -->\n`;
    data.checks.forEach(check => {
      xml += this.exportCheck(check, indent);
    });

    xml += '</validator>';

    return xml;
  }

  /**
   * 导出检查规则
   */
  private exportCheck(check: CheckData, indent: string): string {
    let xml = `${indent}<check`;

    // 添加属性
    if (check.id) {
      xml += ` id="${check.id}"`;
    }
    if (check.errorCode) {
      xml += ` errorCode="${check.errorCode}"`;
    }
    if (check.errorDescription) {
      xml += ` errorDescription="${this.escapeXml(check.errorDescription)}"`;
    }
    if (check.severity !== undefined) {
      xml += ` severity="${check.severity}"`;
    }

    // 如果有条件，开始标签不关闭
    if (check.condition) {
      xml += '>\n';
      xml += this.exportCondition(check.condition, indent + indent);
      xml += `${indent}</check>\n`;
    } else {
      xml += '/>\n';
    }

    return xml;
  }

  /**
   * 导出条件
   */
  private exportCondition(condition: ConditionNode, indent: string): string {
    let xml = '';

    switch (condition.type) {
      case 'simple':
        xml += this.exportSimpleCondition(condition, indent);
        break;
      case 'and':
        xml += this.exportAndCondition(condition, indent);
        break;
      case 'or':
        xml += this.exportOrCondition(condition, indent);
        break;
      case 'not':
        xml += this.exportNotCondition(condition, indent);
        break;
      case 'if':
        xml += this.exportIfCondition(condition, indent);
        break;
      case 'expr':
        xml += this.exportExprCondition(condition, indent);
        break;
    }

    return xml;
  }

  /**
   * 导出简单条件
   */
  private exportSimpleCondition(condition: ConditionNode, indent: string): string {
    if (!condition.operator) {
      return '';
    }

    let xml = `${indent}<${condition.operator}`;

    // 添加字段属性
    if (condition.field) {
      xml += ` name="${condition.field}"`;
    }

    // 根据运算符添加相应的属性
    switch (condition.operator) {
      case 'eq':
      case 'ne':
      case 'gt':
      case 'ge':
      case 'lt':
      case 'le':
      case 'contains':
      case 'startsWith':
      case 'endsWith':
      case 'regex':
        if (condition.value !== undefined) {
          if (condition.operator === 'regex') {
            xml += ` pattern="${this.escapeXml(condition.value)}"`;
          } else {
            xml += ` value="${this.escapeXml(condition.value)}"`;
          }
        }
        break;

      case 'between':
      case 'lengthBetween':
      case 'utf8LengthBetween':
        if (condition.min !== undefined) {
          xml += ` min="${condition.min}"`;
        }
        if (condition.max !== undefined) {
          xml += ` max="${condition.max}"`;
        }
        break;

      case 'dateBetween':
      case 'timeBetween':
      case 'dateTimeBetween':
      case 'yearBetween':
        if (condition.min !== undefined) {
          xml += ` min="${condition.min}"`;
        }
        if (condition.max !== undefined) {
          xml += ` max="${condition.max}"`;
        }
        break;

      case 'in':
      case 'notIn':
        if (condition.value !== undefined) {
          xml += ` value="${this.escapeXml(condition.value)}"`;
        }
        break;
    }

    xml += '/>\n';

    return xml;
  }

  /**
   * 导出 AND 条件
   */
  private exportAndCondition(condition: ConditionNode, indent: string): string {
    let xml = `${indent}<and>\n`;

    if (condition.conditions && condition.conditions.length > 0) {
      condition.conditions.forEach(subCondition => {
        xml += this.exportCondition(subCondition, indent + indent);
      });
    }

    xml += `${indent}</and>\n`;

    return xml;
  }

  /**
   * 导出 OR 条件
   */
  private exportOrCondition(condition: ConditionNode, indent: string): string {
    let xml = `${indent}<or>\n`;

    if (condition.conditions && condition.conditions.length > 0) {
      condition.conditions.forEach(subCondition => {
        xml += this.exportCondition(subCondition, indent + indent);
      });
    }

    xml += `${indent}</or>\n`;

    return xml;
  }

  /**
   * 导出 NOT 条件
   */
  private exportNotCondition(condition: ConditionNode, indent: string): string {
    let xml = `${indent}<not>\n`;

    if (condition.conditions && condition.conditions.length > 0) {
      xml += this.exportCondition(condition.conditions[0], indent + indent);
    }

    xml += `${indent}</not>\n`;

    return xml;
  }

  /**
   * 导出 IF 条件
   */
  private exportIfCondition(condition: ConditionNode, indent: string): string {
    let xml = '';

    // IF 标签
    if (condition.test) {
      xml += `${indent}<if test="${this.escapeXml(condition.test)}">\n`;

      // THEN 分支
      if (condition.then) {
        xml += this.exportCondition(condition.then, indent + indent);
      }

      // ELSE/ELIF 分支
      if (condition.else) {
        if (condition.else.type === 'elif') {
          xml += `${indent}<elif test="${this.escapeXml(condition.else.test || '')}">\n`;
          xml += this.exportCondition(condition.else, indent + indent);
          xml += `${indent}</elif>\n`;
        } else {
          xml += `${indent}<else>\n`;
          xml += this.exportCondition(condition.else, indent + indent);
          xml += `${indent}</else>\n`;
        }
      }

      xml += `${indent}</if>\n`;
    }

    return xml;
  }

  /**
   * 导出表达式条件
   */
  private exportExprCondition(condition: ConditionNode, indent: string): string {
    let xml = `${indent}<expr>`;

    if (condition.value !== undefined) {
      xml += this.escapeXml(condition.value);
    }

    xml += '</expr>\n';

    return xml;
  }

  /**
   * 导出为 JSON
   */
  exportToJson(data: FormData): string {
    return JSON.stringify(data, null, 2);
  }

  /**
   * 导出为树形结构
   */
  exportToTree(data: FormData): any {
    return {
      type: 'validator',
      globalCondition: data.globalCondition ? this.conditionToTree(data.globalCondition) : undefined,
      checks: data.checks.map(check => ({
        ...check,
        condition: check.condition ? this.conditionToTree(check.condition) : undefined
      }))
    };
  }

  /**
   * 条件转树形结构
   */
  private conditionToTree(condition: ConditionNode): any {
    const tree: any = {
      id: condition.id,
      type: condition.type
    };

    if (condition.field) tree.field = condition.field;
    if (condition.operator) tree.operator = condition.operator;
    if (condition.value !== undefined) tree.value = condition.value;
    if (condition.min !== undefined) tree.min = condition.min;
    if (condition.max !== undefined) tree.max = condition.max;
    if (condition.pattern) tree.pattern = condition.pattern;
    if (condition.test) tree.test = condition.test;

    if (condition.conditions && condition.conditions.length > 0) {
      tree.conditions = condition.conditions.map(c => this.conditionToTree(c));
    }

    if (condition.then) {
      tree.then = this.conditionToTree(condition.then);
    }

    if (condition.else) {
      tree.else = this.conditionToTree(condition.else);
    }

    return tree;
  }

  /**
   * 转义 XML 特殊字符
   */
  private escapeXml(text: any): string {
    if (text === null || text === undefined) {
      return ''
    }
    
    const strText = String(text)
    return strText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * 验证 XML
   */
  validateXml(xml: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 基本验证
    if (!xml || xml.trim().length === 0) {
      errors.push('XML 内容为空');
    }

    // 检查 XML 声明
    if (!xml.includes('<?xml')) {
      errors.push('缺少 XML 声明');
    }

    // 检查根元素
    if (!xml.includes('<validator>') || !xml.includes('</validator>')) {
      errors.push('缺少根元素 <validator>');
    }

    // 检查标签匹配（简单检查）
    const openTags = xml.match(/<([a-zA-Z][a-zA-Z0-9]*)/g) || [];
    const closeTags = xml.match(/<\/([a-zA-Z][a-zA-Z0-9]*)>/g) || [];

    if (openTags.length !== closeTags.length) {
      errors.push('标签不匹配');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 格式化 XML
   */
  formatXml(xml: string, indent: string = '  '): string {
    let formatted = '';
    let pad = 0;
    const tokens = xml.match(/<[^>]+>|[^<]+/g) || [];

    tokens.forEach(token => {
      if (token.match(/^<\//)) {
        pad -= 1;
      }

      formatted += indent.repeat(pad) + token + '\n';

      if (token.match(/^<[^\/!][^>]*[^\/]>$/)) {
        pad += 1;
      }
    });

    return formatted;
  }

  /**
   * 压缩 XML
   */
  minifyXml(xml: string): string {
    return xml
      .replace(/>\s+</g, '><')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

/**
 * 导出选项
 */
export interface ExportOptions {
  /** 是否格式化 */
  pretty?: boolean;
  /** 缩进字符 */
  indent?: string;
  /** 是否包含注释 */
  includeComments?: boolean;
  /** 编码 */
  encoding?: string;
}