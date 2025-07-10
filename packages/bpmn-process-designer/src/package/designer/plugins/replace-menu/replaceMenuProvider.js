import { assign } from 'min-dash'

export default function ReplaceMenuProvider(
  popupMenu,
  modeling,
  elementFactory,
  create,
  translate
) {
  this._popupMenu = popupMenu
  this._modeling = modeling
  this._elementFactory = elementFactory
  this._create = create
  this._translate = translate
  this._searchText = ''
  this._menuList = []

  // 注册 provider
  popupMenu.registerProvider('bpmn-replace', this)
}

ReplaceMenuProvider.$inject = [
  'popupMenu',
  'modeling',
  'elementFactory',
  'create',
  'translate'
]

ReplaceMenuProvider.prototype.getEntries = function (element) {
  const self = this
  // 静态任务类型数据
  const staticMenuList = [
    { type: 'bpmn:UserTask', label: '用户任务', icon: 'bpmn-icon-user-task' },
    { type: 'bpmn:ServiceTask', label: '服务任务', icon: 'bpmn-icon-service-task' },
    { type: 'bpmn:SendTask', label: '发送任务', icon: 'bpmn-icon-send' },
    { type: 'bpmn:ReceiveTask', label: '接收任务', icon: 'bpmn-icon-receive-task' },
    { type: 'bpmn:ManualTask', label: '手工任务', icon: 'bpmn-icon-manual-task' },
    { type: 'bpmn:BusinessRuleTask', label: '规则任务', icon: 'bpmn-icon-business-rule' },
    { type: 'bpmn:ScriptTask', label: '脚本任务', icon: 'bpmn-icon-script' },
    { type: 'bpmn:CallActivity', label: '调用活动', icon: 'bpmn-icon-call-activity' },
    { type: 'bpmn:SubProcess', label: '子流程', icon: 'bpmn-icon-subprocess-collapsed' }
  ]
  // 前端过滤
  const menuList = staticMenuList.filter(item =>
    item.label.includes(self._searchText)
  )
  return menuList.map(item => ({
    id: item.type,
    label: item.label,
    className: item.icon,
    action: function () {
      const shape = self._elementFactory.createShape({ type: item.type })
      self._modeling.replaceShape(element, shape)
    }
  }))
}

// 渲染菜单时，顶部插入搜索框
ReplaceMenuProvider.prototype.getHeaderEntries = function () {
  const self = this
  return [
    {
      id: 'search',
      html: `<input type="text" placeholder="搜索任务类型" value="${self._searchText}" style="width: 100%; box-sizing: border-box; padding: 4px;" />`,
      action: {
        input: function (event) {
          const value = event.target.value
          self._searchText = value
          self._popupMenu.update('bpmn-replace')
        }
      }
    }
  ]
} 