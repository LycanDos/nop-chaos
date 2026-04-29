import { useBpmnContextService, bpmnContext, selectedElementRef } from '@/hooks/useService.ts'
import { getBusinessObject, getDi, is, isAny } from 'bpmn-js/lib/util/ModelUtil'
import type { Element, ModdleElement } from 'bpmn-js/lib/model/Types'
import { computed, ref, watch } from 'vue'
import Ids from 'ids'
import type BpmnFactory from 'bpmn-js/lib/features/modeling/BpmnFactory'
import type Canvas from 'diagram-js/lib/core/Canvas'
import {
  addExtensionElements,
  getExtensionElementsList,
} from '@/designer/utils/ExtensionElementsUtil.ts'
import { isDelegateExprValid } from '@/designer/utils/ValidationUtil.ts'
import type BpmnModeler from 'bpmn-js/lib/Modeler'
import type ElementRegistry from 'diagram-js/lib/core/ElementRegistry'
import type GraphicsFactory from 'diagram-js/lib/core/GraphicsFactory'

export const isConditionalSource = (element: Element) => {
  return isAny(element, [
    'bpmn:Activity',
    'bpmn:ExclusiveGateway',
    'bpmn:InclusiveGateway',
    'bpmn:ComplexGateway',
  ])
}

export const nextId = (prefix = '') => {
  const ids = new Ids([32, 32, 1])
  return ids.nextPrefixed(prefix)
}

export const filterElementsByType = (objectList: any[], type: string) => {
  const list = objectList || []
  return list.filter((element) => is(element, type))
}

export const findRootElementsByType = (businessObject: ModdleElement, referencedType: string) => {
  const root = getRoot(businessObject)
  return filterElementsByType(root.get('rootElements'), referencedType)
}

export const getRoot = (businessObject: ModdleElement) => {
  let parent = businessObject
  while (parent?.$parent) {
    parent = parent.$parent
  }
  return parent
}

export const getRootElement = () => {
  const { getService } = useBpmnContextService()
  const canvas = getService<Canvas>('canvas')
  return canvas?.getRootElement()
}

export const removeRootElement = (element: Element) => {
  element = toRaw(element)
  const { getService, updateProperties } = useBpmnContextService()
  const modeler = getService<BpmnModeler>('bpmnjs')
  const root = modeler?.getDefinitions()
  if (root) {
    const elements: Element[] = root.get('rootElements') ?? []
    const newElements = elements.filter((e: Element) => e !== element)
    updateProperties(
      {
        rootElements: newElements,
      },
      root,
    )
  }
}

export const createOrUpdateRootElement = (
  properties: Record<string, any>,
  element: Element | string,
) => {
  const { getService, updateProperties } = useBpmnContextService()
  const modeler = getService<BpmnModeler>('bpmnjs')
  const bpmnFactory = getService<BpmnFactory>('bpmnFactory')
  const root = modeler?.getDefinitions()
  if (root && bpmnFactory) {
    const elements: Element[] = root.get('rootElements') ?? []
    if (typeof element === 'string') {
      const newElement = createElement(element, bpmnFactory, properties, root)
      updateProperties(
        {
          rootElements: [...elements, newElement],
        },
        root,
      )
    } else {
      element = toRaw(element)
      updateProperties(properties, element)
    }
  }
}

export const createElement = (
  type: string,
  bpmnFactory: BpmnFactory,
  properties?: Record<string, any>,
  parent?: Element,
) => {
  const element: Element = bpmnFactory.create(type, properties)
  if (parent) {
    element.$parent = parent
  }
  return element
}

export const findRootElementById = (businessObject: ModdleElement, type: string, id: string) => {
  const elements = findRootElementsByType(businessObject, type)
  return elements.find((element) => element.id === id)
}

export const useCustomRef = <T = string>(key: string) => {
  const { updateProperties } = useBpmnContextService()
  const innerRef = ref<T>() as any

  // 当 selectedElement 变化时，更新 innerRef
  watch(selectedElementRef, (el) => {
    innerRef.value = el?.businessObject?.get(key)
  }, { immediate: true })

  // 返回一个可写的 computed
  return computed<T>({
    get() {
      return innerRef.value
    },
    set(newValue: T) {
      if (bpmnContext.selectedElement) {
        updateProperties({ [key]: newValue })
        innerRef.value = newValue
      }
    },
  })
}

export const useFieldRef = <T = string>(key: string) => {
  const { updateProperties } = useBpmnContextService()
  const innerRef = ref<T>() as any

  watch(selectedElementRef, (el) => {
    if (!el) { innerRef.value = undefined; return }
    const fields = getExtensionElementsList(el, 'flowable:Field')
    const field = fields.find((field) => field.get('name') === key)
    innerRef.value = field?.get('stringValue') || field?.get('expression') || field?.get('string')
  }, { immediate: true })

  return computed<T>({
    get() {
      return innerRef.value
    },
    set(newValue: T) {
      const el = bpmnContext.selectedElement
      if (!el) return
      const fields = getExtensionElementsList(el, 'flowable:Field')
      const field = fields.find((field) => field.get('name') === key)
      const properties: Record<string, any> = {
        name: key,
        string: undefined,
        expression: undefined,
        stringValue: undefined,
      }
      if (Array.isArray(newValue)) {
        properties['stringValue'] = newValue
      } else if (typeof newValue === 'string' && isDelegateExprValid(newValue, true)) {
        properties['expression'] = newValue
      } else {
        properties['string'] = newValue
      }
      if (!field) {
        const businessObject = getBusinessObject(el)
        if (!businessObject) return
        const fieldElement = businessObject.$model.create('flowable:Field', properties)
        addExtensionElements(el, fieldElement)
      } else {
        updateProperties(properties, field)
      }
      innerRef.value = newValue
    },
  })
}

export const getLoopCharacteristics = (element: Element) => {
  const bo = getBusinessObject(element)
  return bo.loopCharacteristics
}

export const isMultiInstanceSupported = (element: Element) => {
  const loopCharacteristics = getLoopCharacteristics(element)
  return !!loopCharacteristics && is(loopCharacteristics, 'bpmn:MultiInstanceLoopCharacteristics')
}

export const isPropertySupported = (element: Element, property: string) => {
  const businessObject = getBusinessObject(element)
  const propertiesByName = businessObject?.$descriptor?.propertiesByName || {}
  return !!propertiesByName[property]
}

export const setElementColor = (element: Element[], colors: Record<string, string>) => {
  const { getService } = useBpmnContextService()
  const elementRegistry = getService<ElementRegistry>('elementRegistry')
  const graphicsFactory = getService<GraphicsFactory>('graphicsFactory')
  element.forEach((element) => {
    const di = getDi(element)
    if (di) {
      if (isAny(di, ['bpmndi:BPMNEdge', 'bpmndi:BPMNShape'])) {
        for (const key in colors) {
          di.set(key, colors[key])
        }
      }
      const gfx = elementRegistry?.getGraphics(element)
      const type = element.waypoints ? 'connection' : 'shape'
      gfx && graphicsFactory?.update(type, element, gfx)
    }
  })
}
