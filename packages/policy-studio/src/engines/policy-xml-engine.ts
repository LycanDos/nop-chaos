import type { ConditionNode, PolicyDocument, PolicyLayer, PolicyRule } from '../types'

export class PolicyXmlEngine {
  export(document: PolicyDocument, pretty = true): string {
    const indent = pretty ? '  ' : ''
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += `<policy id="${escapeXml(document.id)}" name="${escapeXml(document.name)}"`
    if (document.targetSchema)
      xml += ` targetSchema="${escapeXml(document.targetSchema)}"`
    xml += ` version="${escapeXml(document.version || '1.0')}">\n`

    if (document.description) {
      xml += `${indent}<description>${escapeXml(document.description)}</description>\n`
    }

    xml += `${indent}<layers>\n`
    for (const layer of [...document.layers].sort((a, b) => a.orderNo - b.orderNo)) {
      xml += this.exportLayer(layer, indent + indent)
    }
    xml += `${indent}</layers>\n`
    xml += '</policy>'
    return xml
  }

  private exportLayer(layer: PolicyLayer, indent: string): string {
    let xml = `${indent}<layer id="${escapeXml(layer.id)}" type="${layer.layerType}" name="${escapeXml(layer.name)}" orderNo="${layer.orderNo}" editable="${layer.editable}">\n`
    if (layer.description)
      xml += `${indent}  <description>${escapeXml(layer.description)}</description>\n`
    for (const rule of [...layer.rules].sort((a, b) => a.orderNo - b.orderNo)) {
      xml += this.exportRule(rule, indent + '  ')
    }
    xml += `${indent}</layer>\n`
    return xml
  }

  private exportRule(rule: PolicyRule, indent: string): string {
    let xml = `${indent}<rule id="${escapeXml(rule.id)}" path="${escapeXml(rule.path)}" operator="${rule.operator}" enabled="${rule.enabled}" orderNo="${rule.orderNo}"`
    if (rule.family)
      xml += ` family="${rule.family}"`
    if (rule.errorCode)
      xml += ` errorCode="${escapeXml(rule.errorCode)}"`
    if (rule.errorDescription)
      xml += ` errorDescription="${escapeXml(rule.errorDescription)}"`
    if (rule.severity !== undefined)
      xml += ` severity="${rule.severity}"`
    if (rule.targetFamily)
      xml += ` targetFamily="${escapeXml(rule.targetFamily)}"`
    if (rule.lockMode)
      xml += ` lockMode="${rule.lockMode}"`
    xml += '>\n'

    if (rule.value !== undefined)
      xml += `${indent}  <value>${escapeXml(String(rule.value))}</value>\n`
    if (rule.defaultValue !== undefined)
      xml += `${indent}  <defaultValue>${escapeXml(String(rule.defaultValue))}</defaultValue>\n`
    if (rule.lockedValue !== undefined)
      xml += `${indent}  <lockedValue>${escapeXml(String(rule.lockedValue))}</lockedValue>\n`
    if (rule.min !== undefined || rule.max !== undefined) {
      xml += `${indent}  <range`
      if (rule.min !== undefined)
        xml += ` min="${rule.min}"`
      if (rule.max !== undefined)
        xml += ` max="${rule.max}"`
      xml += '/>\n'
    }
    if (rule.pattern)
      xml += `${indent}  <pattern>${escapeXml(rule.pattern)}</pattern>\n`
    if (rule.values?.length)
      xml += `${indent}  <values>${rule.values.map(value => `<value>${escapeXml(String(value))}</value>`).join('')}</values>\n`
    if (rule.note)
      xml += `${indent}  <note>${escapeXml(rule.note)}</note>\n`
    if (rule.applyWhen) {
      xml += `${indent}  <apply-when>\n`
      xml += this.exportCondition(rule.applyWhen, indent + '    ')
      xml += `${indent}  </apply-when>\n`
    }

    xml += `${indent}</rule>\n`
    return xml
  }

  private exportCondition(condition: ConditionNode, indent: string): string {
    switch (condition.type) {
      case 'simple':
        return this.exportSimpleCondition(condition, indent)
      case 'and':
      case 'or':
        return `${indent}<${condition.type}>\n${(condition.conditions || []).map(item => this.exportCondition(item, `${indent}  `)).join('')}${indent}</${condition.type}>\n`
      case 'not':
        return `${indent}<not>\n${condition.conditions?.[0] ? this.exportCondition(condition.conditions[0], `${indent}  `) : ''}${indent}</not>\n`
      case 'if':
        return this.exportIfCondition(condition, indent)
      case 'expr':
        return `${indent}<expr>${escapeXml(String(condition.value || condition.test || ''))}</expr>\n`
      default:
        return ''
    }
  }

  private exportSimpleCondition(condition: ConditionNode, indent: string): string {
    const tagName = escapeXml(condition.operator || 'condition')
    let xml = `${indent}<${tagName}`
    if (condition.field)
      xml += ` name="${escapeXml(condition.field)}"`

    if (condition.operator === 'regex') {
      if (condition.pattern)
        xml += ` pattern="${escapeXml(condition.pattern)}"`
      else if (condition.value !== undefined)
        xml += ` pattern="${escapeXml(String(condition.value))}"`
    } else if (condition.value !== undefined) {
      xml += ` value="${escapeXml(String(condition.value))}"`
    }

    if (condition.min !== undefined)
      xml += ` min="${escapeXml(String(condition.min))}"`
    if (condition.max !== undefined)
      xml += ` max="${escapeXml(String(condition.max))}"`

    if (!condition.pattern && condition.min === undefined && condition.max === undefined) {
      xml += '/>\n'
      return xml
    }

    xml += '>\n'
    if (condition.min !== undefined || condition.max !== undefined) {
      xml += `${indent}  <range`
      if (condition.min !== undefined)
        xml += ` min="${condition.min}"`
      if (condition.max !== undefined)
        xml += ` max="${condition.max}"`
      xml += '/>\n'
    }
    if (condition.pattern)
      xml += `${indent}  <pattern>${escapeXml(condition.pattern)}</pattern>\n`
    xml += `${indent}</${tagName}>\n`
    return xml
  }

  private exportIfCondition(condition: ConditionNode, indent: string): string {
    let xml = `${indent}<if`
    if (condition.test)
      xml += ` test="${escapeXml(condition.test)}"`
    xml += '>\n'
    if (condition.then) {
      xml += `${indent}  <then>\n`
      xml += this.exportCondition(condition.then, `${indent}    `)
      xml += `${indent}  </then>\n`
    }
    if (condition.else) {
      xml += `${indent}  <else>\n`
      xml += this.exportCondition(condition.else, `${indent}    `)
      xml += `${indent}  </else>\n`
    }
    xml += `${indent}</if>\n`
    return xml
  }
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
