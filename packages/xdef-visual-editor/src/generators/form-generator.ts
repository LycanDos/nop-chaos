/**
 * 表单生成器
 * 根据 Xdef 元数据生成动态表单配置
 */

import type {
  XdefMetadata,
  XdefElement,
  DynamicFormConfig,
  FormElement,
  FormLayout,
  FormValidation,
  HintConfig,
  HintEngine
} from '../types';

/**
 * 表单生成器
 */
export class FormGenerator {
  /**
   * 生成表单配置
   */
  generateFormConfig(
    metadata: XdefMetadata,
    hintEngine: HintEngine
  ): DynamicFormConfig {
    const config: DynamicFormConfig = {
      elements: [],
      layout: this.generateLayout(metadata),
      validation: this.generateValidation(metadata),
      hints: this.generateHintConfig()
    };

    // 根据不同的 Xdef 类型生成不同的表单
    if (metadata.name === 'validator') {
      config.elements = this.generateValidatorFormElements(metadata, hintEngine);
    } else {
      config.elements = this.generateGenericFormElements(metadata, hintEngine);
    }

    return config;
  }

  /**
   * 生成 Validator 表单元素
   */
  private generateValidatorFormElements(
    metadata: XdefMetadata,
    hintEngine: HintEngine
  ): FormElement[] {
    const elements: FormElement[] = [];

    // 1. 全局配置
    if (metadata.rootElement.attributes) {
      elements.push({
        id: 'global-config',
        type: 'object',
        label: '全局配置',
        xdefRef: metadata.rootElement,
        children: this.generateAttributeElements(metadata.rootElement, hintEngine),
        visible: true
      });
    }

    // 2. 检查规则列表
    elements.push({
      id: 'checks',
      type: 'array',
      label: '检查规则',
      xdefRef: metadata.rootElement,
      children: [{
        id: 'check-item',
        type: 'object',
        label: '检查规则',
        xdefRef: this.findCheckElement(metadata),
        children: this.generateCheckFormElements(metadata, hintEngine),
        visible: true
      }],
      visible: true
    });

    return elements;
  }

  /**
   * 生成检查规则表单元素
   */
  private generateCheckFormElements(
    metadata: XdefMetadata,
    hintEngine: HintEngine
  ): FormElement[] {
    const elements: FormElement[] = [];

    // 规则 ID
    elements.push({
      id: 'id',
      type: 'text',
      label: '规则ID',
      required: true,
      placeholder: '例如: checkPassword',
      hintConfig: {
        enableAutoComplete: false,
        enablePathSuggestion: false,
        enableChineseMapping: false,
        showFieldPreview: false,
        searchableFields: [],
        pathAliases: new Map()
      },
      xdefRef: this.createPlaceholderElement('id'),
      visible: true
    });

    // 错误码
    elements.push({
      id: 'errorCode',
      type: 'error-code-selector',
      label: '错误码',
      required: true,
      placeholder: '选择或输入错误码',
      hintConfig: {
        enableAutoComplete: true,
        enablePathSuggestion: true,
        enableChineseMapping: true,
        showFieldPreview: true,
        searchableFields: [],
        pathAliases: new Map()
      },
      xdefRef: this.createPlaceholderElement('errorCode'),
      visible: true
    });

    // 错误描述
    elements.push({
      id: 'errorDescription',
      type: 'textarea',
      label: '错误描述',
      placeholder: '例如: 密码长度必须至少6位',
      rows: 2,
      hintConfig: {
        enableAutoComplete: false,
        enablePathSuggestion: false,
        enableChineseMapping: false,
        showFieldPreview: false,
        searchableFields: [],
        pathAliases: new Map()
      },
      xdefRef: this.createPlaceholderElement('errorDescription'),
      visible: true
    });

    // 严重程度
    elements.push({
      id: 'severity',
      type: 'number',
      label: '严重程度',
      min: 0,
      max: 10,
      placeholder: '0-10',
      hintConfig: {
        enableAutoComplete: false,
        enablePathSuggestion: false,
        enableChineseMapping: false,
        showFieldPreview: true,
        searchableFields: [],
        pathAliases: new Map()
      },
      xdefRef: this.createPlaceholderElement('severity'),
      visible: true
    });

    // 条件构建器
    elements.push({
      id: 'condition',
      type: 'condition-builder',
      label: '校验条件',
      required: true,
      hintConfig: {
        enableAutoComplete: true,
        enablePathSuggestion: true,
        enableChineseMapping: true,
        showFieldPreview: true,
        searchableFields: [],
        pathAliases: new Map()
      },
      xdefRef: this.createPlaceholderElement('condition'),
      visible: true
    });

    return elements;
  }

  /**
   * 生成通用表单元素
   */
  private generateGenericFormElements(
    metadata: XdefMetadata,
    hintEngine: HintEngine
  ): FormElement[] {
    const elements: FormElement[] = [];

    // 遍历根元素的属性
    if (metadata.rootElement.attributes) {
      metadata.rootElement.attributes.forEach(attr => {
        elements.push(this.generateAttributeElement(attr, metadata.rootElement, hintEngine));
      });
    }

    // 遍历子元素
    if (metadata.rootElement.children) {
      metadata.rootElement.children.forEach(child => {
        elements.push(this.generateChildElement(child, hintEngine));
      });
    }

    return elements;
  }

  /**
   * 生成属性元素
   */
  private generateAttributeElements(
    element: XdefElement,
    hintEngine: HintEngine
  ): FormElement[] {
    return element.attributes.map(attr => 
      this.generateAttributeElement(attr, element, hintEngine)
    );
  }

  /**
   * 生成单个属性元素
   */
  private generateAttributeElement(
    attr: any,
    parent: XdefElement,
    hintEngine: HintEngine
  ): FormElement {
    const formElement: FormElement = {
      id: attr.name,
      type: this.inferElementType(attr, hintEngine),
      label: attr.displayName || attr.name,
      required: attr.isRequired,
      placeholder: attr.hintTemplate || `请输入${attr.displayName || attr.name}`,
      defaultValue: attr.defaultValue,
      xdefRef: parent,
      hintConfig: {
        enableAutoComplete: attr.autoComplete || false,
        enablePathSuggestion: attr.autoComplete || false,
        enableChineseMapping: true,
        showFieldPreview: true,
        searchableFields: attr.suggestions || [],
        pathAliases: new Map()
      },
      visible: true
    };

    // 添加验证规则
    if (attr.validation) {
      formElement.validation = attr.validation;
    }

    // 添加建议值
    if (attr.suggestions && attr.suggestions.length > 0) {
      formElement.widget = {
        type: 'select',
        props: {
          options: attr.suggestions.map(s => ({ label: s, value: s })),
          filterable: true,
          allowCreate: true
        }
      };
    }

    return formElement;
  }

  /**
   * 生成子元素
   */
  private generateChildElement(
    child: XdefElement,
    hintEngine: HintEngine
  ): FormElement {
    const formElement: FormElement = {
      id: child.name,
      type: this.inferElementTypeFromElement(child, hintEngine),
      label: child.displayName || child.name,
      required: child.isRequired,
      xdefRef: child,
      children: child.children ? 
        child.children.map(c => this.generateChildElement(c, hintEngine)) : 
        undefined,
      visible: true
    };

    return formElement;
  }

  /**
   * 推断元素类型
   */
  private inferElementType(attr: any, hintEngine: HintEngine): string {
    // 如果有建议值，使用选择器
    if (attr.suggestions && attr.suggestions.length > 0) {
      return 'select';
    }

    // 根据属性名推断
    if (attr.name === 'name' || attr.name === 'field' || attr.name === 'owner') {
      return 'path-selector';
    }

    if (attr.name === 'errorCode') {
      return 'error-code-selector';
    }

    if (attr.name === 'description' || attr.name === 'errorDescription') {
      return 'textarea';
    }

    // 根据类型推断
    if (attr.type) {
      const typeName = attr.type.name?.toLowerCase();
      
      if (typeName === 'int' || typeName === 'long' || typeName === 'decimal' || typeName === 'double') {
        return 'number';
      }
      
      if (typeName === 'boolean') {
        return 'boolean';
      }
      
      if (typeName === 'date') {
        return 'date';
      }
      
      if (typeName === 'timestamp') {
        return 'datetime';
      }
    }

    // 默认返回文本输入
    return 'text';
  }

  /**
   * 从元素推断类型
   */
  private inferElementTypeFromElement(element: XdefElement, hintEngine: HintEngine): string {
    // 如果元素有多个子元素，使用对象
    if (element.children && element.children.length > 0) {
      return 'object';
    }

    // 如果元素可以多个，使用数组
    if (element.isMultiple) {
      return 'array';
    }

    // 根据元素名推断
    if (element.name === 'condition') {
      return 'condition-builder';
    }

    return 'text';
  }

  /**
   * 生成布局配置
   */
  private generateLayout(metadata: XdefMetadata): FormLayout {
    return {
      type: 'vertical',
      columns: 1,
      spacing: 16,
      responsive: true
    };
  }

  /**
   * 生成验证配置
   */
  private generateValidation(metadata: XdefMetadata): FormValidation {
    return {
      realtime: true,
      showMessage: true,
      rules: []
    };
  }

  /**
   * 生成提示配置
   */
  private generateHintConfig(): HintConfig {
    return {
      enabled: true,
      showDescriptions: true,
      showChineseNames: true,
      showPathPreview: true,
      autoComplete: true,
      fuzzySearch: true
    };
  }

  /**
   * 查找 Check 元素
   */
  private findCheckElement(metadata: XdefMetadata): XdefElement {
    const checkChild = metadata.rootElement.children?.find(c => c.name === 'check');
    if (checkChild) {
      return checkChild;
    }

    // 创建占位符元素
    return this.createPlaceholderElement('check');
  }

  /**
   * 创建占位符元素
   */
  private createPlaceholderElement(name: string): XdefElement {
    return {
      name,
      type: { name: 'string', source: 'inferred', properties: [] },
      attributes: [],
      isRequired: false,
      isMultiple: false,
      xdefAttributes: new Map()
    };
  }

  /**
   * 更新表单配置
   */
  updateFormConfig(
    config: DynamicFormConfig,
    updates: Partial<DynamicFormConfig>
  ): DynamicFormConfig {
    return {
      ...config,
      ...updates,
      elements: updates.elements || config.elements,
      layout: updates.layout || config.layout,
      validation: updates.validation || config.validation,
      hints: updates.hints || config.hints
    };
  }
}