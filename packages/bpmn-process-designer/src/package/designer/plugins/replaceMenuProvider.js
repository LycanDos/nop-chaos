import { assign } from 'min-dash'
import { is } from 'bpmn-js/lib/util/ModelUtil'
import { h, createApp, ref, computed, onMounted } from 'vue'
import { ElInput, ElScrollbar, ElLoading } from 'element-plus'
import { isAny } from 'bpmn-js/lib/features/modeling/util/ModelingUtil'

// 静态数据
const staticActivities = [
  { name: '用户任务', type: 'bpmn:UserTask', icon: 'bpmn-icon-user-task' },
  { name: '服务任务', type: 'bpmn:ServiceTask', icon: 'bpmn-icon-service' },
  { name: '发送任务', type: 'bpmn:SendTask', icon: 'bpmn-icon-send' },
  { name: '接收任务', type: 'bpmn:ReceiveTask', icon: 'bpmn-icon-receive' },
  { name: '手工任务', type: 'bpmn:ManualTask', icon: 'bpmn-icon-manual' },
  { name: '业务规则任务', type: 'bpmn:BusinessRuleTask', icon: 'bpmn-icon-business-rule' },
  { name: '脚本任务', type: 'bpmn:ScriptTask', icon: 'bpmn-icon-script' },
  { name: '调用活动', type: 'bpmn:CallActivity', icon: 'bpmn-icon-call-activity' },
  { name: '子流程', type: 'bpmn:SubProcess', icon: 'bpmn-icon-subprocess-expanded' }
]

// API获取数据
async function fetchActivities() {
  try {
    const res = await fetch('/api/bpmn/activities')
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch (e) {
    return []
  }
}

// Vue弹窗内容组件
const ReplaceMenu = {
  props: ['entries', 'onSelect'],
  setup(props) {
    const search = ref('')
    const loading = ref(true)
    const apiList = ref([])
    const allList = computed(() => {
      // 合并静态和API数据，去重
      const map = new Map()
      staticActivities.forEach(item => map.set(item.type, item))
      apiList.value.forEach(item => map.set(item.type, item))
      return Array.from(map.values())
    })
    const filteredList = computed(() => {
      if (!search.value) return allList.value
      return allList.value.filter(item => item.name.includes(search.value))
    })
    onMounted(async () => {
      loading.value = true
      apiList.value = await fetchActivities()
      loading.value = false
    })
    return () => h('div', { style: 'width:260px;padding:8px 0;' }, [
      h(ElInput, {
        modelValue: search.value,
        'onUpdate:modelValue': v => (search.value = v),
        placeholder: '搜索任务类型',
        clearable: true,
        style: 'margin-bottom:8px;'
      }),
      loading.value
        ? h('div', { style: 'text-align:center;padding:20px 0;' }, '加载中...')
        : h(ElScrollbar, { style: 'max-height:320px;' }, () =>
            filteredList.value.map(item =>
              h('div', {
                class: 'bpmn-replace-entry',
                style: 'display:flex;align-items:center;cursor:pointer;padding:6px 12px;',
                onClick: () => props.onSelect(item)
              }, [
                h('span', { class: item.icon, style: 'margin-right:8px;font-size:18px;' }),
                h('span', null, item.name)
              ])
            )
          )
    ])
  }
}

// 新增：保存原生provider
let _originalReplaceMenuProvider = null

export default function ReplaceMenuProvider(popupMenu, modeling, bpmnFactory, elementFactory, translate, injector) {
  this._popupMenu = popupMenu
  this._modeling = modeling
  this._bpmnFactory = bpmnFactory
  this._elementFactory = elementFactory
  this._translate = translate
  // 获取原生provider
  try {
    _originalReplaceMenuProvider = injector.get('originalReplaceMenuProvider', null)
  } catch (e) {
    _originalReplaceMenuProvider = null
  }
  popupMenu.registerProvider('bpmn-replace', this)
}

ReplaceMenuProvider.$inject = [
  'popupMenu',
  'modeling',
  'bpmnFactory',
  'elementFactory',
  'translate',
  'injector'
]

// 原生菜单逻辑简化版（可根据需要扩展）
function getOriginalReplaceEntries(element, translate) {
  const businessObject = element.businessObject
  const actions = {}
  // 事件
  if (isAny(businessObject, ['bpmn:StartEvent', 'bpmn:EndEvent', 'bpmn:IntermediateThrowEvent', 'bpmn:BoundaryEvent'])) {
    assign(actions, {
      'replace-with-none': {
        group: 'event',
        className: 'bpmn-icon-start-event-none',
        title: translate('替换为无类型事件'),
        action: () => {}
      }
    })
  }
  // 网关
  if (isAny(businessObject, ['bpmn:ExclusiveGateway', 'bpmn:ParallelGateway', 'bpmn:InclusiveGateway'])) {
    assign(actions, {
      'replace-with-exclusive-gateway': {
        group: 'gateway',
        className: 'bpmn-icon-gateway-none',
        title: translate('替换为互斥网关'),
        action: () => {}
      }
    })
  }
  // 其他类型可继续扩展
  return actions
}

ReplaceMenuProvider.prototype.getPopupMenuEntries = function(element) {
  const activityTypes = [
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
  if (activityTypes.includes(element.type)) {
    console.log('[replaceMenuProvider] activity节点显示自定义菜单', element)
    return {
      'replace-with-custom': {
        label: '自定义替换',
        className: 'bpmn-icon-user-task',
        action: (event, el) => {
          setTimeout(() => {
            const container = document.querySelector('.djs-popup .djs-popup-body')
            if (container) {
              this._renderCustom(container, el, () => {})
              console.log('[replaceMenuProvider] 自定义弹窗已渲染')
            } else {
              console.warn('[replaceMenuProvider] 未找到弹窗容器')
            }
          }, 0)
        }
      }
    }
  } else {
    console.log('[replaceMenuProvider] 非activity节点显示原生菜单', element)
    return getOriginalReplaceEntries(element, this._translate)
  }
}

ReplaceMenuProvider.prototype._renderCustom = function(container, element, onSelect) {
  // 仅对 activity 类型节点自定义弹窗
  const activityTypes = [
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
  if (!activityTypes.includes(element.type)) {
    // 非 activity 类型，保留原菜单
    return
  }
  // 挂载Vue组件
  container.innerHTML = ''
  const self = this
  const app = createApp(ReplaceMenu, {
    entries: [],
    onSelect: (item) => {
      // 迁移原节点属性，保证替换后节点正常
      const oldBo = element.businessObject
      const newShape = self._elementFactory.createShape({ type: item.type })
      const newBo = newShape.businessObject
      // 迁移常用属性
      newBo.id = oldBo.id
      newBo.name = oldBo.name
      // 迁移扩展属性
      if (oldBo.extensionElements) {
        newBo.extensionElements = oldBo.extensionElements
      }
      // 迁移文档
      if (oldBo.documentation) {
        newBo.documentation = oldBo.documentation
      }
      // 迁移自定义属性（如formKey等）
      if (oldBo.formKey) {
        newBo.formKey = oldBo.formKey
      }
      // 迁移多余属性（可按需扩展）
      // ...
      // 替换节点
      self._modeling.replaceElement(element, newShape)
      self._popupMenu.close()
    }
  })
  app.mount(container)
}

// 劫持 open 方法，activity节点弹出自定义弹窗
ReplaceMenuProvider.prototype.register = function() {
  const popupMenu = this._popupMenu
  const self = this
  const origOpen = popupMenu.open
  popupMenu.open = function(element, type, position) {
    if (type === 'bpmn-replace') {
      const activityTypes = [
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
      if (activityTypes.includes(element.type)) {
        origOpen.call(this, element, type, position)
        const container = document.querySelector('.djs-popup .djs-popup-body')
        if (container) {
          self._renderCustom(container, element, () => {})
        }
        return
      }
    }
    return origOpen.call(this, element, type, position)
  }
} 