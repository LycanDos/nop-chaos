import { assign, forEach, isArray } from 'min-dash'

import { is } from 'bpmn-js/lib/util/ModelUtil'

import { isExpanded, isEventSubProcess } from 'bpmn-js/lib/util/DiUtil'

import { isAny } from 'bpmn-js/lib/features/modeling/util/ModelingUtil'

import { getChildLanes } from 'bpmn-js/lib/features/modeling/util/LaneUtil'

import { hasPrimaryModifier } from 'diagram-js/lib/util/Mouse'

import { h, createApp, ref } from 'vue'
import { ElDialog, ElTabs, ElTabPane, ElTable, ElTableColumn, ElButton, ElTag } from 'element-plus'
import MethodDialog from './MethodDialog.vue'
import AmisEditDialog from './AmisEditDialog.vue'
import { emitter } from '../../../../hooks/web/useEmitt';
console.log('contentPadProvider emitter', emitter);

/**
 * A provider for BPMN 2.0 elements context pad
 */
export default function ContextPadProvider(
  config,
  injector,
  eventBus,
  contextPad,
  modeling,
  elementFactory,
  connect,
  create,
  popupMenu,
  canvas,
  rules,
  translate
) {
  config = config || {}

  contextPad.registerProvider(this)

  this._contextPad = contextPad

  this._modeling = modeling

  this._elementFactory = elementFactory
  this._connect = connect
  this._create = create
  this._popupMenu = popupMenu
  this._canvas = canvas
  this._rules = rules
  this._translate = translate

  if (config.autoPlace !== false) {
    this._autoPlace = injector.get('autoPlace', false)
  }

  eventBus.on('create.end', 250, function (event) {
    const context = event.context,
      shape = context.shape

    if (!hasPrimaryModifier(event) || !contextPad.isOpen(shape)) {
      return
    }

    const entries = contextPad.getEntries(shape)

    if (entries.replace) {
      entries.replace.action.click(event, shape)
    }
  })
}

ContextPadProvider.$inject = [
  'config.contextPad',
  'injector',
  'eventBus',
  'contextPad',
  'modeling',
  'elementFactory',
  'connect',
  'create',
  'popupMenu',
  'canvas',
  'rules',
  'translate',
  'elementRegistry'
]

// 自定义弹窗 Vue 组件
// 删除原有 MethodDialog 组件定义

// 注入自定义入参出参图标样式和SVG（只注入一次）
if (typeof window !== 'undefined' && !window.__bpmn_custom_io_param_icon__) {
  const style = document.createElement('style')
  style.innerHTML = `
    .bpmn-custom-io-param {
      position: relative;
      width: 24px;
      height: 24px;
      display: inline-block;
      background: none;
    }
    .bpmn-custom-io-param::before {
      content: '';
      display: block;
      width: 24px;
      height: 24px;
      margin: 0 auto;
      background: url('data:image/svg+xml;utf8,<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="11" cy="11" r="4.5" stroke="%23222" stroke-width="1.5" fill="%23fff"/><path d="M3 11h5" stroke="%23222" stroke-width="1.5" stroke-linecap="round"/><path d="M19 11h-5" stroke="%23222" stroke-width="1.5" stroke-linecap="round"/><path d="M5.5 8.5L3 11l2.5 2.5" stroke="%23222" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16.5 13.5L19 11l-2.5-2.5" stroke="%23222" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>') no-repeat center/contain;
    }
    
  `
  document.head.appendChild(style)
  window.__bpmn_custom_io_param_icon__ = true
}

// 注入自定义SVG图标样式（只注入一次）
if (typeof window !== 'undefined' && !window.__bpmn_custom_icons__) {
  const style = document.createElement('style')
  style.innerHTML = `
    .bpmn-icon-replace::before {
      content: '';
      display: block;
      width: 20px;
      height: 20px;
      margin: 0 auto;
      background: url('/svg/replace2.svg') no-repeat center/contain;
    }
    .bpmn-icon-form::before {
      content: '';
      display: block;
      width: 20px;
      height: 20px;
      margin: 0 auto;
      background: url('/svg/form.svg') no-repeat center/contain;
    }
    .bpmn-icon-tran::before {
      content: '';
      display: block;
      width: 20px;
      height: 20px;
      margin: 0 auto;
      background: url('/svg/tran.svg') no-repeat center/contain;
    }
    
    /* 如需更多自定义icon, 继续添加对应class和svg路径 */
  `
  document.head.appendChild(style)
  window.__bpmn_custom_icons__ = true
}

// 全局唯一弹窗Vue实例和div
if (typeof window !== 'undefined') {
  if (!window.__bpmn_global_dialog_div__) {
    const div = document.createElement('div');
    div.id = 'bpmn-global-dialog';
    document.body.appendChild(div);
    window.__bpmn_global_dialog_div__ = div;
  }
  window.__bpmn_global_dialog_app__ = null;
}

ContextPadProvider.prototype.getContextPadEntries = function (element) {
  const contextPad = this._contextPad,
    modeling = this._modeling,
    elementFactory = this._elementFactory,
    connect = this._connect,
    create = this._create,
    popupMenu = this._popupMenu,
    canvas = this._canvas,
    rules = this._rules,
    autoPlace = this._autoPlace,
    translate = this._translate

  const actions = {}

  if (element.type === 'label') {
    return actions
  }

  const businessObject = element.businessObject

  function startConnect(event, element) {
    connect.start(event, element)
  }

  function removeElement() {
    modeling.removeElements([element])
  }

  function getReplaceMenuPosition(element) {
    const Y_OFFSET = 5

    const diagramContainer = canvas.getContainer(),
      pad = contextPad.getPad(element).html

    const diagramRect = diagramContainer.getBoundingClientRect(),
      padRect = pad.getBoundingClientRect()

    const top = padRect.top - diagramRect.top
    const left = padRect.left - diagramRect.left

    const pos = {
      x: left,
      y: top + padRect.height + Y_OFFSET
    }

    return pos
  }

  /**
   * Create an append action
   *
   * @param {string} type
   * @param {string} className
   * @param {string} [title]
   * @param {Object} [options]
   *
   * @return {Object} descriptor
   */
  function appendAction(type, className, title, options) {
    if (typeof title !== 'string') {
      options = title
      title = translate('Append {type}', { type: type.replace(/^bpmn:/, '') })
    }

    function appendStart(event, element) {
      const shape = elementFactory.createShape(assign({ type: type }, options))
      create.start(event, shape, {
        source: element
      })
    }

    const append = autoPlace
      ? function (event, element) {
          const shape = elementFactory.createShape(assign({ type: type }, options))

          autoPlace.append(element, shape)
        }
      : appendStart

    return {
      group: 'model',
      className: className,
      title: title,
      action: {
        dragstart: appendStart,
        click: append
      }
    }
  }

  function splitLaneHandler(count) {
    return function (event, element) {
      // actual split
      modeling.splitLane(element, count)

      // refresh context pad after split to
      // get rid of split icons
      contextPad.open(element, true)
    }
  }

  if (isAny(businessObject, ['bpmn:Lane', 'bpmn:Participant']) && isExpanded(businessObject)) {
    const childLanes = getChildLanes(element)

    assign(actions, {
      'lane-insert-above': {
        group: 'lane-insert-above',
        className: 'bpmn-icon-lane-insert-above',
        title: translate('Add Lane above'),
        action: {
          click: function (event, element) {
            modeling.addLane(element, 'top')
          }
        }
      }
    })

    if (childLanes.length < 2) {
      if (element.height >= 120) {
        assign(actions, {
          'lane-divide-two': {
            group: 'lane-divide',
            className: 'bpmn-icon-lane-divide-two',
            title: translate('Divide into two Lanes'),
            action: {
              click: splitLaneHandler(2)
            }
          }
        })
      }

      if (element.height >= 180) {
        assign(actions, {
          'lane-divide-three': {
            group: 'lane-divide',
            className: 'bpmn-icon-lane-divide-three',
            title: translate('Divide into three Lanes'),
            action: {
              click: splitLaneHandler(3)
            }
          }
        })
      }
    }

    assign(actions, {
      'lane-insert-below': {
        group: 'lane-insert-below',
        className: 'bpmn-icon-lane-insert-below',
        title: translate('Add Lane below'),
        action: {
          click: function (event, element) {
            modeling.addLane(element, 'bottom')
          }
        }
      }
    })
  }

  if (is(businessObject, 'bpmn:FlowNode')) {
    if (is(businessObject, 'bpmn:EventBasedGateway')) {
      assign(actions, {
        'append.receive-task': appendAction(
          'bpmn:ReceiveTask',
          'bpmn-icon-receive-task',
          translate('Append ReceiveTask')
        ),
        'append.message-intermediate-event': appendAction(
          'bpmn:IntermediateCatchEvent',
          'bpmn-icon-intermediate-event-catch-message',
          translate('Append MessageIntermediateCatchEvent'),
          { eventDefinitionType: 'bpmn:MessageEventDefinition' }
        ),
        'append.timer-intermediate-event': appendAction(
          'bpmn:IntermediateCatchEvent',
          'bpmn-icon-intermediate-event-catch-timer',
          translate('Append TimerIntermediateCatchEvent'),
          { eventDefinitionType: 'bpmn:TimerEventDefinition' }
        ),
        'append.condition-intermediate-event': appendAction(
          'bpmn:IntermediateCatchEvent',
          'bpmn-icon-intermediate-event-catch-condition',
          translate('Append ConditionIntermediateCatchEvent'),
          { eventDefinitionType: 'bpmn:ConditionalEventDefinition' }
        ),
        'append.signal-intermediate-event': appendAction(
          'bpmn:IntermediateCatchEvent',
          'bpmn-icon-intermediate-event-catch-signal',
          translate('Append SignalIntermediateCatchEvent'),
          { eventDefinitionType: 'bpmn:SignalEventDefinition' }
        )
      })
    } else if (
      isEventType(businessObject, 'bpmn:BoundaryEvent', 'bpmn:CompensateEventDefinition')
    ) {
      assign(actions, {
        'append.compensation-activity': appendAction(
          'bpmn:Task',
          'bpmn-icon-task',
          translate('Append compensation activity'),
          {
            isForCompensation: true
          }
        )
      })
    } else if (
      !is(businessObject, 'bpmn:EndEvent') &&
      !businessObject.isForCompensation &&
      !isEventType(businessObject, 'bpmn:IntermediateThrowEvent', 'bpmn:LinkEventDefinition') &&
      !isEventSubProcess(businessObject)
    ) {
      assign(actions, {
        'append.end-event': appendAction(
          'bpmn:EndEvent',
          'bpmn-icon-end-event-none',
          translate('Append EndEvent')
        ),
        'append.gateway': appendAction(
          'bpmn:ExclusiveGateway',
          'bpmn-icon-gateway-none',
          translate('Append Gateway')
        ),
        'append.append-task': appendAction(
          'bpmn:Task',
          'bpmn-icon-task',
          translate('Append Task')
        ),
        'append.intermediate-event': appendAction(
          'bpmn:IntermediateThrowEvent',
          'bpmn-icon-intermediate-event-none',
          translate('Append Intermediate/Boundary Event')
        )
      })
    }
  }

  if (!popupMenu.isEmpty(element, 'bpmn-replace')) {
    // Replace menu entry
    assign(actions, {
      replace: {
        group: 'edit',
        className: 'bpmn-icon-replace', // 确保 className 正确
        title: '修改类型',
        action: {
          click: function (event, element) {
            const position = assign(getReplaceMenuPosition(element), {
              cursor: { x: event.x, y: event.y }
            })
            popupMenu.open(element, 'bpmn-replace', position)
          }
        }
      }
    })
  }

  // 新增一个扳手图标，弹出可拖动空白弹窗
  assign(actions, {
    wrench: {
      group: 'edit',
      className: 'bpmn-icon-screw-wrench',
      title: '自定义操作',
      action: {
        click: function(event, element) {
          // 弹窗挂载到body
          let dialogDiv = document.getElementById('bpmn-wrench-dialog')
          if (!dialogDiv) {
            dialogDiv = document.createElement('div')
            dialogDiv.id = 'bpmn-wrench-dialog'
            dialogDiv.style.position = 'fixed'
            dialogDiv.style.left = (event && event.clientX ? (event.clientX + 24) : window.innerWidth * 0.4) + 'px'
            dialogDiv.style.top = (event && event.clientY ? (event.clientY - 20) : window.innerHeight * 0.2) + 'px'
            dialogDiv.style.zIndex = 9999
            dialogDiv.style.background = 'white'
            dialogDiv.style.borderRadius = '8px'
            dialogDiv.style.boxShadow = '0 4px 16px rgba(0,0,0,0.18)'
            dialogDiv.style.minWidth = '320px'
            dialogDiv.style.minHeight = '160px'
            dialogDiv.style.resize = 'both'
            dialogDiv.style.overflow = 'auto'
            dialogDiv.innerHTML = `
              <div id="bpmn-wrench-drag-bar" style="height:36px;background:#f5f7fa;border-radius:8px 8px 0 0;cursor:move;position:relative;user-select:none;">
                <button id="bpmn-wrench-close-btn" style="position:absolute;right:8px;top:6px;border:none;background:transparent;font-size:18px;cursor:pointer;">×</button>
                <span style="line-height:36px;font-size:15px;color:#666;">自定义扳手弹窗（可拖动）</span>
              </div>
              <div style="padding:24px;text-align:center;">这里是自定义内容区域</div>
            `
            // 关闭按钮
            setTimeout(() => {
              const closeBtn = document.getElementById('bpmn-wrench-close-btn')
              if (closeBtn) {
                closeBtn.onclick = function() {
                  dialogDiv.remove()
                }
              }
            }, 0)
            // 拖拽逻辑（仅顶部 bar 可拖动）
            let isDragging = false, offsetX = 0, offsetY = 0
            setTimeout(() => {
              const dragBar = document.getElementById('bpmn-wrench-drag-bar')
              if (dragBar) {
                dragBar.onmousedown = function(e) {
                  isDragging = true
                  offsetX = e.clientX - dialogDiv.offsetLeft
                  offsetY = e.clientY - dialogDiv.offsetTop
                  document.onmousemove = function(ev) {
                    if (!isDragging) return
                    dialogDiv.style.left = (ev.clientX - offsetX) + 'px'
                    dialogDiv.style.top = (ev.clientY - offsetY) + 'px'
                  }
                  document.onmouseup = function() {
                    isDragging = false
                    document.onmousemove = null
                    document.onmouseup = null
                  }
                }
              }
            }, 0)
            document.body.appendChild(dialogDiv)
          }
        }
      }
    }
  })

  if (
    isAny(businessObject, [
      'bpmn:FlowNode',
      'bpmn:InteractionNode',
      'bpmn:DataObjectReference',
      'bpmn:DataStoreReference'
    ])
  ) {
    assign(actions, {
      'append.text-annotation': appendAction('bpmn:TextAnnotation', 'bpmn-icon-text-annotation'),

      connect: {
        group: 'connect',
        className: 'bpmn-icon-connection-multi',
        title: translate(
          'Connect using ' +
            (businessObject.isForCompensation ? '' : 'Sequence/MessageFlow or ') +
            'Association'
        ),
        action: {
          click: startConnect,
          dragstart: startConnect
        }
      }
    })
  }

  if (isAny(businessObject, ['bpmn:DataObjectReference', 'bpmn:DataStoreReference'])) {
    assign(actions, {
      connect: {
        group: 'connect',
        className: 'bpmn-icon-connection-multi',
        title: translate('Connect using DataInputAssociation'),
        action: {
          click: startConnect,
          dragstart: startConnect
        }
      }
    })
  }

  if (is(businessObject, 'bpmn:Group')) {
    assign(actions, {
      'append.text-annotation': appendAction('bpmn:TextAnnotation', 'bpmn-icon-text-annotation')
    })
  }

  // delete element entry, only show if allowed by rules
  let deleteAllowed = rules.allowed('elements.delete', { elements: [element] })

  if (isArray(deleteAllowed)) {
    // was the element returned as a deletion candidate?
    deleteAllowed = deleteAllowed[0] === element
  }

  if (deleteAllowed) {
    assign(actions, {
      delete: {
        group: 'edit',
        className: 'bpmn-icon-trash',
        title: translate('Remove'),
        action: {
          click: removeElement
        }
      }
    })
  }

  // 直接在 actions 末尾增加自定义图标
  assign(actions, {
    'custom-method': {
      group: 'edit',
      className: 'bpmn-icon-tran bpmn-custom-io-param', // 继承原生icon定位
      title: '方法参数',
      action: {
        click: function(event, element) {
          const dialogDiv = window.__bpmn_global_dialog_div__;
          // 彻底销毁上一个全局弹窗实例
          if (window.__bpmn_global_dialog_app__) {
            try { window.__bpmn_global_dialog_app__.unmount(); } catch(e) {}
            window.__bpmn_global_dialog_app__ = null;
            dialogDiv.innerHTML = '';
          }
          // 清理所有相关DOM
          document.querySelectorAll('.el-overlay, .el-dialog__wrapper').forEach(el => el.remove());
          // 延迟200ms后再挂载新弹窗，保留动画
          setTimeout(() => {
            // 挂载Vue弹窗
            const app = createApp(MethodDialog, {
              visible: true,
              onClose: () => {
                app.unmount()
                dialogDiv.innerHTML = '';
                window.__bpmn_global_dialog_app__ = null;
                // 彻底清理 Element Plus 弹窗副作用
                document.body.classList.remove('el-popup-parent--hidden');
                document.body.style.overflow = '';
                document.body.removeAttribute('aria-hidden');
                document.body.removeAttribute('aria-modal');
                document.querySelectorAll('.el-overlay, .el-dialog__wrapper').forEach(el => el.remove());
              }
            })
            window.__bpmn_global_dialog_app__ = app;
            app.mount(dialogDiv)
          }, 200)
        }
      }
    }
  })

  // 在 getContextPadEntries 的 actions 末尾增加：
  assign(actions, {
    'custom-amis-form': {
      group: 'edit',
      className: 'bpmn-icon-form', // 使用用户任务图标，表示表单
      title: 'AMIS配置表单',
      action: {
        click: function(event, element) {
          // 通过mitt事件总线触发全局弹窗
          const getPageSource = async () => ({});
          const savePageSource = async () => true;
          const rollbackPageSource = async () => true;
          console.log('emit open-amis-dialog', { getPageSource, savePageSource, rollbackPageSource });
          emitter.emit('open-amis-dialog', {
            getPageSource,
            savePageSource,
            rollbackPageSource
          });
          console.log('emitted open-amis-dialog');
        }
      }
    }
  })

  return actions
}

// helpers /////////

function isEventType(eventBo, type, definition) {
  const isType = eventBo.$instanceOf(type)
  let isDefinition = false

  const definitions = eventBo.eventDefinitions || []
  forEach(definitions, function (def) {
    if (def.$type === definition) {
      isDefinition = true
    }
  })

  return isType && isDefinition
}
