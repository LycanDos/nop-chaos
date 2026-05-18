// ===== 皮肤数据模型 =====

export type StateKey = 'activated' | 'completed' | 'failed' | 'waiting' | 'suspended'
export type StrokeDashstyle = 'solid' | 'dashed' | 'dotted'

export interface SemanticPalette {
  success: string
  error: string
  running: string
  warning: string
}

export interface ShadowConfig {
  color: string
  blur: number
  offsetX: number
  offsetY: number
}

export interface BorderEffect {
  type: 'marquee' | 'breathing' | 'glow' | 'dash-flow' | null
  color?: string
  speed?: number
}

export interface StateStyle {
  fill?: string
  stroke?: string
  strokeWidth?: number
  strokeDashstyle?: StrokeDashstyle
  borderRadius?: number
  opacity?: number
  textColor?: string
  fontSize?: number
  pulsing?: boolean
  marquee?: boolean
  shadow?: ShadowConfig | false
  borderEffect?: BorderEffect
}

// ===== 进度条 =====

export interface ProgressConfig {
  show: boolean
  position: 'top' | 'bottom'
  height: number
  colors: { bar: string; trail: string }
  borderRadius?: number
  offsetX?: number
  offsetY?: number
  perState?: Partial<Record<StateKey, { bar?: string; trail?: string }>>
}

// ===== 浮动层 =====

export interface OverlayDefaults {
  assignee?: {
    show: boolean
    position: string
    style: { bgColor: string; textColor: string }
    offsetX?: number
    offsetY?: number
  }
  tooltip?: {
    show: boolean
    offsetX?: number
    offsetY?: number
  }
}

// ===== 挂件系统 =====

export type WidgetType = 'badge' | 'label' | 'rich-text' | 'image' | 'status-dot' | 'progress' | 'timer'
export type AnchorPosition = 'top-left' | 'top-center' | 'top-right'
  | 'left-center' | 'right-center'
  | 'bottom-left' | 'bottom-center' | 'bottom-right'
  | 'center'
export type WidgetLayer = 'overlay' | 'inner'
export type WidgetPlacement = 'inside' | 'outside'

export interface WidgetVisibility {
  modifier?: 'ctrl' | 'shift' | 'alt' | 'none'
  elementStates?: StateKey[]
  minZoom?: number
  maxZoom?: number
  onHover?: boolean
  onSelect?: boolean
}

export interface WidgetConfig {
  type: WidgetType
  config: Record<string, any>
  anchor: AnchorPosition
  widgetAnchor?: AnchorPosition
  layer: WidgetLayer
  placement?: WidgetPlacement
  opacity: number
  zIndex?: number
  visibility?: WidgetVisibility
}

// ===== 元素级覆盖 =====

export interface ElementOverride {
  elementId: string
  elementType?: string
  accentColor?: string
  states?: Partial<Record<StateKey, Partial<StateStyle>>>
  widgets?: WidgetConfig[]
}

// ===== 画布挂件 =====

export type CanvasDecorationType = 'image' | 'iframe' | 'web-component' | 'html'

export interface CanvasDecoration {
  id: string
  type: CanvasDecorationType
  config: Record<string, any>
  x: number
  y: number
  width?: number
  height?: number
  zIndex: number
  locked: boolean
  opacity: number
}

// ===== 皮肤顶级结构 =====

export interface SkinJson {
  variables: {
    palette: Record<StateKey, string>
    semantic?: Partial<SemanticPalette>
  }
  states: Record<StateKey, StateStyle>
  progress?: ProgressConfig
  overlays?: OverlayDefaults
  elementOverrides?: Record<string, ElementOverride>
  canvasDecorations?: CanvasDecoration[]
  info?: Record<string, any>
}

// ===== UI 模型 =====

export interface SkinForm {
  templateCode: string
  templateName: string
  category: string
  bpmnBaseType: string
  status: string
  thumbnail: string
  skinJson: SkinJson
}

export interface PaletteItem {
  key: StateKey
  label: string
}

export interface StateDef {
  key: StateKey
  label: string
}

// ===== 预览元素 =====

export interface PreviewElementDef {
  id: string
  type: string
  name: string
  defaultState: StateKey
}

// ===== 默认值 =====

export const STATE_KEYS: StateKey[] = ['activated', 'completed', 'failed', 'waiting', 'suspended']

export const PALETTE_ITEMS: PaletteItem[] = [
  { key: 'activated', label: 'ACTIVATED 激活' },
  { key: 'completed', label: 'COMPLETED 完成' },
  { key: 'failed', label: 'FAILED 失败' },
  { key: 'waiting', label: 'WAITING 等待' },
  { key: 'suspended', label: 'SUSPENDED 挂起' },
]

export const STATE_DEFS: StateDef[] = [
  { key: 'activated', label: 'ACTIVATED 激活' },
  { key: 'completed', label: 'COMPLETED 完成' },
  { key: 'failed', label: 'FAILED 失败' },
  { key: 'waiting', label: 'WAITING 等待' },
  { key: 'suspended', label: 'SUSPENDED 挂起' },
]

export const PREDEFINE_COLORS = [
  '#1890ff', '#52c41a', '#ff4d4f', '#faad14', '#d9d9d9',
  '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16', '#a0d911',
]

export const WIDGET_TYPE_OPTIONS: { value: WidgetType; label: string }[] = [
  { value: 'badge', label: '角标' },
  { value: 'label', label: '标签' },
  { value: 'rich-text', label: '富文本' },
  { value: 'image', label: '图片' },
  { value: 'status-dot', label: '状态点' },
  { value: 'progress', label: '进度' },
  { value: 'timer', label: '计时' },
]

export const ANCHOR_OPTIONS: { value: AnchorPosition; label: string }[] = [
  { value: 'top-left', label: '左上' },
  { value: 'top-center', label: '上中' },
  { value: 'top-right', label: '右上' },
  { value: 'left-center', label: '左中' },
  { value: 'right-center', label: '右中' },
  { value: 'bottom-left', label: '左下' },
  { value: 'bottom-center', label: '下中' },
  { value: 'bottom-right', label: '右下' },
  { value: 'center', label: '中心' },
]

export const LAYER_OPTIONS: { value: WidgetLayer; label: string }[] = [
  { value: 'overlay', label: '节点上层' },
  { value: 'inner', label: '节点内部' },
]

export const BORDER_EFFECT_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: '无' },
  { value: 'marquee', label: '跑马灯' },
  { value: 'breathing', label: '呼吸' },
  { value: 'glow', label: '发光' },
  { value: 'dash-flow', label: '虚线流动' },
]

export const CANVAS_DECORATION_OPTIONS: { value: CanvasDecorationType; label: string }[] = [
  { value: 'image', label: '图片' },
  { value: 'iframe', label: '内嵌页面' },
  { value: 'web-component', label: 'Web Component' },
  { value: 'html', label: 'HTML' },
]

export const DEFAULT_SKIN_JSON: SkinJson = {
  variables: {
    palette: {
      activated: '#1890ff',
      completed: '#52c41a',
      failed: '#ff4d4f',
      waiting: '#faad14',
      suspended: '#d9d9d9',
    },
    semantic: {
      success: '#52c41a',
      error: '#ff4d4f',
      running: '#1890ff',
      warning: '#faad14',
    },
  },
  states: {
    activated: {
      strokeWidth: 3, strokeDashstyle: 'solid', borderRadius: 4,
      opacity: 1, textColor: '#ffffff', fontSize: 12,
      pulsing: true, marquee: false, shadow: false,
      borderEffect: { type: null },
    },
    completed: {
      strokeWidth: 2, strokeDashstyle: 'solid', borderRadius: 4,
      opacity: 0.85, textColor: '#ffffff', fontSize: 12,
      pulsing: false, marquee: false, shadow: false,
      borderEffect: { type: null },
    },
    failed: {
      strokeWidth: 2, strokeDashstyle: 'solid', borderRadius: 4,
      opacity: 1, textColor: '#ffffff', fontSize: 12,
      pulsing: false, marquee: false, shadow: false,
      borderEffect: { type: null },
    },
    waiting: {
      strokeWidth: 2, strokeDashstyle: 'solid', borderRadius: 4,
      opacity: 1, textColor: '#ffffff', fontSize: 12,
      pulsing: false, marquee: false, shadow: false,
      borderEffect: { type: null },
    },
    suspended: {
      strokeWidth: 2, strokeDashstyle: 'dashed', borderRadius: 4,
      opacity: 0.6, textColor: '#999999', fontSize: 12,
      pulsing: false, marquee: false, shadow: false,
      borderEffect: { type: null },
    },
  },
  progress: {
    show: true,
    position: 'bottom',
    height: 4,
    colors: { bar: '#1890ff', trail: '#f0f0f0' },
    borderRadius: 0,
    offsetX: 0,
    offsetY: 0,
  },
  overlays: {
    assignee: {
      show: true,
      position: 'top-right',
      style: { bgColor: '#1890ff', textColor: '#ffffff' },
      offsetX: 0,
      offsetY: 0,
    },
    tooltip: {
      show: true,
      offsetX: 0,
      offsetY: 0,
    },
  },
  elementOverrides: {
    UserTask_1: {
      elementId: 'UserTask_1',
      widgets: [
        { type: 'badge', config: { text: '3', color: '#ff4d4f' }, anchor: 'top-right', layer: 'overlay', opacity: 0.9, visibility: { modifier: 'none' } },
        { type: 'status-dot', config: { size: 10, color: '#52c41a' }, anchor: 'top-left', layer: 'overlay', opacity: 1, visibility: { modifier: 'none' } },
        { type: 'progress', config: { percent: 65, width: 50, height: 5, barColor: '#1890ff' }, anchor: 'bottom-center', layer: 'overlay', opacity: 0.85, visibility: { modifier: 'none' } },
      ],
    },
    StartEvent_1: {
      elementId: 'StartEvent_1',
      widgets: [
        { type: 'timer', config: { format: 'mm:ss' }, anchor: 'bottom-center', layer: 'overlay', opacity: 0.8, visibility: { modifier: 'none' } },
      ],
    },
    EndEvent_1: {
      elementId: 'EndEvent_1',
      widgets: [
        { type: 'status-dot', config: { size: 12, color: '#52c41a' }, anchor: 'center', layer: 'inner', opacity: 1, visibility: { modifier: 'none' } },
      ],
    },
  },
  canvasDecorations: [],
  info: {},
}

// ===== 多节点预览 BPMN XML =====

export const PREVIEW_FLOW_XML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions
  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  id="Definitions_1"
  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="false" name="预览流程">
    <bpmn:startEvent id="StartEvent_1" name="开始" />
    <bpmn:userTask id="UserTask_1" name="审批确认" />
    <bpmn:exclusiveGateway id="Gateway_1" name="判断" />
    <bpmn:serviceTask id="ServiceTask_1" name="数据处理" />
    <bpmn:userTask id="UserTask_2" name="人工处理" />
    <bpmn:endEvent id="EndEvent_1" name="结束" />

    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="UserTask_1" name="" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="UserTask_1" targetRef="Gateway_1" name="" />
    <bpmn:sequenceFlow id="Flow_3" sourceRef="Gateway_1" targetRef="ServiceTask_1" name="自动" />
    <bpmn:sequenceFlow id="Flow_4" sourceRef="Gateway_1" targetRef="UserTask_2" name="人工" />
    <bpmn:sequenceFlow id="Flow_5" sourceRef="ServiceTask_1" targetRef="EndEvent_1" name="" />
    <bpmn:sequenceFlow id="Flow_6" sourceRef="UserTask_2" targetRef="EndEvent_1" name="" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="80" y="195" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="UserTask_1_di" bpmnElement="UserTask_1">
        <dc:Bounds x="200" y="175" width="110" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Gateway_1_di" bpmnElement="Gateway_1">
        <dc:Bounds x="410" y="190" width="50" height="50" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="ServiceTask_1_di" bpmnElement="ServiceTask_1">
        <dc:Bounds x="560" y="130" width="110" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="UserTask_2_di" bpmnElement="UserTask_2">
        <dc:Bounds x="560" y="260" width="110" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EndEvent_1_di" bpmnElement="EndEvent_1">
        <dc:Bounds x="780" y="192" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="116" y="213" />
        <di:waypoint x="200" y="215" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="310" y="215" />
        <di:waypoint x="410" y="215" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_3_di" bpmnElement="Flow_3">
        <di:waypoint x="435" y="190" />
        <di:waypoint x="435" y="170" />
        <di:waypoint x="560" y="170" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_4_di" bpmnElement="Flow_4">
        <di:waypoint x="435" y="240" />
        <di:waypoint x="435" y="300" />
        <di:waypoint x="560" y="300" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_5_di" bpmnElement="Flow_5">
        <di:waypoint x="670" y="170" />
        <di:waypoint x="780" y="210" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_6_di" bpmnElement="Flow_6">
        <di:waypoint x="670" y="300" />
        <di:waypoint x="798" y="228" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`

export const PREVIEW_ELEMENTS: PreviewElementDef[] = [
  { id: 'StartEvent_1', type: 'bpmn:StartEvent', name: '开始', defaultState: 'completed' },
  { id: 'UserTask_1', type: 'bpmn:UserTask', name: '审批确认', defaultState: 'activated' },
  { id: 'Gateway_1', type: 'bpmn:ExclusiveGateway', name: '判断', defaultState: 'waiting' },
  { id: 'ServiceTask_1', type: 'bpmn:ServiceTask', name: '数据处理', defaultState: 'completed' },
  { id: 'UserTask_2', type: 'bpmn:UserTask', name: '人工处理', defaultState: 'waiting' },
  { id: 'EndEvent_1', type: 'bpmn:EndEvent', name: '结束', defaultState: 'waiting' },
]
