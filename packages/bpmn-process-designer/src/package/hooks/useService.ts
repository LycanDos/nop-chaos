import type { Element, ModdleElement } from 'bpmn-js/lib/model/Types'
import type { Injector } from 'didi'
import type Modeling from 'bpmn-js/lib/features/modeling/Modeling'
import { getBusinessObject } from 'bpmn-js/lib/util/ModelUtil'
import { shallowRef } from 'vue'

export interface BpmnContext {
  selectedElement?: Element
  injector?: Injector
}

// 响应式的 selectedElement，子组件可以 watch 它
export const selectedElementRef = shallowRef<Element | null>(null)

export const bpmnContext: BpmnContext = {
  selectedElement: undefined,
  injector: undefined,
}

export const useBpmnContextService = (context?: BpmnContext) => {
  if (context) {
    bpmnContext.selectedElement = context.selectedElement
    bpmnContext.injector = context.injector
    // 同步更新响应式 ref
    selectedElementRef.value = context.selectedElement || null
  }
  const getService = <T>(serviceName: string) => {
    return bpmnContext.injector?.get<T>(serviceName)
  }
  const updateProperties = (props: Record<string, any>, moddleElement?: ModdleElement) => {
    if (bpmnContext.selectedElement) {
      const modeling = getService<Modeling>('modeling')
      const businessObject = getBusinessObject(bpmnContext.selectedElement)
      if (modeling && businessObject) {
        modeling.updateModdleProperties(
          bpmnContext.selectedElement,
          moddleElement || businessObject,
          props,
        )
      }
    }
  }

  return {
    getService,
    updateProperties,
    selectedElement: bpmnContext.selectedElement!,
    injector: bpmnContext.injector!,
  }
}
