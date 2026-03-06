/**
 * 增强版 Xdef 解析器
 * 支持解析复杂的 Xdef 文件，包括引用、依赖、filter-bean、unknown-tag 等
 */

import * as cheerio from 'cheerio';
import * as path from 'path';
import * as fs from 'fs/promises';
import type {
  XdefMetadata,
  XdefElement,
  XdefType,
  XdefAttribute,
  XdefEnum,
  XdefEnumValue,
  XdefDependency,
  XdefRef,
  XdefBodyType,
  FieldMapping,
  ValidationRule
} from '../types';

/**
 * 增强版 Xdef 解析器
 */
export class EnhancedXdefParser {
  /** Xdef 缓存 */
  private xdefCache: Map<string, XdefMetadata> = new Map();
  /** Schema 缓存 */
  private schemaCache: Map<string, any> = new Map();
  /** 字段映射 */
  private fieldMapping: FieldMapping;
  /** 基础目录 */
  private baseDir: string;

  constructor(baseDir: string = '/Volumes/Doc/Git/Nop/nop-kernel/nop-xdefs/src/main/resources/_vfs/nop/schema') {
    this.baseDir = baseDir;
    this.fieldMapping = this.createDefaultFieldMapping();
  }

  /**
   * 解析 Xdef 文件
   */
  async parse(xdefPath: string): Promise<XdefMetadata> {
    // 检查缓存
    if (this.xdefCache.has(xdefPath)) {
      return this.xdefCache.get(xdefPath)!;
    }

    // 1. 加载 Xdef 文件
    const content = await fs.readFile(xdefPath, 'utf-8');
    const $ = cheerio.load(content, { xmlMode: true });

    // 2. 解析基本结构
    const root = $.root().children()[0];
    const metadata: XdefMetadata = {
      name: this.getElementName(root),
      namespace: this.getNamespace(root),
      rootElement: this.parseElementNode(root, $),
      types: new Map(),
      enums: new Map(),
      references: new Map(),
      fieldMapping: this.fieldMapping,
      dependencies: [],
      externalRefs: new Map(),
      importedSchemas: new Map(),
      filterBeanTypes: new Map()
    };

    // 3. 解析 xdef: 属性
    this.parseXdefAttributes(root, metadata, $);

    // 4. 解析 xdef:define 定义
    this.parseXdefDefines(root, metadata, $);

    // 5. 解析引用（xdef:ref）
    await this.parseXdefRefs(root, metadata, xdefPath, $);

    // 6. 解析 unknown-tag 定义
    this.parseUnknownTags(root, metadata, $);

    // 7. 解析依赖的 Xdef 文件
    await this.resolveDependencies(metadata);

    // 8. 缓存
    this.xdefCache.set(xdefPath, metadata);

    return metadata;
  }

  /**
   * 解析 xdef: 属性
   */
  private parseXdefAttributes(element: any, metadata: XdefMetadata, $: cheerio.CheerioAPI): void {
    const xdefElement = this.findElementByNode(element, metadata);

    // 提取所有 xdef: 前缀的属性
    Object.keys(element.attribs).forEach(attrName => {
      if (attrName.startsWith('xdef:')) {
        const attrValue = element.attribs[attrName];
        xdefElement.xdefAttributes.set(attrName, attrValue);

        // 处理特殊属性
        if (attrName === 'xdef:ref') {
          metadata.externalRefs.set(xdefElement.name, {
            type: 'ref',
            name: attrValue,
            isResolved: false
          });
        }

        if (attrName === 'xdef:bean-body-prop') {
          xdefElement.xdefBodyType = this.inferBodyType(attrValue);
        }

        if (attrName === 'xdef:unknown-tag') {
          xdefElement.xdefUnknownTag = true;
        }
      }
    });
  }

  /**
   * 解析 xdef:define 定义
   */
  private parseXdefDefines(element: any, metadata: XdefMetadata, $: cheerio.CheerioAPI): void {
    const defines = $(element).find('xdef\\:define');

    defines.each((_, define) => {
      const defineName = $(define).attr('xdef:name');
      const ref = $(define).attr('xdef:ref');
      const bodyType = $(define).attr('xdef:body-type');

      if (ref) {
        // 这是一个引用类型的定义
        const refInfo: XdefRef = {
          type: 'ref',
          name: defineName,
          targetName: ref,
          isResolved: false
        };

        metadata.externalRefs.set(defineName, refInfo);

        // 标记引用的元素
        const refElements = this.findElementsWithRef(metadata, ref);
        refElements.forEach(el => {
          el.xdefDefineRef = ref;
        });
      } else {
        // 这是一个内联定义
        const type: XdefType = {
          name: defineName,
          source: 'define',
          sourceFile: metadata.name,
          properties: this.parseDefineProperties(define, $),
          description: $(define).attr('description')
        };

        metadata.types.set(defineName, type);
      }
    });
  }

  /**
   * 解析 define 属性
   */
  private parseDefineProperties(define: any, $: cheerio.CheerioAPI): any[] {
    const properties: any[] = [];
    const props = $(define).find('xdef\\:prop');

    props.each((_, prop) => {
      properties.push({
        name: $(prop).attr('name'),
        type: $(prop).attr('type'),
        required: $(prop).attr('required') === 'true',
        description: $(prop).attr('description')
      });
    });

    return properties;
  }

  /**
   * 解析 xdef:ref 引用
   */
  private async parseXdefRefs(
    element: any,
    metadata: XdefMetadata,
    currentPath: string,
    $: cheerio.CheerioAPI
  ): Promise<void> {
    const refs = $(element).find('[xdef\\:ref]');

    for (const ref of refs.toArray()) {
      const refPath = $(ref).attr('xdef:ref');
      const refName = $(ref).attr('xdef:name');

      if (refPath) {
        const dependency: XdefDependency = {
          type: 'ref',
          path: refPath,
          targetName: refName || '',
          resolved: false
        };

        metadata.dependencies.push(dependency);

        await this.resolveReference(refPath, metadata);
      }
    }
  }

  /**
   * 解析 unknown-tag 定义
   */
  private parseUnknownTags(element: any, metadata: XdefMetadata, $: cheerio.CheerioAPI): void {
    const unknownTagDef = $(element).find('xdef\\:unknown-tag');

    if (unknownTagDef.length > 0) {
      const beanTagProp = unknownTagDef.attr('xdef:bean-tag-prop');
      const beanBodyProp = unknownTagDef.attr('xdef:bean-body-prop');
      const bodyType = unknownTagDef.text().trim();

      metadata.unknownTagConfig = {
        beanTagProp: beanTagProp || '$type',
        beanBodyProp: beanBodyProp || '$body',
        bodyType: bodyType || 'xml'
      };

      metadata.supportsUnknownTags = true;
    }
  }

  /**
   * 解析依赖
   */
  private async resolveDependencies(metadata: XdefMetadata): Promise<void> {
    for (const dep of metadata.dependencies) {
      if (!dep.resolved) {
        await this.resolveReference(dep.path, metadata);
        dep.resolved = true;
      }
    }
  }

  /**
   * 解析引用
   */
  private async resolveReference(refPath: string, metadata: XdefMetadata): Promise<void> {
    const targetPath = this.resolveXdefPath(refPath);

    if (!targetPath) {
      console.warn(`无法解析引用: ${refPath}`);
      return;
    }

    if (this.xdefCache.has(targetPath)) {
      const refMetadata = this.xdefCache.get(targetPath)!;
      this.mergeMetadata(metadata, refMetadata);
      return;
    }

    try {
      const refMetadata = await this.parse(targetPath);
      this.mergeMetadata(metadata, refMetadata);
    } catch (error) {
      console.error(`解析引用失败: ${refPath}`, error);
    }
  }

  /**
   * 合并元数据
   */
  private mergeMetadata(target: XdefMetadata, source: XdefMetadata): void {
    // 合并类型
    source.types.forEach((type, name) => {
      if (!target.types.has(name)) {
        target.types.set(name, type);
      }
    });

    // 合并枚举
    source.enums.forEach((enumDef, name) => {
      if (!target.enums.has(name)) {
        target.enums.set(name, enumDef);
      }
    });

    // 合并 filter-bean 类型（重要！）
    if (source.name === 'filter' || source.filterBeanTypes.size > 0) {
      source.filterBeanTypes.forEach((element, name) => {
        target.filterBeanTypes.set(name, element);
      });
    }
  }

  /**
   * 解析 Xdef 路径
   */
  private resolveXdefPath(refPath: string): string | null {
    const fullPath = path.join(this.baseDir, refPath);

    if (fs.existsSync(fullPath)) {
      return fullPath;
    }

    return null;
  }

  /**
   * 推断 Body 类型
   */
  private inferBodyType(propName: string): XdefBodyType {
    if (propName === '$body') {
      return 'list';
    }
    if (propName === 'condition') {
      return 'filter-bean';
    }
    return 'literal';
  }

  /**
   * 获取元素名称
   */
  private getElementName(element: any): string {
    return element.tagName || element.name || '';
  }

  /**
   * 获取命名空间
   */
  private getNamespace(element: any): string {
    const xmlns = element.attribs?.['xmlns'] || element.attribs?.['xdef:namespace'];
    return xmlns || '';
  }

  /**
   * 解析元素节点
   */
  private parseElementNode(element: any, $: cheerio.CheerioAPI): XdefElement {
    const xdefElement: XdefElement = {
      name: element.tagName,
      type: this.getType(element),
      attributes: this.parseAttributes(element, $),
      children: this.parseChildren(element, $),
      isRequired: this.isRequired(element),
      isMultiple: this.isMultiple(element),
      beanBodyProp: this.getBeanBodyProp(element),
      uniqueAttr: this.getUniqueAttr(element),
      description: this.getDescription(element, $),
      displayName: this.getDisplayName(element, $),
      hintTemplate: this.getHintTemplate(element, $),
      xdefAttributes: new Map(),
      xdefBodyType: undefined,
      xdefRef: undefined,
      xdefUnknownTag: false,
      xdefDefineRef: undefined
    };

    return xdefElement;
  }

  /**
   * 解析属性
   */
  private parseAttributes(element: any, $: cheerio.CheerioAPI): XdefAttribute[] {
    const attributes: XdefAttribute[] = [];

    Object.keys(element.attribs).forEach(attrName => {
      if (attrName.startsWith('xdef:')) {
        return;
      }

      const attr: XdefAttribute = {
        name: attrName,
        type: this.getAttributeType(element, attrName),
        defaultValue: element.attribs[attrName],
        isRequired: this.isAttributeRequired(element, attrName),
        description: this.getAttributeDescription(element, attrName),
        displayName: this.getAttributeDisplayName(element, attrName),
        hintTemplate: this.getAttributeHintTemplate(element, attrName),
        suggestions: this.getAttributeSuggestions(element, attrName),
        autoComplete: this.isAttributeAutoComplete(element, attrName)
      };

      attributes.push(attr);
    });

    return attributes;
  }

  /**
   * 解析子元素
   */
  private parseChildren(element: any, $: cheerio.CheerioAPI): XdefElement[] {
    const children: XdefElement[] = [];

    $(element).children().each((_, child) => {
      if (child.type === 'tag') {
        children.push(this.parseElementNode(child, $));
      }
    });

    return children;
  }

  /**
   * 获取类型
   */
  private getType(element: any): XdefType {
    return {
      name: 'string',
      source: 'inferred',
      properties: []
    };
  }

  /**
   * 获取属性类型
   */
  private getAttributeType(element: any, attrName: string): XdefType {
    const value = element.attribs[attrName];

    if (!value) {
      return { name: 'string', source: 'inferred', properties: [] };
    }

    // 简单类型推断
    if (!isNaN(Number(value))) {
      return { name: 'number', source: 'inferred', properties: [] };
    }

    if (value === 'true' || value === 'false') {
      return { name: 'boolean', source: 'inferred', properties: [] };
    }

    return { name: 'string', source: 'inferred', properties: [] };
  }

  /**
   * 判断是否必需
   */
  private isRequired(element: any): boolean {
    return element.attribs?.['required'] === 'true';
  }

  /**
   * 判断是否可多个
   */
  private isMultiple(element: any): boolean {
    return element.attribs?.['multiple'] === 'true';
  }

  /**
   * 获取 Bean Body 属性
   */
  private getBeanBodyProp(element: any): string | undefined {
    return element.attribs?.['xdef:bean-body-prop'];
  }

  /**
   * 获取唯一属性
   */
  private getUniqueAttr(element: any): string | undefined {
    return element.attribs?.['xdef:unique-attr'];
  }

  /**
   * 获取描述
   */
  private getDescription(element: any, $: cheerio.CheerioAPI): string | undefined {
    // 尝试获取注释
    const prev = $(element).prev()[0];
    if (prev && prev.type === 'comment') {
      return prev.data?.trim();
    }

    return element.attribs?.['description'];
  }

  /**
   * 获取显示名称
   */
  private getDisplayName(element: any, $: cheerio.CheerioAPI): string | undefined {
    const comment = this.getDescription(element, $);
    if (comment) {
      const match = comment.match(/^(中文|显示|名称)[:：]\s*(.+)/);
      if (match) {
        return match[1].trim();
      }
    }

    return element.attribs?.['displayName'];
  }

  /**
   * 获取提示模板
   */
  private getHintTemplate(element: any, $: cheerio.CheerioAPI): string | undefined {
    const name = element.tagName;
    const displayName = this.getDisplayName(element, $);

    if (name === 'notNull') {
      return `字段 {field} 不能为空`;
    }

    if (name === 'eq') {
      return `字段 {field} 等于 {value}`;
    }

    return undefined;
  }

  /**
   * 判断属性是否必需
   */
  private isAttributeRequired(element: any, attrName: string): boolean {
    return element.attribs?.[`${attrName}-required`] === 'true';
  }

  /**
   * 获取属性描述
   */
  private getAttributeDescription(element: any, attrName: string): string | undefined {
    return element.attribs?.[`${attrName}-description`];
  }

  /**
   * 获取属性显示名称
   */
  private getAttributeDisplayName(element: any, attrName: string): string | undefined {
    const displayNameMap: Record<string, string> = {
      'name': '字段名',
      'owner': '所属对象',
      'value': '值',
      'valueName': '值变量名',
      'min': '最小值',
      'max': '最大值',
      'minName': '最小值变量名',
      'maxName': '最大值变量名',
      'pattern': '正则表达式',
      'errorCode': '错误码',
      'errorDescription': '错误描述',
      'severity': '严重程度',
      'id': '规则ID'
    };

    return displayNameMap[attrName];
  }

  /**
   * 获取属性提示模板
   */
  private getAttributeHintTemplate(element: any, attrName: string): string | undefined {
    const elementName = element.tagName;

    if (attrName === 'name') {
      return `选择要验证的字段，例如: user.username`;
    }

    if (attrName === 'value' && elementName === 'notNull') {
      return `无需指定值，直接检查字段是否为空`;
    }

    return undefined;
  }

  /**
   * 获取属性建议值
   */
  private getAttributeSuggestions(element: any, attrName: string): string[] | undefined {
    if (attrName === 'name') {
      return Array.from(this.fieldMapping.globalFields.keys());
    }

    return undefined;
  }

  /**
   * 判断属性是否需要自动补全
   */
  private isAttributeAutoComplete(element: any, attrName: string): boolean {
    const autoCompleteAttrs = ['name', 'owner', 'valueName', 'minName', 'maxName'];
    return autoCompleteAttrs.includes(attrName);
  }

  /**
   * 根据节点查找元素
   */
  private findElementByNode(node: any, metadata: XdefMetadata): XdefElement {
    return metadata.rootElement;
  }

  /**
   * 查找具有特定引用的元素
   */
  private findElementsWithRef(metadata: XdefMetadata, refName: string): XdefElement[] {
    const elements: XdefElement[] = [];

    function traverse(element: XdefElement) {
      if (element.xdefDefineRef === refName) {
        elements.push(element);
      }
      element.children?.forEach(traverse);
    }

    traverse(metadata.rootElement);
    return elements;
  }

  /**
   * 创建默认字段映射
   */
  private createDefaultFieldMapping(): FieldMapping {
    return {
      entities: new Map(),
      globalFields: new Map(),
      pathAliases: new Map()
    };
  }

  /**
   * 设置字段映射
   */
  setFieldMapping(fieldMapping: FieldMapping): void {
    this.fieldMapping = fieldMapping;
  }

  /**
   * 获取缓存
   */
  getCache(): Map<string, XdefMetadata> {
    return this.xdefCache;
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.xdefCache.clear();
    this.schemaCache.clear();
  }
}
