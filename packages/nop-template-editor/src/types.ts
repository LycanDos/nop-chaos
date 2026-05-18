export interface TemplateElement {
  id: string
  type: 'text' | 'prefill' | 'signature' | 'stamp' | 'handwrite-text' | 'table' | 'image' | 'divider'
  label: string
  x: number
  y: number
  w: number
  h: number
  rotation?: number
  zIndex?: number
  visible?: boolean
  locked?: boolean
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
}

export interface TableColumn {
  field: string
  header: string
  w: number
  align?: 'left' | 'center' | 'right'
}

export interface ImageElement extends TemplateElement {
  type: 'image'
  src: string
  fit?: 'contain' | 'cover' | 'stretch'
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

export interface TemplatePage {
  id: string
  name: string
  elements: TemplateElement[]
}

export interface DataSetBinding {
  name: string
  source: 'orm' | 'sql' | 'java' | 'params'
  query?: string
  params?: Record<string, string>
}
