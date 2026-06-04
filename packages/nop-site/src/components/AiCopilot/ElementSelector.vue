<script lang="ts">
import { defineComponent, ref, onMounted, onBeforeUnmount } from 'vue'
import type { ElementInfo, FieldOption } from './types'

export default defineComponent({
  name: 'ElementSelector',
  emits: ['select', 'cancel'],
  setup(_, { emit }) {
    const overlayRef = ref<HTMLElement | null>(null)
    const highlightRef = ref<HTMLElement | null>(null)
    const labelRef = ref<HTMLElement | null>(null)
    const active = ref(true)

    function onMouseMove(e: MouseEvent): void {
      if (!active.value) return

      const elements = document.elementsFromPoint(e.clientX, e.clientY)
      const target = elements.find(
        (el) =>
          el !== overlayRef.value &&
          el !== highlightRef.value &&
          el !== labelRef.value &&
          !el.classList.contains('copilot-selector'),
      ) as HTMLElement | undefined

      if (!target || !highlightRef.value || !labelRef.value) return

      const rect = target.getBoundingClientRect()
      highlightRef.value.style.display = 'block'
      highlightRef.value.style.left = rect.left + 'px'
      highlightRef.value.style.top = rect.top + 'px'
      highlightRef.value.style.width = rect.width + 'px'
      highlightRef.value.style.height = rect.height + 'px'

      const tagText = buildElementTag(target)
      labelRef.value.textContent = tagText
      labelRef.value.style.display = 'block'
      labelRef.value.style.left = rect.left + 'px'
      labelRef.value.style.top = Math.max(0, rect.top - 24) + 'px'
    }

    function onClick(e: MouseEvent): void {
      if (!active.value) return
      e.preventDefault()
      e.stopPropagation()

      const elements = document.elementsFromPoint(e.clientX, e.clientY)
      const target = elements.find(
        (el) =>
          el !== overlayRef.value &&
          el !== highlightRef.value &&
          el !== labelRef.value &&
          !el.classList.contains('copilot-selector'),
      ) as HTMLElement | undefined

      if (target) {
        const info = captureElementInfo(target)
        active.value = false
        emit('select', info)
      }
    }

    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape' || e.key === 'Esc') {
        active.value = false
        emit('cancel')
      }
    }

    function buildElementTag(el: HTMLElement): string {
      // 优先显示语义信息：按钮文字 / 字段标签
      const semantic = getSemanticLabel(el)
      if (semantic) return semantic

      // 退化：简化的元素描述
      const tag = el.tagName.toLowerCase()
      const id = el.id ? `#${el.id}` : ''
      const text = (el.textContent || '').trim().slice(0, 30)
      if (text && text.length < 30 && text !== el.tagName) {
        return `「${text}」<${tag}${id}>`
      }
      return `<${tag}${id}>`
    }

    /** 获取用户友好的语义标签 */
    function getSemanticLabel(el: HTMLElement): string | null {
      // 检测按钮
      let node: HTMLElement | null = el
      while (node && node !== document.body) {
        if (node.tagName === 'BUTTON' || node.getAttribute('role') === 'button') {
          const label = (node.textContent || '').trim().slice(0, 20)
          return label ? `按钮: ${label}` : '按钮'
        }
        if (node.classList.contains('btn') || node.classList.contains('amis-button')) {
          const label = (node.textContent || '').trim().slice(0, 20)
          return label ? `按钮: ${label}` : '按钮'
        }
        node = node.parentElement
      }

      // 检测表单控件
      const control = findControlInElement(el)
      if (control) {
        const label = findFieldLabel(control, control.getAttribute('name') || '')
        const typeName = getTypeDisplayName(control)
        if (label) {
          return `${label} · ${typeName}`
        }
        const name = control.getAttribute('name') || control.getAttribute('data-name')
        if (name) {
          return `${name} · ${typeName}`
        }
        return `${typeName}`
      }

      return null
    }

    /** 在元素及其父级中查找表单控件 */
    function findControlInElement(el: HTMLElement): HTMLElement | null {
      const controlTags = new Set(['INPUT', 'SELECT', 'TEXTAREA'])
      if (controlTags.has(el.tagName)) return el

      // 向上查找 AMIS 容器，再向内查找控件
      let node: HTMLElement | null = el
      while (node && node !== document.body) {
        if (
          node.classList.contains('amis-form-group') ||
          node.classList.contains('amis-form-item') ||
          node.classList.contains('amis-control')
        ) {
          const inner = node.querySelector('input, select, textarea')
          if (inner) return inner as HTMLElement
        }
        node = node.parentElement
      }
      // 如果元素本身包含表单控件
      const inner = el.querySelector('input, select, textarea')
      if (inner) return inner as HTMLElement
      return null
    }

    /** 获取控件类型的用户友好名称 */
    function getTypeDisplayName(control: HTMLElement): string {
      if (control instanceof HTMLInputElement) {
        switch (control.type) {
          case 'checkbox': return '复选框'
          case 'radio': return '单选框'
          case 'number': return '数字框'
          case 'date': case 'datetime-local': return '日期框'
          case 'email': return '邮箱框'
          case 'password': return '密码框'
          default: return '输入框'
        }
      }
      if (control instanceof HTMLSelectElement) return '下拉框'
      if (control instanceof HTMLTextAreaElement) return '文本框'
      return '控件'
    }

    function captureElementInfo(el: HTMLElement): ElementInfo {
      const domPath: string[] = []
      let node: HTMLElement | null = el
      while (node && node !== document.body) {
        const tag = node.tagName.toLowerCase()
        const id = node.id ? `#${node.id}` : ''
        const cls =
          node.className && typeof node.className === 'string'
            ? '.' + node.className.split(' ').slice(0, 2).join('.')
            : ''
        domPath.unshift(tag + id + cls)
        node = node.parentElement
      }

      const dataset: Record<string, string> = {}
      if (el.dataset) {
        for (const [key, val] of Object.entries(el.dataset)) {
          if (val !== undefined) dataset[key] = val
        }
      }

      const baseInfo: ElementInfo = {
        tag: el.tagName.toLowerCase(),
        id: el.id || '',
        className: typeof el.className === 'string' ? el.className : '',
        text: (el.textContent || '').trim().slice(0, 200),
        dataset,
        domPath,
      }

      // 提取语义字段信息
      return enrichWithSemanticInfo(el, baseInfo)
    }

    function enrichWithSemanticInfo(el: HTMLElement, base: ElementInfo): ElementInfo {
      // 检测是否为操作按钮
      const actionBtn = findActionButton(el)
      if (actionBtn) {
        return { ...base, ...actionBtn }
      }

      // 检测是否为表单字段
      const fieldInfo = findFieldInfo(el)
      if (fieldInfo) {
        return { ...base, ...fieldInfo }
      }

      return base
    }

    function findActionButton(el: HTMLElement): Partial<ElementInfo> | null {
      let node: HTMLElement | null = el
      while (node) {
        if (node.tagName === 'BUTTON' || node.getAttribute('role') === 'button') {
          const actionName =
            node.getAttribute('data-action') ||
            node.getAttribute('data-action-name') ||
            node.getAttribute('name') ||
            (node.textContent || '').trim().slice(0, 30)
          return {
            actionName,
            label: (node.textContent || '').trim().slice(0, 50),
            fieldType: 'action',
          }
        }
        if (node.classList.contains('btn') || node.classList.contains('amis-button')) {
          const actionName =
            node.getAttribute('data-action') ||
            node.getAttribute('data-action-name') ||
            node.getAttribute('name') ||
            (node.textContent || '').trim().slice(0, 30)
          return {
            actionName,
            label: (node.textContent || '').trim().slice(0, 50),
            fieldType: 'action',
          }
        }
        if (node === document.body) break
        node = node.parentElement
      }
      return null
    }

    function findFieldInfo(el: HTMLElement): Partial<ElementInfo> | null {
      // 1. 查找表单控件
      const control = findClosestFormControl(el)
      if (!control) return null

      // 2. 提取字段名
      const fieldName =
        control.getAttribute('name') ||
        control.getAttribute('data-name') ||
        control.getAttribute('data-field') ||
        control.getAttribute('id') ||
        ''

      // 3. 提取标签文字（查找最近的 label 或 .field-label）
      const label = findFieldLabel(control, fieldName)

      // 4. 提取当前值
      const value = extractControlValue(control)

      // 5. 提取控件类型
      const fieldType = extractControlType(control)

      // 6. 检查只读/禁用状态
      const readonly = control.hasAttribute('readonly') || control.hasAttribute('disabled')
      const required = control.hasAttribute('required') || control.getAttribute('aria-required') === 'true'

      // 7. 查找校验错误信息
      const validationErrors = findValidationErrors(control)

      // 8. 查找选项（select/radio/checkbox）
      const options = extractControlOptions(control)

      return {
        fieldName,
        label,
        value,
        fieldType,
        readonly,
        required,
        validationErrors: validationErrors.length > 0 ? validationErrors : undefined,
        options: options && options.length > 0 ? options : undefined,
      }
    }

    function findClosestFormControl(el: HTMLElement): HTMLElement | null {
      const controlTags = new Set(['INPUT', 'SELECT', 'TEXTAREA', 'OPTION'])
      let node: HTMLElement | null = el

      while (node && node !== document.body) {
        if (controlTags.has(node.tagName)) return node

        // AMIS 控件容器
        if (
          node.classList.contains('amis-form-group') ||
          node.classList.contains('amis-form-item') ||
          node.classList.contains('amis-control') ||
          node.getAttribute('data-name') ||
          node.getAttribute('data-field')
        ) {
          // 在此容器内查找实际控件
          const inner = node.querySelector('input, select, textarea')
          if (inner) return inner as HTMLElement
          return node
        }

        node = node.parentElement
      }
      return null
    }

    function findFieldLabel(control: HTMLElement, fieldName: string): string {
      // 查找同表单组内的 label
      let parent: HTMLElement | null = control.parentElement
      while (parent && parent !== document.body) {
        const label = parent.querySelector('label')
        if (label && label.textContent?.trim()) {
          return label.textContent.trim().slice(0, 100)
        }
        if (parent.classList.contains('amis-form-group') || parent.classList.contains('amis-form-item')) {
          break
        }
        parent = parent.parentElement
      }

      // 查找关联的 label[for]
      const controlId = control.getAttribute('id')
      if (controlId) {
        const labelFor = document.querySelector(`label[for="${controlId}"]`)
        if (labelFor && labelFor.textContent?.trim()) {
          return labelFor.textContent.trim().slice(0, 100)
        }
      }

      // 使用 placeholder 作为退化
      const placeholder = control.getAttribute('placeholder')
      if (placeholder) return placeholder

      return fieldName || ''
    }

    function extractControlValue(control: HTMLElement): any {
      if (control instanceof HTMLInputElement) {
        if (control.type === 'checkbox' || control.type === 'radio') {
          return control.checked
        }
        return control.value || ''
      }
      if (control instanceof HTMLSelectElement) {
        return control.value || ''
      }
      if (control instanceof HTMLTextAreaElement) {
        return control.value || ''
      }
      // 尝试从 data-value 取值
      const dataValue = control.getAttribute('data-value')
      if (dataValue !== null) return dataValue
      // 尝试取 textContent
      const text = (control.textContent || '').trim()
      if (text && text.length < 200) return text
      return ''
    }

    function extractControlType(control: HTMLElement): string {
      if (control instanceof HTMLInputElement) {
        const type = control.type || 'text'
        switch (type) {
          case 'number': return 'number'
          case 'email': return 'email'
          case 'password': return 'password'
          case 'tel': return 'phone'
          case 'date': case 'datetime-local': return 'date'
          case 'checkbox': return 'boolean'
          case 'radio': return 'select'
          default: return 'text'
        }
      }
      if (control instanceof HTMLSelectElement) return 'select'
      if (control instanceof HTMLTextAreaElement) return 'textarea'
      if (control.classList.contains('switch') || control.getAttribute('role') === 'switch') return 'boolean'
      return 'text'
    }

    function findValidationErrors(control: HTMLElement): string[] {
      const errors: string[] = []

      // 检查控件的 validation state
      if (control.getAttribute('aria-invalid') === 'true') {
        const ariaErr = control.getAttribute('aria-errormessage')
        if (ariaErr) {
          const errEl = document.getElementById(ariaErr)
          if (errEl && errEl.textContent?.trim()) {
            errors.push(errEl.textContent.trim())
          }
        }
      }

      // 查找 AMIS 校验错误容器
      let parent: HTMLElement | null = control.parentElement
      while (parent && parent !== document.body) {
        const errorEls = parent.querySelectorAll('.form-error, .field-error, .has-error, .amis-form-error, .text-danger')
        errorEls.forEach(el => {
          const text = (el.textContent || '').trim()
          if (text && !errors.includes(text)) errors.push(text)
        })
        if (parent.classList.contains('amis-form-group') || parent.classList.contains('amis-form-item')) {
          break
        }
        parent = parent.parentElement
      }

      // 检查控件自身的 has-error class
      if (control.classList.contains('has-error') || control.classList.contains('is-invalid')) {
        const title = control.getAttribute('title')
        if (title && title.trim()) errors.push(title.trim())
      }

      return errors
    }

    function extractControlOptions(control: HTMLElement): FieldOption[] | undefined {
      if (control instanceof HTMLSelectElement) {
        const opts: FieldOption[] = []
        for (let i = 0; i < control.options.length; i++) {
          const opt = control.options[i]
          opts.push({ label: opt.text || opt.value, value: opt.value })
        }
        return opts.length > 0 ? opts : undefined
      }

      // 查找同组的 radio/checkbox 选项
      const name = control.getAttribute('name')
      if (name && (control instanceof HTMLInputElement) && (control.type === 'radio' || control.type === 'checkbox')) {
        const siblings = document.querySelectorAll(`input[name="${CSS.escape(name)}"]`)
        const opts: FieldOption[] = []
        siblings.forEach(sib => {
          const label = findFieldLabel(sib as HTMLElement, name)
          const val = (sib as HTMLInputElement).value
          opts.push({ label: label || val, value: val })
        })
        return opts.length > 0 ? opts : undefined
      }

      return undefined
    }

    onMounted(() => {
      document.addEventListener('mousemove', onMouseMove, true)
      document.addEventListener('click', onClick, true)
      document.addEventListener('keydown', onKeyDown, true)
    })

    onBeforeUnmount(() => {
      document.removeEventListener('mousemove', onMouseMove, true)
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('keydown', onKeyDown, true)
    })

    return {
      overlayRef,
      highlightRef,
      labelRef,
      active,
    }
  },
})
</script>

<template>
  <Teleport to="body">
    <div
      ref="overlayRef"
      class="copilot-selector-overlay"
      style="position:fixed;top:0;left:0;width:100%;height:100%;z-index:99998;cursor:crosshair;"
    />
    <div
      ref="highlightRef"
      class="copilot-selector-highlight"
      style="display:none;position:fixed;border:2px solid #1890ff;background:rgba(24,144,255,0.1);z-index:99999;pointer-events:none;border-radius:2px;"
    />
    <div
      ref="labelRef"
      class="copilot-selector-label"
      style="display:none;position:fixed;background:#1890ff;color:#fff;padding:4px 10px;font-size:12px;border-radius:4px;z-index:100000;pointer-events:none;white-space:nowrap;max-width:320px;overflow:hidden;text-overflow:ellipsis;box-shadow:0 2px 8px rgba(0,0,0,0.15);"
    />
  </Teleport>
</template>
