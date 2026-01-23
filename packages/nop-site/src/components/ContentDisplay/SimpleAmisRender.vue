<template>
  <div ref="containerRef" class="simple-amis-render"></div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { render as renderAmis } from 'amis'
import { createRoot } from 'react-dom/client'
import { toast } from 'amis-ui'

const props = defineProps({
  schema: {
    type: Object,
    required: true
  }
})

const containerRef = ref(null)
let reactRoot = null

const renderSchema = () => {
  if (!containerRef.value || !props.schema) return

  const env = {
    session: 'global',
    fetcher: () => Promise.resolve({ data: {} }),
    isCancel: () => false,
    notify: (type, msg) => toast[type] ? toast[type](msg) : console.log(type, msg),
    alert: (msg) => console.log('alert:', msg),
    confirm: (msg) => Promise.resolve(true),
    updateLocation: () => {},
    isCurrentUrl: () => false,
    jumpTo: () => {},
    copy: (content) => {
      navigator.clipboard?.writeText(content)
    },
    theme: 'cxd'
  }

  const amisElement = renderAmis(props.schema, {}, env)

  if (!reactRoot) {
    reactRoot = createRoot(containerRef.value)
  }
  reactRoot.render(amisElement)
}

watch(() => props.schema, renderSchema, { deep: true })

onMounted(() => {
  renderSchema()
})

onBeforeUnmount(() => {
  if (reactRoot) {
    reactRoot.unmount()
    reactRoot = null
  }
})
</script>

<style scoped>
.simple-amis-render {
  width: 100%;
  height: 100%;
}
</style>
