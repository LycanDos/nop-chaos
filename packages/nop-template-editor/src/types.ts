export interface PolygonAnchor {
  x: number
  y: number
}

export interface CutoutShape {
  id: string
  type: 'rect' | 'circle' | 'polygon'
  x: number
  y: number
  w: number
  h: number
  rotation?: number
  polygon?: PolygonAnchor[]
}

export interface BorderConfig {
  width?: number
  color?: string
  style?: 'solid' | 'dashed' | 'dotted'
  // 边框位置：inside 表示边框在元素内部绘制，outside 表示边框在元素外部绘制
  position?: 'inside' | 'outside' | 'center'
  // 边框距离内容区域的间距（像素）
  padding?: number
}

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
    | 'watermark'
    | 'region'
  label: string
  x: number
  y: number
  w: number
  h: number
  rotation?: number
  opacity?: number
  zIndex?: number
  visible?: boolean
  locked?: boolean
  groupId?: string
  // 简单边框配置（向后兼容）
  borderWidth?: number
  borderColor?: string
  borderStyle?: 'solid' | 'dashed' | 'dotted'
  // 高级边框配置
  border?: BorderConfig
  [key: string]: any
}

export interface TextElement extends TemplateElement {
  type: 'text'
  content: string
  fontSize?: number
  fontWeight?: 'normal' | 'bold'
  textAlign?: 'left' | 'center' | 'right'
  color?: string
  cutouts?: CutoutShape[]
}

export interface PrefillElement extends TemplateElement {
  type: 'prefill'
  expr: string
  fontSize?: number
  emptyPlaceholder?: string
}

export interface WatermarkElement extends TemplateElement {
  type: 'watermark'
  content: string
  fontSize?: number
  fontWeight?: 'normal' | 'bold'
  textAlign?: 'left' | 'center' | 'right'
  color?: string
  tileGapX?: number
  tileGapY?: number
}

export interface RegionElement extends TemplateElement {
  type: 'region'
  regionCode?: string
  regionColor?: string
  regionPurposes?: string[]
  purposeConfigs?: Record<string, Record<string, any>>
}

export interface OcrTextPurposeConfig {
  language?: 'chi_sim' | 'eng' | 'mixed'
  confidenceThreshold?: number
  textDirection?: 'horizontal' | 'vertical' | 'auto'
  preprocessing?: ('grayscale' | 'denoise' | 'deskew' | 'binarize')[]
  charSet?: string
  minLength?: number
  maxLength?: number
  mergeLines?: boolean
}

export interface OcrTablePurposeConfig {
  language?: 'chi_sim' | 'eng' | 'mixed'
  confidenceThreshold?: number
  detectHeader?: boolean
  detectMergedCells?: boolean
  outputFormat?: 'json' | 'csv' | 'html'
  preprocessing?: ('grayscale' | 'denoise' | 'deskew')[]
}

export interface OcrTemplatePurposeConfig {
  templateId?: string
  matchMode?: 'exact' | 'fuzzy' | 'best-effort'
  confidenceThreshold?: number
  allowPartialMatch?: boolean
}

export interface StainDetectPurposeConfig {
  stainTypes?: ('coffee' | 'ink' | 'oil' | 'water' | 'mold' | 'general')[]
  sensitivity?: 'low' | 'medium' | 'high'
  minAreaPercent?: number
  reportMode?: 'binary' | 'severity' | 'detailed'
}

export interface TamperDetectPurposeConfig {
  detectionMode?: 'text' | 'image' | 'both'
  sensitivity?: 'low' | 'medium' | 'high'
  checkMetadata?: boolean
  checkPixelAnomaly?: boolean
  checkFontConsistency?: boolean
}

export interface StampDetectPurposeConfig {
  stampType?: 'circle' | 'oval' | 'rect' | 'any'
  detectColor?: boolean
  extractText?: boolean
  confidenceThreshold?: number
}

export interface BarcodePurposeConfig {
  barcodeTypes?: ('qr' | 'ean13' | 'ean8' | 'code128' | 'code39' | 'pdf417' | 'datamatrix' | 'upca')[]
  autoDetect?: boolean
  minConfidence?: number
  expectedFormat?: string
}

export interface SignatureDetectPurposeConfig {
  detectionMode?: 'presence' | 'verify' | 'extract'
  confidenceThreshold?: number
  allowPrinted?: boolean
  multiSignature?: boolean
}

export interface KeyExtractionPurposeConfig {
  fields?: { name: string; pattern?: string; dataType?: 'string' | 'number' | 'date' | 'amount' }[]
  extractionMode?: 'regex' | 'llm' | 'hybrid'
  postProcess?: 'trim' | 'normalize' | 'validate'
  strictValidation?: boolean
}

export interface DesensitizePurposeConfig {
  method?: 'blur' | 'black' | 'replace' | 'pixelate'
  keepPrefix?: number
  keepSuffix?: number
  replacementChar?: string
  applyTo?: 'text' | 'image' | 'both'
  blurRadius?: number
  pixelateBlockSize?: number
}

export interface QualityCheckPurposeConfig {
  checks?: ('resolution' | 'contrast' | 'blur' | 'skew' | 'noise' | 'completeness')[]
  minDpi?: number
  minContrastRatio?: number
  maxSkewDegrees?: number
  completenessThreshold?: number
  failAction?: 'flag' | 'reject' | 'warn'
}

export type RegionPurposeConfigValue =
  | OcrTextPurposeConfig
  | OcrTablePurposeConfig
  | OcrTemplatePurposeConfig
  | StainDetectPurposeConfig
  | TamperDetectPurposeConfig
  | StampDetectPurposeConfig
  | BarcodePurposeConfig
  | SignatureDetectPurposeConfig
  | KeyExtractionPurposeConfig
  | DesensitizePurposeConfig
  | QualityCheckPurposeConfig

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
