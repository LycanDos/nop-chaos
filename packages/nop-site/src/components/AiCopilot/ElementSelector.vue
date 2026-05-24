<script lang="ts">
import { defineComponent, ref, onMounted, onBeforeUnmount } from 'vue'
import type { ElementInfo } from './types'

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
      const parts: string[] = [el.tagName.toLowerCase()]
      if (el.id) parts.push(`#${el.id}`)
      if (el.className && typeof el.className === 'string') {
        const cls = el.className.split(' ').slice(0, 2).join('.')
        if (cls) parts.push(`.${cls}`)
      }
      return parts.join('')
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

      return {
        tag: el.tagName.toLowerCase(),
        id: el.id || '',
        className: typeof el.className === 'string' ? el.className : '',
        text: (el.textContent || '').trim().slice(0, 200),
        dataset,
        domPath,
      }
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
      style="display:none;position:fixed;background:#1890ff;color:#fff;padding:2px 8px;font-size:12px;border-radius:3px;z-index:100000;pointer-events:none;white-space:nowrap;font-family:monospace;"
    />
  </Teleport>
</template>
