/**
 * Moddle 描述符 XML 往返测试
 *
 * 验证 lProcessDescriptor.json 定义的 l:MethodBinding 扩展元素
 * 能够通过 bpmn-moddle 的 fromXML → toXML 完整保留所有属性值。
 *
 * Validates: Requirements 1.5, 属性 2
 */
import { describe, it, expect } from 'vitest'
import * as BpmnModdleModule from 'bpmn-moddle'
import lProcessDescriptor from '../lProcessDescriptor.json'

/**
 * 创建带有 l-process 扩展的 BpmnModdle 实例
 *
 * bpmn-moddle 的导出方式在不同环境下有差异：
 * - ESM: export { SimpleBpmnModdle as default }
 * - CJS: module.exports = SimpleBpmnModdle
 * 需要兼容两种情况
 */
function createModdle(): any {
  const mod = BpmnModdleModule as any
  // 优先使用 default export（ESM），否则尝试命名导出
  const Factory = mod.default || mod.BpmnModdle || mod
  // 判断是构造函数还是工厂函数
  if (Factory.prototype && Factory.prototype.fromXML) {
    return new Factory({ l: lProcessDescriptor })
  }
  return Factory({ l: lProcessDescriptor })
}

/**
 * 构造包含 <l:methodBinding> 的最小 BPMN XML
 */
function buildBpmnXml(attrs: {
  executorDefId: string
  methodCode: string
  versionConstraintType: string
  versionConstraintExpr: string
  timeoutMs: number
  asyncFlag: boolean
}): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions
  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:l="http://lycan.com/schema/l-process/1.0"
  id="Definitions_1"
  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="true">
    <bpmn:serviceTask id="Task_1" name="测试任务">
      <bpmn:extensionElements>
        <l:methodBinding
          executorDefId="${attrs.executorDefId}"
          methodCode="${attrs.methodCode}"
          versionConstraintType="${attrs.versionConstraintType}"
          versionConstraintExpr="${attrs.versionConstraintExpr}"
          timeoutMs="${attrs.timeoutMs}"
          asyncFlag="${attrs.asyncFlag}" />
      </bpmn:extensionElements>
    </bpmn:serviceTask>
  </bpmn:process>
</bpmn:definitions>`
}

describe('lProcessDescriptor XML 往返测试', () => {
  it('importXML → toXML 应保留 l:methodBinding 的所有属性值', async () => {
    const moddle = createModdle()

    // 构造输入 XML，包含所有属性
    const inputXml = buildBpmnXml({
      executorDefId: 'exec-pricing-001',
      methodCode: 'calculatePrice',
      versionConstraintType: 'LATEST',
      versionConstraintExpr: '',
      timeoutMs: 30000,
      asyncFlag: false,
    })

    // 导入 XML
    const { rootElement } = await moddle.fromXML(inputXml)

    // 导出 XML
    const { xml: outputXml } = await moddle.toXML(rootElement)

    // 再次导入导出后的 XML，验证属性值保留
    const { rootElement: roundTripped } = await moddle.fromXML(outputXml)

    // 从 roundTripped 中提取 serviceTask 的 extensionElements
    const process = roundTripped.rootElements[0]
    const serviceTask = process.flowElements[0]
    const extensionElements = serviceTask.extensionElements

    expect(extensionElements).toBeDefined()
    expect(extensionElements.values).toHaveLength(1)

    const binding = extensionElements.values[0]

    // 验证所有属性值在往返后保持不变
    expect(binding.$type).toBe('l:MethodBinding')
    expect(binding.executorDefId).toBe('exec-pricing-001')
    expect(binding.methodCode).toBe('calculatePrice')
    expect(binding.versionConstraintType).toBe('LATEST')
    expect(binding.versionConstraintExpr).toBe('')
    expect(binding.timeoutMs).toBe(30000)
    expect(binding.asyncFlag).toBe(false)
  })

  it('应保留非空 versionConstraintExpr 和 asyncFlag=true', async () => {
    const moddle = createModdle()

    const inputXml = buildBpmnXml({
      executorDefId: 'exec-order-002',
      methodCode: 'submitOrder',
      versionConstraintType: 'RANGE',
      versionConstraintExpr: '>=1.0.0 <2.0.0',
      timeoutMs: 60000,
      asyncFlag: true,
    })

    const { rootElement } = await moddle.fromXML(inputXml)
    const { xml: outputXml } = await moddle.toXML(rootElement)
    const { rootElement: roundTripped } = await moddle.fromXML(outputXml)

    const process = roundTripped.rootElements[0]
    const serviceTask = process.flowElements[0]
    const binding = serviceTask.extensionElements.values[0]

    expect(binding.executorDefId).toBe('exec-order-002')
    expect(binding.methodCode).toBe('submitOrder')
    expect(binding.versionConstraintType).toBe('RANGE')
    expect(binding.versionConstraintExpr).toBe('>=1.0.0 <2.0.0')
    expect(binding.timeoutMs).toBe(60000)
    expect(binding.asyncFlag).toBe(true)
  })

  it('导出的 XML 应包含 l 命名空间声明和 l:methodBinding 元素', async () => {
    const moddle = createModdle()

    const inputXml = buildBpmnXml({
      executorDefId: 'exec-001',
      methodCode: 'doWork',
      versionConstraintType: 'EXACT',
      versionConstraintExpr: '1.2.3',
      timeoutMs: 5000,
      asyncFlag: false,
    })

    const { rootElement } = await moddle.fromXML(inputXml)
    const { xml: outputXml } = await moddle.toXML(rootElement)

    // 验证 XML 字符串中包含命名空间声明和元素
    expect(outputXml).toContain('xmlns:l="http://lycan.com/schema/l-process/1.0"')
    expect(outputXml).toContain('l:methodBinding')
    expect(outputXml).toContain('executorDefId="exec-001"')
    expect(outputXml).toContain('methodCode="doWork"')
    expect(outputXml).toContain('versionConstraintType="EXACT"')
    expect(outputXml).toContain('versionConstraintExpr="1.2.3"')
    expect(outputXml).toContain('timeoutMs="5000"')
    expect(outputXml).toContain('asyncFlag="false"')
  })
})
