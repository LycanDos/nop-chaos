export interface TemplateElement {
  id: string
  type:
    | 'text'
    | 'prefill'
    | 'signature'
    | 'stamp'
    | 'handwrite-text'
    | 'table'
    | 'image'
    | 'divider'
    | 'shape'
  label: string
  x: number
  y: number
  w: number
  h: number
  rotation?: number
  zIndex?: number
  visible?: boolean
  locked?: boolean
  groupId?: string
  [key: string]: any
}

export interface TextElement extends TemplateElement {
  type: 'text'
  content: string
  fontSize?: number
  fontWeight?: 'normal' | 'bold'
  textAlign?: 'left' | 'center' | 'right'
  color?: string
}

export interface PrefillElement extends TemplateElement {
  type: 'prefill'
  expr: string
  fontSize?: number
  emptyPlaceholder?: string
}

export interface HandwriteElement extends TemplateElement {
  type: 'signature' | 'stamp' | 'handwrite-text'
  required?: boolean
  placeholder?: string
  borderColor?: string
}

export interface TableElement extends TemplateElement {
  type: 'table'
  ds?: string
  columns?: TableColumn[]
  showHeader?: boolean
  previewRows?: number
  dynamicHeight?: boolean
  pushFollowingElements?: boolean
  headerStyle?: TableTextStyle
  bodyStyle?: TableTextStyle
  borderConfig?: TableBorderConfig
}

export interface TableColumn {
  field: string
  header: string
  w: number
  align?: 'left' | 'center' | 'right'
}

export interface TableTextStyle {
  fontFamily?: string
  fontSize?: number
  fontWeight?: 'normal' | 'bold' | string
  color?: string
  backgroundColor?: string
  lineHeight?: number
  letterSpacing?: number
  textAlign?: 'left' | 'center' | 'right'
  overflow?: 'wrap' | 'ellipsis' | 'clip'
}

export interface TableBorderConfig {
  width?: number
  color?: string
  style?: 'solid' | 'dashed' | 'dotted' | 'double'
  outer?: boolean
  innerHorizontal?: boolean
  innerVertical?: boolean
  headerSeparator?: boolean
}

export interface ImageElement extends TemplateElement {
  type: 'image'
  src: string
  fit?: 'contain' | 'cover' | 'stretch'
}

export interface ShapeElement extends TemplateElement {
  type: 'shape'
  shapeType?: 'rect' | 'roundRect' | 'circle' | 'line'
  strokeColor?: string
  strokeWidth?: number
  strokeStyle?: 'solid' | 'dashed' | 'dotted'
  fillColor?: string
  cornerRadius?: number
  lineDirection?: 'horizontal' | 'vertical' | 'diag-down' | 'diag-up'
}

export interface TemplateDefinition {
  templateId: string
  version: number
  displayName: string
  category?: string
  pageSize?: 'A4' | 'A3' | 'letter'
  orientation?: 'portrait' | 'landscape'
  pages?: TemplatePage[]
  elements: TemplateElement[]  // 向后兼容：单页模式
  dataSets?: DataSetBinding[]
  fixedLayerSha256?: string
}

export interface TemplateGuide {
  id: string
  axis: 'x' | 'y'
  position: number
}

export interface TemplateGroup {
  id: string
  name: string
}

export interface TemplatePage {
  id: string
  name: string
  elements: TemplateElement[]
  guides?: TemplateGuide[]
  groups?: TemplateGroup[]
}

export interface DataSetBinding {
  name: string
  source: 'orm' | 'sql' | 'java' | 'params'
  query?: string
  params?: Record<string, string>
}
