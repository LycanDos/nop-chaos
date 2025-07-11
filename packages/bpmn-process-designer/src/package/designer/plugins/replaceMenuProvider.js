import { assign } from 'min-dash'
import { is } from 'bpmn-js/lib/util/ModelUtil'
import { h, createApp, ref, computed, onMounted, watchEffect } from 'vue'
import { ElInput, ElScrollbar, ElLoading } from 'element-plus'
import { isAny } from 'bpmn-js/lib/features/modeling/util/ModelingUtil'
// 1. 引入官方 ReplaceMenuProvider 和 ReplaceOptions
import BpmnReplaceMenuProvider from 'bpmn-js/lib/features/popup-menu/ReplaceMenuProvider'
import * as replaceOptions from 'bpmn-js/lib/features/replace/ReplaceOptions'

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
    return () =>
      h('div', { style: 'width:260px;max-height:400px;padding:8px 0;' }, [
        h(ElInput, {
          modelValue: search.value,
          'onUpdate:modelValue': v => (search.value = v),
          placeholder: '搜索任务类型',
          clearable: true,
          style: 'margin-bottom:8px;'
        }),
        loading.value
          ? h('div', { style: 'text-align:center;padding:20px 0;' }, '加载中...')
          : h(ElScrollbar, { style: 'max-height:340px;' }, () =>
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

// 注入更精致的全局样式（只注入一次）
if (typeof window !== 'undefined' && !window.__bpmn_replace_hover_style__) {
  const style = document.createElement('style')
  style.innerHTML = `
    .bpmn-replace-list {
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.10), 0 1.5px 4px rgba(0,0,0,0.08);
      padding: 0;
      margin: 0;
      border: 1px solid #ebeef5;
      min-width: 220px;
      max-width: 320px;
      overflow: auto;
    }
    .bpmn-replace-search {
      margin: 0 0 6px 0;
      padding: 0;
      background: transparent;
      border-radius: 8px 8px 0 0;
      border: none;
      box-shadow: none;
      display: inline-block;
      vertical-align: middle;
    }
    .bpmn-replace-search .el-input {
      border-radius: 6px;
      border: 1px solid #dcdfe6;
      background: #f8fafd;
      font-size: 13px;
      height: 32px;
    }
    .bpmn-replace-list:empty {
      min-height: 40px;
    }
    .bpmn-replace-list + .bpmn-replace-list {
      border-top: 1px solid #ebeef5;
    }
    .bpmn-replace-entry {
      display: flex;
      align-items: center;
      cursor: pointer;
      padding: 7px 18px 7px 14px;
      font-size: 14px;
      line-height: 22px;
      border-bottom: 1px solid #f2f3f5;
      transition: background 0.18s, color 0.18s;
      user-select: none;
      min-width: 180px;
    }
    .bpmn-replace-entry:last-child {
      border-bottom: none;
    }
    .bpmn-replace-entry:hover {
      background: #f5f7fa;
      color: #409eff;
    }
    .bpmn-replace-entry:active {
      background: #e6f0fb;
      color: #337ecc;
    }
    .bpmn-replace-entry .bpmn-icon {
      font-size: 18px !important;
      margin-right: 10px;
      width: 22px;
      text-align: center;
      color: #606266;
      flex-shrink: 0;
    }
    .bpmn-replace-entry:hover .bpmn-icon {
      color: #409eff;
    }
    .bpmn-replace-entry span:last-child {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .bpmn-replace-list::-webkit-scrollbar {
      width: 6px;
      background: transparent;
    }
    .bpmn-replace-list::-webkit-scrollbar-thumb {
      background: #e4e7ed;
      border-radius: 3px;
    }
    .bpmn-replace-list::-webkit-scrollbar-track {
      background: transparent;
    }
  `
  document.head.appendChild(style)
  window.__bpmn_replace_hover_style__ = true
}

// 4. 自定义 Provider 封装
export default function CustomReplaceMenuProvider(
  bpmnFactory, popupMenu, modeling, moddle, bpmnReplace, rules, translate, moddleCopy, elementFactory, injector
) {
  // 复用官方 provider
  const nativeProvider = new BpmnReplaceMenuProvider(
    bpmnFactory, popupMenu, modeling, moddle, bpmnReplace, rules, translate, moddleCopy
  )
  this._nativeProvider = nativeProvider
  this._popupMenu = popupMenu
  this._modeling = modeling
  this._elementFactory = elementFactory
  this._translate = translate
  this._bpmnReplace = bpmnReplace
  this._moddle = moddle
  this._rules = rules
  this._moddleCopy = moddleCopy
  // 注册自定义 provider，覆盖原生
  popupMenu.registerProvider('bpmn-replace', this)
}
CustomReplaceMenuProvider.$inject = [
  'bpmnFactory',
  'popupMenu',
  'modeling',
  'moddle',
  'bpmnReplace',
  'rules',
  'translate',
  'moddleCopy',
  'elementFactory',
  'injector'
]
// 5. 判断 Task 类节点
const taskTypes = [
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
// 6. 重写 getPopupMenuEntries
CustomReplaceMenuProvider.prototype.getPopupMenuEntries = function(element) {
  if (taskTypes.includes(element.type)) {
    // 只返回一个自定义入口，阻止原生菜单渲染
    return {
      'replace-with-custom-search': {
        label: '',
        className: '',
        action: () => {}
      }
    }
  } else {
    // 非 Task 节点，完全走原生
    return this._nativeProvider.getPopupMenuEntries(element)
  }
}
// 7. 重写 getPopupMenuHeaderEntries，复用原生逻辑
CustomReplaceMenuProvider.prototype.getPopupMenuHeaderEntries = function(element) {
  return this._nativeProvider.getPopupMenuHeaderEntries(element)
}
// 8. 劫持 open 方法，Task 节点弹窗顶部插入自定义 Vue 搜索区，且移除原生菜单内容
CustomReplaceMenuProvider.prototype.register = function() {
  const popupMenu = this._popupMenu
  const self = this
  const origOpen = popupMenu.open
  let globalSearchValue = '' // 全局搜索关键字
  popupMenu.open = function(element, type, position) {
    if (type === 'bpmn-replace' && taskTypes.includes(element.type)) {
      origOpen.call(this, element, type, position)
      setTimeout(() => {
        const container = document.querySelector('.djs-popup .djs-popup-body')
        const header = document.querySelector('.djs-popup .djs-popup-header')
        if (container) {
          container.innerHTML = ''
          // 统一的响应式搜索关键字
          const search = window.Vue ? window.Vue.ref('') : ref('')
          // 只渲染任务类型列表（带滚动）
          const listDiv = document.createElement('div')
          listDiv.className = 'bpmn-replace-list'
          listDiv.style.maxHeight = '340px'
          listDiv.style.overflowY = 'auto'
          container.appendChild(listDiv)
          // 挂载 Vue 任务类型列表（不含搜索框）
          const app = createApp({
            setup() {
              const loading = ref(true)
              const apiList = ref([])
              const allList = computed(() => {
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
              return () => loading.value
                ? h('div', { style: 'text-align:center;padding:20px 0;' }, '加载中...')
                : filteredList.value.map(item =>
                    h('div', {
                      class: 'bpmn-replace-entry',
                      style: 'display:flex;align-items:center;cursor:pointer;padding:6px 12px;',
                      onClick: () => self._bpmnReplace.replaceElement(element, { type: item.type }) && popupMenu.close()
                    }, [
                      h('span', { class: item.icon, style: 'margin-right:8px;font-size:18px;' }),
                      h('span', null, item.name)
                    ])
                  )
            }
          })
          app.mount(listDiv)
          // 渲染搜索框到 header，插入到最左侧
          if (header && !header.querySelector('.bpmn-replace-search')) {
            const searchDiv = document.createElement('div')
            searchDiv.className = 'bpmn-replace-search'
            searchDiv.style.padding = '0 8px 0 0'
            searchDiv.style.display = 'inline-block'
            searchDiv.style.verticalAlign = 'middle'
            searchDiv.style.width = '180px'
            header.insertBefore(searchDiv, header.firstChild)
            // 只挂载搜索框，直接绑定同一个 search 变量
            const searchApp = createApp({
              setup() {
                // 处理自定义清空按钮点击
                const handleClear = (event) => {
                  event && event.stopPropagation && event.stopPropagation()
                  search.value = ''
                }
                return () => h(ElInput, {
                  modelValue: search.value,
                  'onUpdate:modelValue': v => (search.value = v),
                  placeholder: '搜索任务类型',
                  // 不用 clearable，改用自定义插槽
                  size: 'small',
                  style: 'margin-bottom:0;width:170px;vertical-align:middle;'
                }, {
                  suffix: () => search.value ? h('span', {
                    class: 'el-input__clear',
                    style: 'cursor:pointer;',
                    onMousedown: (e) => { e.stopPropagation(); e.preventDefault() },
                    onClick: (e) => { e.stopPropagation(); e.preventDefault(); search.value = '' }
                  }, '✕') : null
                })
              }
            })
            searchApp.mount(searchDiv)
          }
        }
      }, 0)
      return
    }
    return origOpen.call(this, element, type, position)
  }
} 