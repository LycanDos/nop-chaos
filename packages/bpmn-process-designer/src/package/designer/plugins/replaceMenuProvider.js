import { assign } from 'min-dash'
import { is } from 'bpmn-js/lib/util/ModelUtil'
import { h, createApp, ref, computed, onMounted, watchEffect } from 'vue'
import { ElInput, ElScrollbar, ElLoading } from 'element-plus'
import { isAny } from 'bpmn-js/lib/features/modeling/util/ModelingUtil'
// 1. 引入官方 ReplaceMenuProvider 和 ReplaceOptions
import BpmnReplaceMenuProvider from 'bpmn-js/lib/features/popup-menu/ReplaceMenuProvider'
import * as replaceOptions from 'bpmn-js/lib/features/replace/ReplaceOptions'

// 静态数据常量
const STATIC_ACTIVITIES = [
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
    // 首先尝试从预加载的缓存中获取数据
    if (window._bpmnMenuCache) {
      console.log('[replaceMenuProvider] 从预加载缓存获取菜单数据');
      
      // 只返回API数据，避免与静态数据重复
      const apiActivities = window._bpmnMenuCache.apiActivities || [];
      
      console.log('[replaceMenuProvider] 从缓存获取的API数据:', {
        apiCount: apiActivities.length,
        apiActivities: apiActivities
      });
      
      return apiActivities;
    }
    
    // 如果缓存中没有数据，尝试实时获取
    console.log('[replaceMenuProvider] 缓存中没有数据，尝试实时获取');
    
    // 支持全局 window.BPMN_API_BASE 或 VITE_BPMN_API_BASE
    const base = (typeof window !== 'undefined' && window.BPMN_API_BASE) || (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_BPMN_API_BASE) || ''
    const url = base + '/api/bpmn/activities'
    console.log('[replaceMenuProvider] fetchActivities 请求地址:', url)
    const res = await fetch(url)
    console.log('[replaceMenuProvider] fetchActivities 响应:', res)
    if (!res.ok) {
      console.warn('[replaceMenuProvider] fetchActivities 响应非200:', res.status)
      return []
    }
    const data = await res.json()
    console.log('[replaceMenuProvider] fetchActivities 数据:', data)
    
    // 同时更新缓存
    if (!window._bpmnMenuCache) {
      window._bpmnMenuCache = { 
        apiActivities: [], 
        staticActivities: [],
        apiStyles: [], 
        staticStyles: {} 
      };
    }
    window._bpmnMenuCache.apiActivities = Array.isArray(data) ? data.map(item => ({
      ...item,
      source: 'api',
      key: item.code
    })) : [];
    
    return Array.isArray(data) ? data : []
  } catch (e) {
    console.error('[replaceMenuProvider] fetchActivities 异常:', e)
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
      // 静态数据
      const staticList = STATIC_ACTIVITIES.map(item => ({ ...item, source: 'static' }))
      
      // API数据，避免与静态数据重复
      const apiData = apiList.value.map(item => {
        // 支持API自定义icon、iconClass、iconColor、bgColor等样式
        const match = STATIC_ACTIVITIES.find(s => s.type === item.type)
        const style = item.itemStyle || {}
        return {
          ...item,
          id: item.code, // 用code作为唯一标识
          icon: style.icon || (match ? match.icon : ''),
          iconClass: style.iconClass || '',
          iconColor: style.iconColor || '',
          bgColor: style.bgColor || '',
          source: 'api'
        }
      })
      
      // 去重逻辑：如果API数据中有与静态数据相同type的项目，优先使用API数据
      const staticTypes = new Set(STATIC_ACTIVITIES.map(item => item.type))
      const uniqueApiData = apiData.filter(apiItem => {
        // 如果API项目的type在静态数据中存在，且API项目有自定义内容，则保留API数据
        if (staticTypes.has(apiItem.type)) {
          // 检查API数据是否有自定义内容（非默认值）
          const hasCustomContent = apiItem.name !== apiItem.type || 
                                 apiItem.iconColor || 
                                 apiItem.bgColor || 
                                 apiItem.iconClass ||
                                 apiItem.icon;
          return hasCustomContent;
        }
        // 如果API项目的type不在静态数据中，则保留
        return true;
      })
      
      // 过滤掉静态数据中与API数据重复的type
      const filteredStaticList = staticList.filter(staticItem => {
        return !uniqueApiData.some(apiItem => apiItem.type === staticItem.type);
      })
      
      const arr = [...filteredStaticList, ...uniqueApiData]
      console.log('[replaceMenuProvider] allList 合并后:', {
        staticCount: filteredStaticList.length,
        apiCount: uniqueApiData.length,
        totalCount: arr.length,
        staticItems: filteredStaticList.map(item => item.name),
        apiItems: uniqueApiData.map(item => item.name)
      })
      return arr
    })
    const filterStaticOnly = ref(false)
    const filteredList = computed(() => {
      let list = allList.value
      if (filterStaticOnly.value) {
        list = list.filter(item => item.source === 'static')
      }
      if (!search.value) {
        return list
      }
      return list.filter(item => item.name.includes(search.value))
    })
    onMounted(async () => {
      loading.value = true
      apiList.value = await fetchActivities()
      loading.value = false
      console.log('[replaceMenuProvider] onMounted apiList:', apiList.value)
    })
    return () =>
      h('div', { style: 'width:260px;max-height:400px;padding:8px 0;' }, [
        h('div', { style: 'display:flex;align-items:center;margin-bottom:8px;' }, [
          h(ElInput, {
            modelValue: search.value,
            'onUpdate:modelValue': v => (search.value = v),
            placeholder: '搜索任务类型',
            clearable: true,
            style: 'flex:1;'
          }),
          h('button', {
            style: `margin-left:6px;border:none;background:none;cursor:pointer;padding:0;outline:none;display:flex;align-items:center;${filterStaticOnly.value ? 'color:#409eff;' : 'color:#bbb;'}`,
            title: '仅显示静态',
            onClick: () => { filterStaticOnly.value = !filterStaticOnly.value }
          }, [
            h('svg', { width: 20, height: 20, viewBox: '0 0 20 20' }, [
              h('rect', { x: 3, y: 6, width: 14, height: 8, rx: 3, fill: filterStaticOnly.value ? '#409eff' : '#bbb', stroke: filterStaticOnly.value ? '#409eff' : '#bbb', 'stroke-width': 1 }),
              h('rect', { x: 7, y: 9, width: 6, height: 2, fill: '#fff' })
            ])
          ])
        ]),
        loading.value
          ? h('div', { style: 'text-align:center;padding:20px 0;' }, '加载中...')
          : h(ElScrollbar, { style: 'max-height:340px;' }, () =>
              filteredList.value.map(item =>
                h('div', {
                  class: 'bpmn-replace-entry',
                  style: 'display:flex;align-items:center;cursor:pointer;padding:6px 12px;',
                  onClick: () => props.onSelect(item)
                }, [
                  h('span', {
                    class: item.iconClass ? item.iconClass : item.icon,
                    style: `margin-right:8px;font-size:18px;${item.iconColor ? `color:${item.iconColor};` : ''}${item.bgColor ? `background:${item.bgColor};border-radius:3px;` : ''}`
                  }),
                  h('span', null, item.name),
                  h('span', { style: 'margin-left:8px;font-size:12px;color:#bbb;' }, item.id)
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
        const popup = document.querySelector('.djs-popup');
        if (popup) {
          // palette宽度，按实际调整
          const paletteWidth = 60;
          const left = parseInt(popup.style.left || '0', 10);
          popup.style.left = (left + paletteWidth) + 'px';
          popup.style.zIndex = 9999;
        }
      }, 0);
      setTimeout(() => {
        const container = document.querySelector('.djs-popup .djs-popup-body')
        const header = document.querySelector('.djs-popup .djs-popup-header')
        if (container) {
          container.innerHTML = ''
          // 统一的响应式搜索关键字
          const search = window.Vue ? window.Vue.ref('') : ref('')
          const filterStaticOnly = window.Vue ? window.Vue.ref(false) : ref(false)
          // 只渲染任务类型列表（带滚动）
          const listDiv = document.createElement('div')
          listDiv.className = 'bpmn-replace-list'
          listDiv.style.maxHeight = '340px'
          listDiv.style.overflowY = 'auto'
          container.appendChild(listDiv)
          // 挂载 Vue 任务类型列表（不含搜索框）
          const app = createApp({
            setup(props) {
              const p = props
              const loading = ref(true)
              const apiList = ref([])
              const allList = computed(() => {
                // 静态数据
                const staticList = STATIC_ACTIVITIES.map(item => ({ ...item, source: 'static' }))
                
                // API数据，避免与静态数据重复
                const apiData = apiList.value.map(item => {
                  // 支持API自定义icon、iconClass、iconColor、bgColor等样式
                  const style = item.itemStyle || {}
                  return {
                    ...item,
                    id: item.code, // 用code作为唯一标识
                    icon: style.icon || '',
                    iconClass: style.iconClass || '',
                    iconColor: style.iconColor || '',
                    bgColor: style.bgColor || '',
                    source: 'api'
                  }
                })
                
                // 去重逻辑：如果API数据中有与静态数据相同type的项目，优先使用API数据
                const staticTypes = new Set(STATIC_ACTIVITIES.map(item => item.type))
                const uniqueApiData = apiData.filter(apiItem => {
                  // 如果API项目的type在静态数据中存在，且API项目有自定义内容，则保留API数据
                  if (staticTypes.has(apiItem.type)) {
                    // 检查API数据是否有自定义内容（非默认值）
                    const hasCustomContent = apiItem.name !== apiItem.type || 
                                           apiItem.iconColor || 
                                           apiItem.bgColor || 
                                           apiItem.iconClass ||
                                           apiItem.icon;
                    return hasCustomContent;
                  }
                  // 如果API项目的type不在静态数据中，则保留
                  return true;
                })
                
                // 过滤掉静态数据中与API数据重复的type
                const filteredStaticList = staticList.filter(staticItem => {
                  return !uniqueApiData.some(apiItem => apiItem.type === staticItem.type);
                })
                
                const arr = [...filteredStaticList, ...uniqueApiData]
                console.log('[replaceMenuProvider] 弹窗组件 allList 合并后:', {
                  staticCount: filteredStaticList.length,
                  apiCount: uniqueApiData.length,
                  totalCount: arr.length
                })
                return arr
              })
              const filteredList = computed(() => {
                let list = allList.value
                if (filterStaticOnly.value) {
                  list = list.filter(item => item.source === 'static')
                }
                if (!search.value) return list
                return list.filter(item => item.name.includes(search.value))
              })
              onMounted(async () => {
                loading.value = true
                apiList.value = await fetchActivities()
                loading.value = false
              })
              return () => loading.value
                ? h('div', { style: 'text-align:center;padding:20px 0;' }, '加载中...')
                : filteredList.value.map((item, idx) => {
                    return h('div', {
                      class: 'bpmn-replace-entry',
                      key: `${item.type}_${item.source}_${idx}`,
                      style: 'display:flex;align-items:center;cursor:pointer;padding:6px 12px;',
                      onClick: async () => {
                        if (item.source === 'api') {
                          const base = (typeof window !== 'undefined' && window.BPMN_API_BASE)
                            || (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_BPMN_API_BASE)
                          const url = base + '/api/bpmn/activitiesStyle?id=' + encodeURIComponent(item.code) + '&_t=' + Date.now()
                          console.log('[replaceMenuProvider] 点击API节点:', item)
                          console.log('[replaceMenuProvider] fetch activitiesStyle url:', url)
                          try {
                            const res = await fetch(url)
                            const data = await res.json()
                            if (!window._bpmnContentHtmlMap) window._bpmnContentHtmlMap = {}
                            console.log('[replaceMenuProvider] fetch activitiesStyle 返回:', data)
                            window._bpmnContentHtmlMap[item.code] = data.contentHtml || ''
                            console.log('[replaceMenuProvider] _bpmnContentHtmlMap 写入:', JSON.stringify(window._bpmnContentHtmlMap))
                            
                            // 缓存API样式数据到全局缓存
                            if (!window._bpmnMenuCache) {
                              window._bpmnMenuCache = { 
                                apiActivities: [], 
                                staticActivities: [],
                                apiStyles: [], 
                                staticStyles: {} 
                              };
                            }
                            
                            // 只缓存htmlContent，其他样式数据已在菜单数据缓存时处理
                            const existingStyle = window._bpmnMenuCache.apiStyles.find(style => style.code === item.code);
                            if (existingStyle && data.itemStyle && data.itemStyle.htmlContent) {
                              // 只更新htmlContent
                              existingStyle.itemStyle.htmlContent = data.itemStyle.htmlContent;
                              console.log('[replaceMenuProvider] 更新API样式数据的htmlContent:', item.code, data.itemStyle.htmlContent);
                            } else if (!existingStyle && data.itemStyle) {
                              // 如果缓存中没有该样式数据，创建新的样式数据（只包含htmlContent）
                              const styleData = {
                                code: item.code,
                                name: item.name,
                                type: item.type,
                                itemStyle: {
                                  name: data.itemStyle.name || item.name,
                                  type: data.itemStyle.type || item.type,
                                  iconColor: data.itemStyle.iconColor || '',
                                  bgColor: data.itemStyle.bgColor || '',
                                  iconClass: data.itemStyle.iconClass || '',
                                  icon: data.itemStyle.icon || '',
                                  htmlContent: data.itemStyle.htmlContent || ''
                                },
                                source: 'api',
                                key: item.code
                              };
                              window._bpmnMenuCache.apiStyles.push(styleData);
                              console.log('[replaceMenuProvider] 缓存API样式数据（包含htmlContent）:', styleData);
                            }
                            
                            console.log('[replaceMenuProvider] 当前缓存的所有API样式数据:', window._bpmnMenuCache.apiStyles);
                            
                            // fetch后强制刷新所有节点，彻底触发重绘
                            setTimeout(() => {
                              if (window._debugModeler && window._debugModeler.get) {
                                const registry = window._debugModeler.get('elementRegistry')
                                const allElements = registry.getAll && typeof registry.getAll === 'function' ? registry.getAll() : Object.values(registry._elements).map(e => e.element)
                                console.log('[replaceMenuProvider] 触发 elements.changed 刷新节点:', allElements.map(e => e.id))
                                window._debugModeler.get('eventBus').fire('elements.changed', { elements: allElements })
                              }
                            }, 0)
                          } catch (e) {
                            console.error('fetch activitiesStyle error', e)
                          }
                        }
                        // 替换节点类型并关闭弹窗，API数据写入扩展属性apiActivityId
                        let props = { type: item.type }
                        if (item.source === 'api') {
                          props.id = undefined // 让bpmn自动生成id
                        }
                        // 替换节点
                        const newElement = self._bpmnReplace.replaceElement(element, props)
                        // API数据写入扩展属性
                        if (item.source === 'api' && newElement && newElement.businessObject) {
                          // 写入扩展属性apiActivityId
                          let moddle = self._moddle
                          let extensionElements = newElement.businessObject.extensionElements
                          if (!extensionElements) {
                            extensionElements = moddle.create('bpmn:ExtensionElements', { values: [] })
                            newElement.businessObject.extensionElements = extensionElements
                          }
                          // 删除所有旧的apiActivityId属性，确保只保留当前code
                          extensionElements.values = extensionElements.values.filter(e => !(e.$type === 'bpmn:Documentation' && e.text && e.text.startsWith('apiActivityId:')))
                          // 添加当前code
                          let doc = moddle.create('bpmn:Documentation', { text: 'apiActivityId:' + item.code })
                          extensionElements.get('values').push(doc)
                          // 强制同步更新属性，确保立即生效
                          self._modeling.updateProperties(newElement, { extensionElements })
                        }
                        // 非API数据，清除apiActivityId扩展属性
                        if (item.source !== 'api' && newElement && newElement.businessObject && newElement.businessObject.extensionElements) {
                          let extensionElements = newElement.businessObject.extensionElements
                          let idx = extensionElements.values.findIndex(e => e.$type === 'bpmn:Documentation' && e.text && e.text.startsWith('apiActivityId:'))
                          if (idx !== -1) {
                            extensionElements.values.splice(idx, 1)
                            // 强制同步更新属性，确保立即生效
                            self._modeling.updateProperties(newElement, { extensionElements })
                          }
                        }
                        popupMenu.close()
                        // 强制刷新新节点
                        setTimeout(() => {
                          if (window._debugModeler && window._debugModeler.get) {
                            const el = window._debugModeler.get('elementRegistry').get(newElement.id)
                            if (el) {
                              window._debugModeler.get('eventBus').fire('elements.changed', { elements: [el] })
                              window._debugModeler.get('eventBus').fire('element.changed', { element: el })
                            }
                          }
                        }, 0)
                      }
                    }, [
                      h('span', {
                        class: item.iconClass ? item.iconClass : item.icon,
                        style: `margin-right:8px;font-size:18px;${item.iconColor ? `color:${item.iconColor};` : ''}${item.bgColor ? `background:${item.bgColor};border-radius:3px;` : ''}`
                      }),
                      h('span', null, item.name),
                      h('span', { style: 'margin-left:8px;font-size:12px;color:#bbb;' }, item.id)
                    ])
                  })
            }
          })
          app.mount(listDiv)
          // 渲染搜索框和过滤按钮到 header，插入到最左侧
          if (header && !header.querySelector('.bpmn-replace-search')) {
            const searchDiv = document.createElement('div')
            searchDiv.className = 'bpmn-replace-search'
            searchDiv.style.padding = '0 8px 0 0'
            searchDiv.style.display = 'inline-block'
            searchDiv.style.verticalAlign = 'middle'
            searchDiv.style.width = '220px'
            header.insertBefore(searchDiv, header.firstChild)
            // 搜索框+按钮
            const searchApp = createApp({
              setup() {
                return () => h('div', { style: 'display:flex;align-items:center;' }, [
                  h(ElInput, {
                    modelValue: search.value,
                    'onUpdate:modelValue': v => (search.value = v),
                    placeholder: '搜索任务类型',
                    clearable: true,
                    size: 'small',
                    style: 'flex:1;margin-right:4px;'
                  }),
                  h('button', {
                    style: `border:none;background:none;cursor:pointer;padding:0;outline:none;display:flex;align-items:center;${filterStaticOnly.value ? 'color:#409eff;' : 'color:#bbb;'}`,
                    title: '仅显示静态',
                    onClick: () => { filterStaticOnly.value = !filterStaticOnly.value }
                  }, [
                    h('svg', { width: 20, height: 20, viewBox: '0 0 20 20' }, [
                      h('rect', { x: 3, y: 6, width: 14, height: 8, rx: 3, fill: filterStaticOnly.value ? '#409eff' : '#bbb', stroke: filterStaticOnly.value ? '#409eff' : '#bbb', 'stroke-width': 1 }),
                      h('rect', { x: 7, y: 9, width: 6, height: 2, fill: '#fff' })
                    ])
                  ])
                ])
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
