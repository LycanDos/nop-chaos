import JSZip from 'jszip'
import YAML from 'yaml'
import type {
  PolicyBundle,
  PolicyBundleMeta,
  PolicyDocument,
  PolicyLayer,
  PolicyRule,
  PolicySchema
} from '../types'

interface RulesetFrontmatter {
  format?: string
  rulesetId: string
  name: string
  layerType: string
  orderNo: number
  editable?: boolean
  description?: string
}

function parseCodeFence(section: string, heading: string) {
  const match = section.match(/```(json|yaml)\s*([\s\S]*?)```/i)
  if (!match)
    throw new Error(`${heading} 缺少 JSON/YAML 代码块`)

  const lang = match[1].toLowerCase()
  const payloadText = match[2].trim()
  return {
    lang,
    payload: lang === 'yaml' ? YAML.parse(payloadText) : JSON.parse(payloadText)
  }
}

function parseFrontmatter(text: string): Record<string, any> {
  const match = text.match(/^---\s*\n([\s\S]*?)\n---\s*/i)
  if (!match)
    throw new Error('Markdown 缺少 frontmatter')
  return YAML.parse(match[1]) || {}
}

function parseRulesetFrontmatter(text: string): RulesetFrontmatter {
  const meta = parseFrontmatter(text)
  if (meta.format && meta.format !== 'policy-ruleset/v1')
    throw new Error(`规则集 format 不合法: ${meta.format}`)
  return {
    rulesetId: meta.rulesetId,
    name: meta.name,
    layerType: meta.layerType,
    orderNo: Number(meta.orderNo || 0),
    editable: meta.editable !== false,
    description: meta.description
  }
}

function normalizeLayer(meta: RulesetFrontmatter, rules: PolicyRule[]): PolicyLayer {
  return {
    id: meta.rulesetId,
    name: meta.name,
    layerType: meta.layerType,
    orderNo: Number(meta.orderNo || 0),
    editable: meta.editable !== false,
    description: meta.description,
    rules
  }
}

function parseRulesBlock(text: string) {
  const rulesSectionMatch = text.match(/##\s+Rules\s*([\s\S]*)$/i)
  if (!rulesSectionMatch)
    throw new Error('规则集 Markdown 缺少 `## Rules` 段落')
  const parsed = parseCodeFence(rulesSectionMatch[1], 'Rules')
  if (!Array.isArray(parsed.payload))
    throw new Error('Rules 代码块必须是数组')
  return parsed.payload as PolicyRule[]
}

export function parseRulesetMarkdown(text: string, fileName?: string): PolicyLayer {
  const meta = parseRulesetFrontmatter(text)
  if (!meta.rulesetId || !meta.name || !meta.layerType)
    throw new Error('规则集 frontmatter 缺少 rulesetId/name/layerType')

  if (fileName) {
    const normalized = fileName.split('/').pop() || fileName
    const fileMatch = normalized.match(/^(\d+)-([A-Za-z0-9_-]+)-([A-Za-z0-9_-]+)\.rules\.md$/)
    if (!fileMatch)
      throw new Error(`规则集文件名不符合约定: ${normalized}`)
    const [, orderNo, layerType, rulesetId] = fileMatch
    if (Number(orderNo) !== Number(meta.orderNo) || layerType !== meta.layerType || rulesetId !== meta.rulesetId)
      throw new Error(`规则集文件名与 frontmatter 不一致: ${normalized}`)
  }

  return normalizeLayer(meta, parseRulesBlock(text))
}

function parseSchemaSection(markdownBody: string): PolicySchema {
  const schemaMatch = markdownBody.match(/##\s+Schema\s*([\s\S]*?)(?=\n##\s+Ruleset|\n##\s*$|$)/i)
  if (!schemaMatch)
    throw new Error('Bundle 文本缺少 `## Schema` 段落')
  const parsed = parseCodeFence(schemaMatch[1], 'Schema')
  return parsed.payload as PolicySchema
}

function parseRulesetSections(markdownBody: string): PolicyLayer[] {
  const sections = [...markdownBody.matchAll(/##\s+Ruleset\s*([\s\S]*?)(?=\n##\s+Ruleset|\n##\s*$|$)/gi)]
  if (!sections.length)
    throw new Error('Bundle 文本缺少 `## Ruleset` 段落')

  return sections.map((match, index) => {
    const section = match[1]
    const metaBlock = section.match(/```ya?ml\s*([\s\S]*?)```/i)
    const rulesBlock = section.match(/```json\s*([\s\S]*?)```/i)
    if (!metaBlock || !rulesBlock)
      throw new Error(`第 ${index + 1} 个 Ruleset 缺少元信息或规则 JSON 代码块`)

    const meta = YAML.parse(metaBlock[1]) as RulesetFrontmatter
    const rules = JSON.parse(rulesBlock[1]) as PolicyRule[]
    return normalizeLayer(
      {
        rulesetId: meta.rulesetId,
        name: meta.name,
        layerType: meta.layerType,
        orderNo: Number(meta.orderNo || 0),
        editable: meta.editable !== false,
        description: meta.description
      },
      rules
    )
  })
}

export function parsePolicyBundleText(text: string): PolicyBundle {
  const meta = parseFrontmatter(text) as PolicyBundleMeta
  if (meta.format !== 'policy-bundle/v1')
    throw new Error(`Bundle format 不合法: ${meta.format || '缺失'}`)

  const body = text.replace(/^---\s*\n[\s\S]*?\n---\s*/i, '')
  const schema = parseSchemaSection(body)
  const layers = parseRulesetSections(body).sort((a, b) => a.orderNo - b.orderNo)

  const document: PolicyDocument = {
    id: meta.bundleId,
    name: meta.bundleName,
    version: meta.version,
    targetSchema: schema.id,
    layers
  }

  return {
    meta,
    schema,
    document,
    sampleData: schema.sampleData,
    sourceType: 'markdown'
  }
}

export async function parsePolicyBundleZip(buffer: ArrayBuffer): Promise<PolicyBundle> {
  const zip = await JSZip.loadAsync(buffer)
  const schemaFile = zip.file(/^schema\/schema\.(json|yaml)$/i)[0]
  if (!schemaFile)
    throw new Error('压缩包缺少 schema/schema.json 或 schema/schema.yaml')

  const schemaRaw = await schemaFile.async('string')
  const schema = schemaFile.name.endsWith('.yaml')
    ? YAML.parse(schemaRaw) as PolicySchema
    : JSON.parse(schemaRaw) as PolicySchema

  const rulesetFiles = zip.file(/^rules\/.+\.rules\.md$/i)
  if (!rulesetFiles.length)
    throw new Error('压缩包缺少 rules/*.rules.md 文件')

  const layers: PolicyLayer[] = []
  for (const file of rulesetFiles) {
    const text = await file.async('string')
    layers.push(parseRulesetMarkdown(text, file.name))
  }

  const readme = zip.file(/^README\.md$/i)[0]
  const bundleName = schema.name || 'Policy Bundle'
  const meta: PolicyBundleMeta = {
    format: 'policy-bundle/v1',
    bundleId: schema.id || 'bundle-from-zip',
    bundleName,
    version: '1.0.0',
    schemaFormat: schemaFile.name.endsWith('.yaml') ? 'yaml' : 'json'
  }

  return {
    meta,
    schema,
    document: {
      id: meta.bundleId,
      name: meta.bundleName,
      version: meta.version,
      description: readme ? await readme.async('string') : undefined,
      targetSchema: schema.id,
      layers: layers.sort((a, b) => a.orderNo - b.orderNo)
    },
    sampleData: schema.sampleData,
    sourceType: 'zip'
  }
}

export async function parsePolicyBundleFile(file: File): Promise<PolicyBundle> {
  if (file.name.endsWith('.zip')) {
    return parsePolicyBundleZip(await file.arrayBuffer())
  }

  const text = await file.text()
  return parsePolicyBundleText(text)
}

export async function fetchPolicyBundleFromUrl(url: string): Promise<PolicyBundle> {
  const response = await fetch(url)
  if (!response.ok)
    throw new Error(`URL 加载失败: ${response.status}`)

  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('zip') || url.endsWith('.zip')) {
    const buffer = await response.arrayBuffer()
    const bundle = await parsePolicyBundleZip(buffer)
    bundle.sourceType = 'url'
    return bundle
  }

  const text = await response.text()
  const bundle = parsePolicyBundleText(text)
  bundle.sourceType = 'url'
  return bundle
}
