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
        console.log('[CustomRenderer] 渲染自定义 contentHtml:', apiActivityId, window._bpmnContentHtmlMap[apiActivityId])
        htmlDiv.innerHTML = window._bpmnContentHtmlMap[apiActivityId]
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
