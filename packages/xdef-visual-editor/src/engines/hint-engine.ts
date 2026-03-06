/**
 * 属性提示引擎
 * 提供智能字段提示、路径建议、中文映射等功能
 */

import type {
  FieldMapping,
  FieldInfo,
  FieldSuggestion,
  HintContext,
  HintConfig,
  MatchResult
} from '../types';

/**
 * 属性提示引擎
 */
export class HintEngine {
  /** 字段映射 */
  private fieldMapping: FieldMapping;
  /** 提示配置 */
  private config: HintConfig;
  /** 最近使用的字段 */
  private recentFields: FieldInfo[] = [];
  /** 最大历史记录数 */
  private maxRecentFields = 20;

  constructor(fieldMapping: FieldMapping, config: Partial<HintConfig> = {}) {
    this.fieldMapping = fieldMapping;
    this.config = {
      enabled: true,
      showDescriptions: true,
      showChineseNames: true,
      showPathPreview: true,
      autoComplete: true,
      fuzzySearch: true,
      ...config
    };
  }

  /**
   * 获取字段提示
   */
  getFieldSuggestions(
    input: string,
    context: HintContext
  ): FieldSuggestion[] {
    if (!this.config.enabled) {
      return [];
    }

    const suggestions: FieldSuggestion[] = [];

    // 1. 模糊搜索字段
    const matches = this.fuzzySearchFields(input, context);

    // 2. 按分数排序
    matches.sort((a, b) => b.score - a.score);

    // 3. 生成建议
    const maxSuggestions = 10;
    matches.slice(0, maxSuggestions).forEach(match => {
      suggestions.push(this.createSuggestion(match));
    });

    return suggestions;
  }

  /**
   * 模糊搜索字段
   */
  private fuzzySearchFields(
    input: string,
    context: HintContext
  ): MatchResult[] {
    const results: MatchResult[] = [];
    const lowerInput = input.toLowerCase();

    // 搜索全局字段
    this.fieldMapping.globalFields.forEach((field, path) => {
      const score = this.calculateMatchScore(input, field);
      if (score > 0) {
        results.push({
          field,
          score,
          matchedParts: this.getMatchedParts(input, field)
        });
      }
    });

    // 搜索实体字段
    this.fieldMapping.entities.forEach((entityMap, entityName) => {
      entityMap.fields.forEach((field, fieldName) => {
        const score = this.calculateMatchScore(input, field);
        if (score > 0) {
          results.push({
            field,
            score: score * 1.1, // 实体字段优先级稍高
            matchedParts: this.getMatchedParts(input, field)
          });
        }
      });
    });

    // 如果启用模糊搜索，添加模糊匹配结果
    if (this.config.fuzzySearch) {
      this.fieldMapping.globalFields.forEach((field, path) => {
        const fuzzyScore = this.calculateFuzzyScore(lowerInput, field.path.toLowerCase());
        if (fuzzyScore > 0 && fuzzyScore < 0.5) {
          results.push({
            field,
            score: fuzzyScore * 50,
            matchedParts: this.getMatchedParts(input, field)
          });
        }
      });
    }

    return results;
  }

  /**
   * 计算匹配分数
   */
  private calculateMatchScore(input: string, field: FieldInfo): number {
    let score = 0;
    const lowerInput = input.toLowerCase();

    // 1. 完全匹配路径
    if (field.path.toLowerCase() === lowerInput) {
      score += 100;
    }

    // 2. 匹配字段名
    if (field.name.toLowerCase().includes(lowerInput)) {
      score += 80;
    }

    // 3. 匹配中文名
    if (field.displayName.includes(input)) {
      score += 70;
    }

    // 4. 匹配别名
    field.aliases.forEach(alias => {
      if (alias.toLowerCase().includes(lowerInput)) {
        score += 60;
      }
    });

    // 5. 路径前缀匹配
    if (field.path.toLowerCase().startsWith(lowerInput)) {
      score += 50;
    }

    // 6. 路径部分匹配
    const pathParts = field.path.split('.');
    pathParts.forEach(part => {
      if (part.toLowerCase().includes(lowerInput)) {
        score += 40;
      }
    });

    return score;
  }

  /**
   * 计算模糊匹配分数
   */
  private calculateFuzzyScore(input: string, text: string): number {
    if (input.length === 0) return 0;

    let matchCount = 0;
    let inputIndex = 0;
    let textIndex = 0;

    while (inputIndex < input.length && textIndex < text.length) {
      if (text[textIndex] === input[inputIndex]) {
        matchCount++;
        inputIndex++;
      }
      textIndex++;
    }

    return matchCount / input.length;
  }

  /**
   * 获取匹配的部分
   */
  private getMatchedParts(input: string, field: FieldInfo): string[] {
    const parts: string[] = [];
    const lowerInput = input.toLowerCase();

    // 检查各部分是否匹配
    const pathParts = field.path.split('.');
    pathParts.forEach(part => {
      if (part.toLowerCase().includes(lowerInput)) {
        parts.push(part);
      }
    });

    // 检查中文名
    if (field.displayName.includes(input)) {
      parts.push(field.displayName);
    }

    // 检查别名
    field.aliases.forEach(alias => {
      if (alias.toLowerCase().includes(lowerInput)) {
        parts.push(alias);
      }
    });

    return parts;
  }

  /**
   * 创建建议
   */
  private createSuggestion(match: MatchResult): FieldSuggestion {
    return {
      value: match.field.path,
      label: this.formatLabel(match.field),
      path: match.field.path,
      type: match.field.type,
      description: match.field.displayName,
      icon: this.getFieldIcon(match.field),
      category: this.getFieldCategory(match.field)
    };
  }

  /**
   * 格式化标签
   */
  private formatLabel(field: FieldInfo): string {
    if (this.config.showChineseNames) {
      return `${field.displayName} (${field.path})`;
    }
    return field.path;
  }

  /**
   * 获取字段图标
   */
  private getFieldIcon(field: FieldInfo): string {
    const iconMap: Record<string, string> = {
      'string': 'el-icon-document',
      'int': 'el-icon-s-data',
      'long': 'el-icon-s-data',
      'decimal': 'el-icon-coin',
      'double': 'el-icon-coin',
      'boolean': 'el-icon-check',
      'date': 'el-icon-date',
      'timestamp': 'el-icon-time',
      'binary': 'el-icon-picture'
    };

    return iconMap[field.type] || 'el-icon-document';
  }

  /**
   * 获取字段分类
   */
  private getFieldCategory(field: FieldInfo): string {
    const pathParts = field.path.split('.');
    if (pathParts.length > 1) {
      return pathParts[0];
    }
    return 'global';
  }

  /**
   * 解析路径
   */
  parsePath(path: string): FieldInfo | null {
    // 尝试直接查找
    if (this.fieldMapping.globalFields.has(path)) {
      return this.fieldMapping.globalFields.get(path)!;
    }

    // 尝试通过别名查找
    for (const [fieldPath, field] of this.fieldMapping.globalFields) {
      if (field.aliases.includes(path)) {
        return field;
      }
    }

    return null;
  }

  /**
   * 获取路径预览
   */
  getPathPreview(path: string): string {
    const field = this.parsePath(path);
    if (!field) {
      return path;
    }

    if (this.config.showChineseNames) {
      return `${field.displayName} (${field.path})`;
    }

    return field.path;
  }

  /**
   * 获取错误码建议
   */
  getErrorCodeSuggestions(input: string, relatedField?: string): string[] {
    const suggestions: string[] = [];

    // 1. 基于字段路径生成错误码
    if (relatedField) {
      const field = this.parsePath(relatedField);
      if (field) {
        suggestions.push(`${field.path}.required`);
        suggestions.push(`${field.path}.invalid`);
        suggestions.push(`${field.path}.format-error`);
        suggestions.push(`${field.path}.length-error`);
        suggestions.push(`${field.path}.range-error`);
      }
    }

    // 2. 常见错误码模板
    const commonCodes = [
      'validation.required',
      'validation.invalid',
      'validation.format',
      'validation.range',
      'validation.length',
      'validation.pattern',
      'validation.type',
      'validation.unique',
      'validation.exists'
    ];

    commonCodes.forEach(code => {
      if (!input || code.includes(input.toLowerCase())) {
        suggestions.push(code);
      }
    });

    // 3. 过滤输入
    if (input) {
      const lowerInput = input.toLowerCase();
      const filtered = suggestions.filter(code => 
        code.toLowerCase().includes(lowerInput)
      );
      return filtered.length > 0 ? filtered : suggestions;
    }

    return suggestions;
  }

  /**
   * 获取运算符建议
   */
  getOperatorSuggestions(fieldType?: string): Array<{label: string; value: string; type: string}> {
    const operators: Array<{label: string; value: string; type: string}> = [];

    // 基础运算符（所有类型都支持）
    operators.push(
      { label: '等于 (eq)', value: 'eq', type: 'basic' },
      { label: '不等于 (ne)', value: 'ne', type: 'basic' },
      { label: '为空 (isNull)', value: 'isNull', type: 'basic' },
      { label: '不为空 (notNull)', value: 'notNull', type: 'basic' }
    );

    // 根据字段类型添加特定运算符
    if (!fieldType || ['int', 'long', 'decimal', 'double'].includes(fieldType)) {
      operators.push(
        { label: '大于 (gt)', value: 'gt', type: 'number' },
        { label: '大于等于 (ge)', value: 'ge', type: 'number' },
        { label: '小于 (lt)', value: 'lt', type: 'number' },
        { label: '小于等于 (le)', value: 'le', type: 'number' },
        { label: '范围内 (between)', value: 'between', type: 'number' }
      );
    }

    if (!fieldType || fieldType === 'string') {
      operators.push(
        { label: '包含 (contains)', value: 'contains', type: 'string' },
        { label: '以...开头 (startsWith)', value: 'startsWith', type: 'string' },
        { label: '以...结尾 (endsWith)', value: 'endsWith', type: 'string' },
        { label: '正则匹配 (regex)', value: 'regex', type: 'string' },
        { label: '长度范围内 (lengthBetween)', value: 'lengthBetween', type: 'string' }
      );
    }

    if (!fieldType || fieldType === 'boolean') {
      operators.push(
        { label: '为真 (isTrue)', value: 'isTrue', type: 'boolean' },
        { label: '不为真 (notTrue)', value: 'notTrue', type: 'boolean' },
        { label: '为假 (isFalse)', value: 'isFalse', type: 'boolean' },
        { label: '不为假 (notFalse)', value: 'notFalse', type: 'boolean' }
      );
    }

    return operators;
  }

  /**
   * 添加到最近使用
   */
  addToRecent(field: FieldInfo): void {
    // 移除已存在的
    const index = this.recentFields.findIndex(f => f.path === field.path);
    if (index > -1) {
      this.recentFields.splice(index, 1);
    }

    // 添加到开头
    this.recentFields.unshift(field);

    // 限制数量
    if (this.recentFields.length > this.maxRecentFields) {
      this.recentFields = this.recentFields.slice(0, this.maxRecentFields);
    }
  }

  /**
   * 获取最近使用的字段
   */
  getRecentFields(): FieldInfo[] {
    return [...this.recentFields];
  }

  /**
   * 获取常用字段
   */
  getPopularFields(limit: number = 10): FieldInfo[] {
    const popular: FieldInfo[] = [];

    // 按实体统计字段使用频率
    const entityUsage = new Map<string, number>();

    this.fieldMapping.globalFields.forEach((field) => {
      const entityName = field.path.split('.')[0];
      const count = entityUsage.get(entityName) || 0;
      entityUsage.set(entityName, count + 1);
    });

    // 选择字段最多的实体
    const sortedEntities = Array.from(entityUsage.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    // 从这些实体中选择常用字段
    sortedEntities.forEach(([entityName]) => {
      const entityMap = this.fieldMapping.entities.get(entityName);
      if (entityMap) {
        const fields = Array.from(entityMap.fields.values()).slice(0, 3);
        popular.push(...fields);
      }
    });

    return popular.slice(0, limit);
  }

  /**
   * 获取字段信息
   */
  getFieldInfo(path: string): FieldInfo | null {
    return this.parsePath(path);
  }

  /**
   * 获取所有字段
   */
  getAllFields(): FieldInfo[] {
    return Array.from(this.fieldMapping.globalFields.values());
  }

  /**
   * 按实体获取字段
   */
  getFieldsByEntity(entityName: string): FieldInfo[] {
    const entityMap = this.fieldMapping.entities.get(entityName);
    if (!entityMap) {
      return [];
    }
    return Array.from(entityMap.fields.values());
  }

  /**
   * 搜索字段
   */
  searchFields(query: string): FieldInfo[] {
    if (!query) {
      return [];
    }

    const results: FieldInfo[] = [];
    const lowerQuery = query.toLowerCase();

    this.fieldMapping.globalFields.forEach((field) => {
      if (this.calculateMatchScore(query, field) > 0) {
        results.push(field);
      }
    });

    // 按分数排序
    results.sort((a, b) => 
      this.calculateMatchScore(query, b) - this.calculateMatchScore(query, a)
    );

    return results;
  }

  /**
   * 更新字段映射
   */
  updateFieldMapping(fieldMapping: FieldMapping): void {
    this.fieldMapping = fieldMapping;
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<HintConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取配置
   */
  getConfig(): HintConfig {
    return { ...this.config };
  }
}