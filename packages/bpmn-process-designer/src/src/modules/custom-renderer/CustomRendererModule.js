import BpmnRenderer from 'bpmn-js/lib/draw/BpmnRenderer'

const ACTIVITY_TYPES = [
  'bpmn:Task',
  'bpmn:UserTask',
  'bpmn:ServiceTask',
  'bpmn:SendTask',
  'bpmn:ReceiveTask',
  'bpmn:ManualTask',
  'bpmn:BusinessRuleTask',
  'bpmn:ScriptTask',
  'bpmn:CallActivity',
  'bpmn:SubProcess'
]

let activityHtmlCache = null // 缓存接口数据
let contentHtmlMap = {} // id->contentHtml

async function fetchActivityHtml() {
  if (activityHtmlCache) return activityHtmlCache
  try {
    const base = (typeof window !== 'undefined' && window.BPMN_API_BASE) || (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_BPMN_API_BASE) || ''
    const url = base + '/api/bpmn/activities'
    const res = await fetch(url)
    const data = await res.json()
    activityHtmlCache = Array.isArray(data) ? data : []
    return activityHtmlCache
  } catch (e) {
    return []
  }
}

async function fetchContentHtml(id) {
  // if (contentHtmlMap[id]) return contentHtmlMap[id]
  try {
    const base = (typeof window !== 'undefined' && window.BPMN_API_BASE) || (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_BPMN_API_BASE) || ''
    const url = base + '/api/bpmn/activitiesStyle?id=' + encodeURIComponent(id)
    const res = await fetch(url)
    const data = await res.json()
    contentHtmlMap[id] = data.contentHtml || ''
    return contentHtmlMap[id]
  } catch (e) {
    return ''
  }
}

/**
 * 判断元素是否为AMIS元素
 */
function isAmisElement(element) {
  // 检查元素是否包含AMIS配置
  const businessObject = element.businessObject;
  if (!businessObject) return false;

  // 检查是否为服务任务且名称包含HTTP或API
  if (element.type === 'bpmn:ServiceTask' &&
      businessObject.name &&
      (businessObject.name.toLowerCase().includes('http') ||
       businessObject.name.toLowerCase().includes('api') ||
       businessObject.name.toLowerCase().includes('request'))) {
    return true;
  }

  // 检查是否包含自定义扩展属性
  if (businessObject.extensionElements &&
      businessObject.extensionElements.values) {
    return businessObject.extensionElements.values.some(ext =>
      ext.$type === 'custom:AmisConfig' ||
      ext.get('amisSchema') ||
      ext.get('customType') === 'amis-task' ||
      (ext.$type === 'bpmn:Documentation' && ext.text && ext.text.startsWith('apiActivityId:'))
    );
  }

  return false;
}

function CustomRendererModule(config, eventBus, styles, pathMap, canvas, textRenderer) {
  BpmnRenderer.call(this, config, eventBus, styles, pathMap, canvas, textRenderer, 2000)
  const self = this

  // 重写 drawShape
  this.drawShape = function(parentNode, element) {
    // 先画原生节点
    const shape = BpmnRenderer.prototype.drawShape.call(this, parentNode, element)

    // 只处理 activity
    if (ACTIVITY_TYPES.includes(element.type)) {
      console.log('[CustomRendererModule] drawShape 处理节点:', element)

      // 插入 foreignObject 展示 HTML
      const fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject')
      fo.setAttribute('x', 0)
      fo.setAttribute('y', 0)
      fo.setAttribute('width', element.width)
      fo.setAttribute('height', element.height)
      fo.style.pointerEvents = 'none' // 不影响节点交互

      // 创建内容容器
      const htmlDiv = document.createElement('div')
      htmlDiv.style.width = '100%'
      htmlDiv.style.height = '100%'
      htmlDiv.style.display = 'flex'
      htmlDiv.style.alignItems = 'center'
      htmlDiv.style.justifyContent = 'center'
      htmlDiv.style.overflow = 'hidden'
      htmlDiv.style.fontSize = '12px' // 调整字体大小以适应BPMN节点
      htmlDiv.style.pointerEvents = 'none'
      htmlDiv.style.padding = '4px'

      // 默认内容
      htmlDiv.innerHTML = "<div style='color:#aaa;text-align:center;font-size:10px;'>[AMIS Content]</div>"

      // 优先渲染window._bpmnContentHtmlMap中的内容（仅API数据才有）
      // 这里的apiActivityId实际为接口返回的code
      let apiActivityId = null
      if (element.businessObject && element.businessObject.extensionElements && element.businessObject.extensionElements.values) {
        const extensions = element.businessObject.extensionElements.values;

        // 查找AMIS配置 - 寻找包含apiActivityId的文档元素
        const doc = extensions.find(ext =>
          ext.$type === 'bpmn:Documentation' && ext.text && ext.text && ext.text.startsWith('apiActivityId:')
        );

        if (doc) {
          apiActivityId = doc.text.replace('apiActivityId:', '').trim(); // 使用trim()去除空白字符
          console.log('[CustomRendererModule] 从文档扩展元素中提取apiActivityId:', apiActivityId);
        }
      }

      // 检查是否有amisSchema扩展元素
      if (!apiActivityId && element.businessObject && element.businessObject.extensionElements && element.businessObject.extensionElements.values) {
        const extensions = element.businessObject.extensionElements.values;
        const amisSchemaElement = extensions.find(ext => ext.get && ext.get('amisSchema'));
        if (amisSchemaElement && amisSchemaElement.get('amisSchema')) {
          apiActivityId = element.businessObject.id; // 使用节点ID作为键值
          console.log('[CustomRendererModule] 从amisSchema扩展元素中使用节点ID:', apiActivityId);
          // 将amisSchema存储到全局缓存中
          if (!window._bpmnContentHtmlMap) {
            window._bpmnContentHtmlMap = {};
          }
          window._bpmnContentHtmlMap[apiActivityId] = amisSchemaElement.get('amisSchema');
        }
      }

      // 检查是否包含AMIS配置
      const hasAmisConfig = isAmisElement(element);
      console.log('[CustomRendererModule] 渲染节点详细信息:', {
        bpmnId: element.businessObject && element.businessObject.id,
        elementId: element.id,
        apiActivityId,
        hasAmisConfig,
        hasBpmnContentHtmlMap: !!window._bpmnContentHtmlMap,
        bpmnContentHtmlMap: window._bpmnContentHtmlMap, // 显示整个缓存对象
        apiActivityIdContent: window._bpmnContentHtmlMap && apiActivityId ? window._bpmnContentHtmlMap[apiActivityId] : undefined,
        elementIdContent: window._bpmnContentHtmlMap && element.id ? window._bpmnContentHtmlMap[element.id] : undefined,
        contentHtmlValue: window._bpmnContentHtmlMap && (apiActivityId || element.id) ? (window._bpmnContentHtmlMap[apiActivityId] || window._bpmnContentHtmlMap[element.id]) : null
      })

      // 首先检查apiActivityId，然后尝试使用节点ID
      let contentHtml = null;
      let contentHtmlKey = null;

      console.log('[CustomRendererModule] 开始查找contentHtml，apiActivityId:', apiActivityId, 'element.id:', element.id, '缓存内容:', window._bpmnContentHtmlMap);

      if (apiActivityId && window._bpmnContentHtmlMap) {
        // 尝试精确匹配
        if (window._bpmnContentHtmlMap[apiActivityId]) {
          contentHtml = window._bpmnContentHtmlMap[apiActivityId];
          contentHtmlKey = apiActivityId;
          console.log('[CustomRendererModule] 通过apiActivityId精确匹配找到contentHtml:', apiActivityId, contentHtml);
        } else {
          // 如果精确匹配失败，尝试模糊匹配（去除空白字符）
          const trimmedApiActivityId = apiActivityId.trim();
          console.log('[CustomRendererModule] 精确匹配失败，尝试修剪后的apiActivityId:', trimmedApiActivityId);
          if (trimmedApiActivityId && window._bpmnContentHtmlMap[trimmedApiActivityId]) {
            contentHtml = window._bpmnContentHtmlMap[trimmedApiActivityId];
            contentHtmlKey = trimmedApiActivityId;
            console.log('[CustomRendererModule] 通过apiActivityId(修剪后)匹配找到contentHtml:', trimmedApiActivityId, contentHtml);
          } else {
            // 检查是否有包含apiActivityId的键（模糊匹配）
            const allKeys = Object.keys(window._bpmnContentHtmlMap || {});
            console.log('[CustomRendererModule] 检查所有缓存键:', allKeys);
            const matchingKey = allKeys.find(key => {
              const normalizedKey = key.trim();
              return normalizedKey === trimmedApiActivityId ||
                     normalizedKey === apiActivityId ||
                     key === trimmedApiActivityId ||
                     key === apiActivityId;
            });

            if (matchingKey) {
              contentHtml = window._bpmnContentHtmlMap[matchingKey];
              contentHtmlKey = matchingKey;
              console.log('[CustomRendererModule] 通过模糊匹配找到contentHtml，匹配键:', matchingKey, 'contentHtml:', contentHtml);
            }
          }
        }
      }

      // 如果通过apiActivityId没找到，尝试使用节点ID
      if (!contentHtml && hasAmisConfig && element.id && window._bpmnContentHtmlMap) {
        console.log('[CustomRendererModule] 尝试通过element.id查找contentHtml');
        if (window._bpmnContentHtmlMap[element.id]) {
          contentHtml = window._bpmnContentHtmlMap[element.id];
          contentHtmlKey = element.id;
          console.log('[CustomRendererModule] 通过element.id找到contentHtml:', element.id, contentHtml);
        } else {
          // 也尝试修剪节点ID（虽然通常不需要）
          const trimmedElementId = element.id.trim();
          if (trimmedElementId !== element.id && window._bpmnContentHtmlMap[trimmedElementId]) {
            contentHtml = window._bpmnContentHtmlMap[trimmedElementId];
            contentHtmlKey = trimmedElementId;
            console.log('[CustomRendererModule] 通过element.id(修剪后)找到contentHtml:', trimmedElementId, contentHtml);
          }
        }
      }

      if (contentHtml) {
        console.log('[CustomRendererModule] 渲染自定义 contentHtml (key:', contentHtmlKey, '):', contentHtml);
        console.log('[CustomRendererModule] contentHtml类型:', typeof contentHtml);

        try {
          // 尝试解析contentHtml，可能是一个JSON字符串
          let parsedContent = null;

          // 如果已经是对象，直接使用
          if (typeof contentHtml === 'object') {
            parsedContent = contentHtml;
            console.log('[CustomRendererModule] contentHtml已经是对象，直接使用');
          } else if (typeof contentHtml === 'string') {
            // 如果是字符串，尝试解析JSON
            try {
              parsedContent = JSON.parse(contentHtml);
              console.log('[CustomRendererModule] JSON解析成功:', parsedContent);
            } catch (e) {
              // 如果不是JSON格式，直接作为HTML显示
              console.log('[CustomRendererModule] contentHtml不是JSON格式，直接作为HTML显示');
            }
          }

          if (parsedContent && parsedContent.type) {
            // 这是一个AMIS schema，需要特殊处理
            console.log('[CustomRendererModule] 检测到AMIS schema，类型:', parsedContent.type);
            const amisHtml = renderAmisSchemaForBpmn(parsedContent);
            htmlDiv.innerHTML = amisHtml;
          } else {
            // 直接作为HTML显示
            console.log('[CustomRendererModule] 未检测到AMIS schema，直接显示内容');
            htmlDiv.innerHTML = typeof contentHtml === 'string' ? contentHtml : JSON.stringify(contentHtml);
          }
        } catch (error) {
          console.error('[CustomRendererModule] 渲染自定义内容时发生错误:', error);
          htmlDiv.innerHTML = "<div style='color:#aaa;text-align:center;font-size:10px;'>[AMIS Error]</div>";
        }
      } else {
        console.log('[CustomRendererModule] 未命中自定义 contentHtml:', {
          apiActivityId,
          elementId: element.id,
          hasAmisConfig,
          hasBpmnContentHtmlMap: !!window._bpmnContentHtmlMap,
          mapContent: window._bpmnContentHtmlMap
        })
        // 显示提示信息而不是空内容
        htmlDiv.innerHTML = "<div style='color:#aaa;text-align:center;font-size:10px;'>[AMIS Content]</div>"
      }

      fo.appendChild(htmlDiv)
      parentNode.appendChild(fo)
    }
    return shape
  }

  // 渲染AMIS schema为HTML
  function renderAmisSchemaForBpmn(schema) {
    console.log('[CustomRendererModule] renderAmisSchemaForBpmn - 输入的schema:', schema);
    try {
      // 提取全局样式
      const globalStyles = extractAmisGlobalStyles(schema);
      console.log('[CustomRendererModule] renderAmisSchemaForBpmn - 提取的全局样式:', globalStyles);

      // 渲染内容
      let renderedContent = '';
      if (schema.type === 'page' && schema.body) {
        console.log('[CustomRendererModule] renderAmisSchemaForBpmn - 页面类型，body内容:', schema.body);
        if (Array.isArray(schema.body)) {
          console.log('[CustomRendererModule] renderAmisSchemaForBpmn - body为数组，长度:', schema.body.length);
          renderedContent = schema.body.map((item, index) => {
            console.log(`[CustomRendererModule] renderAmisSchemaForBpmn - 处理body[${index}] item:`, item);
            return renderAmisItem(item);
          }).join('');
        } else {
          console.log('[CustomRendererModule] renderAmisSchemaForBpmn - body为单个项目:', schema.body);
          renderedContent = renderAmisItem(schema.body);
        }
      } else {
        console.log('[CustomRendererModule] renderAmisSchemaForBpmn - 非页面类型，直接渲染:', schema);
        renderedContent = renderAmisItem(schema);
      }

      // 为BPMN上下文添加特殊的容器样式
      let styleString = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;overflow:hidden;font-size:10px;';

      if (globalStyles && Object.keys(globalStyles).length > 0) {
        const globalStyleString = Object.entries(globalStyles).map(([key, value]) => `${key}:${value}`).join(';');
        styleString = globalStyleString + ';' + styleString;
      }

      console.log('[CustomRendererModule] renderAmisSchemaForBpmn - 最终渲染内容:', `<div style="${styleString}">${renderedContent}</div>`);
      return `<div style="${styleString}">${renderedContent}</div>`;
    } catch (e) {
      console.error('渲染AMIS Schema失败:', e);
      return `<div style="color:#aaa;text-align:center;font-size:10px;">[AMIS Error]</div>`;
    }
  }

  // 提取AMIS全局样式
  function extractAmisGlobalStyles(schema) {
    const styles = {};

    // 处理直接的样式属性
    if (schema.style) {
      Object.assign(styles, schema.style);
    }

    // 处理背景色
    if (schema.bodyBgColor) {
      styles['background-color'] = schema.bodyBgColor;
    }

    return styles;
  }

  // 提取AMIS组件样式
  function extractAmisComponentStyles(item) {
    console.log('[CustomRendererModule] extractAmisComponentStyles - 输入项:', item);
    const styles = {};

    // 处理直接的样式属性
    if (item.style) {
      console.log('[CustomRendererModule] extractAmisComponentStyles - 项包含style属性:', item.style);
      Object.assign(styles, item.style);
    }

    // 处理背景色
    if (item.bodyBgColor) {
      console.log('[CustomRendererModule] extractAmisComponentStyles - 项包含bodyBgColor:', item.bodyBgColor);
      styles['background-color'] = item.bodyBgColor;
    }

    if (item.bgColor) {
      console.log('[CustomRendererModule] extractAmisComponentStyles - 项包含bgColor:', item.bgColor);
      styles['background-color'] = item.bgColor;
    }

    // 处理文本颜色
    if (item.color) {
      console.log('[CustomRendererModule] extractAmisComponentStyles - 项包含color:', item.color);
      styles['color'] = item.color;
    }

    // 处理边距和内边距
    if (item.margin !== undefined) {
      console.log('[CustomRendererModule] extractAmisComponentStyles - 项包含margin:', item.margin);
      styles['margin'] = `${item.margin}px`;
    }

    if (item.padding !== undefined) {
      console.log('[CustomRendererModule] extractAmisComponentStyles - 项包含padding:', item.padding);
      styles['padding'] = `${item.padding}px`;
    }

    console.log('[CustomRendererModule] extractAmisComponentStyles - 提取的样式:', styles);
    return Object.keys(styles).length > 0 ? styles : null;
  }

  // 渲染AMIS单项组件
  function renderAmisItem(item) {
    console.log('[CustomRendererModule] renderAmisItem - 输入项:', item);
    if (!item) {
      console.log('[CustomRendererModule] renderAmisItem - 项为空，返回空字符串');
      return '';
    }

    const componentStyles = extractAmisComponentStyles(item);
    const styleString = componentStyles ? Object.entries(componentStyles).map(([key, value]) => `${key}:${value}`).join(';') : '';
    console.log('[CustomRendererModule] renderAmisItem - 提取的组件样式:', componentStyles, '样式字符串:', styleString);

    if (item.type === 'html') {
      console.log('[CustomRendererModule] renderAmisItem - 处理HTML类型，html内容:', item.html);
      // 对于HTML类型，直接输出HTML内容
      const htmlContent = item.html || '';
      return `<div${styleString ? ` style="${styleString}"` : ''}>${htmlContent}</div>`;
    } else if (item.type === 'tpl') {
      console.log('[CustomRendererModule] renderAmisItem - 处理TPL类型，tpl内容:', item.tpl, 'body内容:', item.body);
      return `<div${styleString ? ` style="${styleString}"` : ''}>${item.tpl || item.body || ''}</div>`;
    } else if (item.type === 'text' || item.type === 'static') {
      const textValue = item.value || item.body || item.content || '文本';
      console.log('[CustomRendererModule] renderAmisItem - 处理文本类型，文本值:', textValue);
      return `<span${styleString ? ` style="${styleString}"` : ''}>${textValue}</span>`;
    } else if (item.type === 'image') {
      const imageSrc = item.src || item.url || item.thumbMode || '';
      console.log('[CustomRendererModule] renderAmisItem - 处理图片类型，图片源:', imageSrc);
      return `<img src="${imageSrc}"${styleString ? ` style="${styleString};max-width:100%;max-height:100%;"` : 'style="max-width:100%;max-height:100%;"'} />`;
    } else if (item.type === 'container' || item.type === 'wrapper') {
      console.log('[CustomRendererModule] renderAmisItem - 处理容器类型，body内容:', item.body);
      let bodyContent = '';
      if (Array.isArray(item.body)) {
        console.log('[CustomRendererModule] renderAmisItem - 容器的body为数组，长度:', item.body.length);
        bodyContent = item.body.map((subItem, index) => {
          console.log(`[CustomRendererModule] renderAmisItem - 处理容器[${index}]子项:`, subItem);
          return renderAmisItem(subItem);
        }).join('');
      } else {
        console.log('[CustomRendererModule] renderAmisItem - 容器的body为单个项目:', item.body);
        bodyContent = renderAmisItem(item.body);
      }
      return `<div${styleString ? ` style="${styleString}"` : ''}>${bodyContent}</div>`;
    } else {
      // 对于其他类型的组件，显示简化的表示
      const label = item.label || item.title || `[${item.type}]`;
      console.log('[CustomRendererModule] renderAmisItem - 处理其他类型组件，标签:', label, '类型:', item.type);
      return `<div${styleString ? ` style="${styleString}"` : ''} class="amis-component">${label}</div>`;
    }
  }

  this.handlers['label'] = function () {
    return null
  }
}

CustomRendererModule.$inject = ['config', 'eventBus', 'styles', 'pathMap', 'canvas', 'textRenderer'];

const F = function () {}
F.prototype = BpmnRenderer.prototype
CustomRendererModule.prototype = new F()
CustomRendererModule.prototype.constructor = CustomRendererModule

export default {
  __init__: ['customRendererModule'],
  customRendererModule: ['type', CustomRendererModule]
}