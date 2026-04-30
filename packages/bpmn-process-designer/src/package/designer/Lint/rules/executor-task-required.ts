import type { Reporter, RuleDefinition } from 'bpmnlint/lib/types'
import type { ModdleElement } from 'bpmn-js/lib/model/Types.ts'
import { is } from 'bpmn-js/lib/util/ModelUtil'

/**
 * 执行器任务校验规则
 * 检查 type=executor 的 ServiceTask 是否配置了必要的执行器绑定
 */
const executorTaskRequired = (): RuleDefinition => {
  return {
    check: (node: ModdleElement, reporter: Reporter) => {
      if (is(node, 'bpmn:ServiceTask')) {
        const type = node.get('type')
        if (type === 'executor') {
          // 检查是否存在 ExecutorBinding 扩展元素
          const extensionElements = node.get('extensionElements')
          const values = extensionElements?.get('values') || []
          const executorBinding = values.find(
            (e: ModdleElement) => e.$type === 'l:ExecutorBinding'
          )

          if (!executorBinding) {
            reporter.report(node.id, 'Missing executor binding configuration')
            return
          }

          const executorDefId = executorBinding.get('executorDefId')
          if (!executorDefId) {
            reporter.report(node.id, 'Missing executor selection')
            return
          }

          const methodId = executorBinding.get('methodId')
          const methodCode = executorBinding.get('methodCode')
          if (!methodId && !methodCode) {
            reporter.report(node.id, 'Missing executor method selection')
          }
        }
      }
    },
    meta: {
      documentation: {
        url: 'https://demo.lowflow.vip/',
      },
    },
  }
}

export default executorTaskRequired
