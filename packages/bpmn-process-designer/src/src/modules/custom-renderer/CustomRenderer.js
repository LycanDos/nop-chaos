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

/**
 * 简化的AMIS schema渲染器
 */
function renderAmisSchemaSimple(schema) {
  console.log('[renderAmisSchemaSimple] 输入schema:', schema)

  try {
    // 处理page类型
    if (schema.type === 'page' && schema.body) {
      console.log('[renderAmisSchemaSimple] 处理page类型，body:', schema.body)
      if (Array.isArray(schema.body)) {
        return schema.body.map(item => renderAmisItem(item)).join('')
      } else {
        return renderAmisItem(schema.body)
      }
    } else {
      return renderAmisItem(schema)
    }
  } catch (e) {
    console.error('[renderAmisSchemaSimple] 渲染错误:', e)
    return '<div style="color:#f00;">渲染错误</div>'
  }
}

/**
 * 渲染单个AMIS组件
 */
function renderAmisItem(item) {
  console.log('[renderAmisItem] 渲染项:', item)

  if (!item) return ''

  const styleString = extractStyles(item)

  if (item.type === 'html') {
    console.log('[renderAmisItem] HTML类型，内容:', item.html)
    return `<div${styleString ? ` style="${styleString}"` : ''}>${item.html || ''}</div>`
  } else if (item.type === 'tpl') {
    return `<div${styleString ? ` style="${styleString}"` : ''}>${item.tpl || item.body || ''}</div>`
  } else if (item.type === 'text' || item.type === 'static') {
    const textValue = item.value || item.body || item.content || '文本'
    return `<span${styleString ? ` style="${styleString}"` : ''}>${textValue}</span>`
  } else if (item.type === 'image') {
    const imageSrc = item.src || item.url || ''
    return `<img src="${imageSrc}"${styleString ? ` style="${styleString};max-width:100%;max-height:100%;"` : ' style="max-width:100%;max-height:100%;"'} />`
  } else if (item.type === 'container' || item.type === 'wrapper') {
    let bodyContent = ''
    if (Array.isArray(item.body)) {
      bodyContent = item.body.map(subItem => renderAmisItem(subItem)).join('')
    } else if (item.body) {
      bodyContent = renderAmisItem(item.body)
    }
    return `<div${styleString ? ` style="${styleString}"` : ''}>${bodyContent}</div>`
  } else {
    const label = item.label || item.title || `[${item.type}]`
    return `<div${styleString ? ` style="${styleString}"` : ''}>${label}</div>`
  }
}

/**
 * 提取样式
 */
function extractStyles(item) {
  const styles = []

  if (item.style && typeof item.style === 'object') {
    Object.entries(item.style).forEach(([key, value]) => {
      styles.push(`${key}:${value}`)
    })
  }

  if (item.bgColor || item.bodyBgColor) {
    styles.push(`background-color:${item.bgColor || item.bodyBgColor}`)
  }

  if (item.color) {
    styles.push(`color:${item.color}`)
  }

  return styles.length > 0 ? styles.join(';') : ''
}


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

function CustomRenderer(config, eventBus, styles, pathMap, canvas, textRenderer) {
  BpmnRenderer.call(this, config, eventBus, styles, pathMap, canvas, textRenderer, 2000)
  const self = this
  // 重写 drawShape
  this.drawShape = function(parentNode, element) {
    // 先画原生节点
    const shape = BpmnRenderer.prototype.drawShape.call(this, parentNode, element)
    // 只处理 activity
    if (ACTIVITY_TYPES.includes(element.type)) {
      console.log('[CustomRenderer] drawShape 处理节点:', element)
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
      htmlDiv.style.fontSize = '14px'
      htmlDiv.style.pointerEvents = 'none'
      // 默认内容
      htmlDiv.innerHTML = "<div style='color:#aaa;text-align:center;'>无内容</div>"
      // 优先渲染window._bpmnContentHtmlMap中的内容（仅API数据才有）
      // 这里的apiActivityId实际为接口返回的code
      let apiActivityId = null
      if (element.businessObject && element.businessObject.extensionElements && element.businessObject.extensionElements.values) {
        const doc = element.businessObject.extensionElements.values.find(e => e.$type === 'bpmn:Documentation' && e.text && e.text.startsWith('apiActivityId:'))
        if (doc) {
          apiActivityId = doc.text.replace('apiActivityId:', '')
        }
      }
      // 只允许API节点（有apiActivityId且命中内容）渲染自定义html，否则一律显示默认内容
      console.log('[CustomRenderer] 渲染节点:', {
        bpmnId: element.businessObject && element.businessObject.id,
        apiActivityId,
        _bpmnContentHtmlMap: window._bpmnContentHtmlMap
      })
      if (apiActivityId && window._bpmnContentHtmlMap && window._bpmnContentHtmlMap[apiActivityId]) {
        const contentHtml = window._bpmnContentHtmlMap[apiActivityId]
        console.log('[CustomRenderer] 渲染自定义 contentHtml:', apiActivityId, contentHtml)

        // 尝试解析JSON并渲染AMIS schema
        try {
          let parsedContent = null

          // 如果是字符串，尝试解析为JSON
          if (typeof contentHtml === 'string') {
            try {
              parsedContent = JSON.parse(contentHtml)
              console.log('[CustomRenderer] JSON解析成功:', parsedContent)
            } catch (e) {
              console.log('[CustomRenderer] JSON解析失败，作为HTML显示:', e.message)
              parsedContent = null
            }
          } else {
            parsedContent = contentHtml
          }

          // 如果解析成功且是有效的AMIS schema
          if (parsedContent && typeof parsedContent === 'object' && parsedContent.type) {
            console.log('[CustomRenderer] 检测到AMIS schema，类型:', parsedContent.type)
            // 渲染AMIS schema
            const amisHtml = renderAmisSchemaSimple(parsedContent)
            htmlDiv.innerHTML = amisHtml
          } else if (typeof contentHtml === 'string' && (contentHtml.includes('<') || contentHtml.includes('>'))) {
            // 如果看起来像HTML，直接显示
            htmlDiv.innerHTML = contentHtml
          } else {
            // 否则显示为纯文本
            htmlDiv.textContent = String(contentHtml)
          }
        } catch (e) {
          console.error('[CustomRenderer] 渲染错误:', e)
          htmlDiv.innerHTML = "<div style='color:#f00;text-align:center;'>渲染错误</div>"
        }
      } else {
        htmlDiv.innerHTML = "<div style='color:#aaa;text-align:center;'>无内容</div>"
        while (htmlDiv.childNodes.length > 1) htmlDiv.removeChild(htmlDiv.lastChild)
        console.log('[CustomRenderer] 未命中自定义 contentHtml:', apiActivityId, window._bpmnContentHtmlMap)
      }
      fo.appendChild(htmlDiv)
      parentNode.appendChild(fo)
    }
    return shape
  }

  this.handlers['label'] = function () {
    return null
  }
}
CustomRenderer.$inject = ['config', 'eventBus', 'styles', 'pathMap', 'canvas', 'textRenderer'];

const F = function () {}
F.prototype = BpmnRenderer.prototype
CustomRenderer.prototype = new F()
CustomRenderer.prototype.constructor = CustomRenderer

export default CustomRenderer;
