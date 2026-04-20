<template>
  <details v-if="node.type === 'group'" class="tree-group" :style="groupStyle" open>
    <summary class="group-summary">
      <span class="group-arrow">▸</span>
      <span class="group-label">{{ node.label }}</span>
      <span class="group-count">{{ node.fieldCount }} 个字段</span>
    </summary>
    <div class="group-children">
      <PolicyPreviewTree
        v-for="child in node.children"
        :key="child.key"
        :node="child"
        :depth="depth + 1"
      />
    </div>
  </details>

  <div v-else class="field-node" :style="fieldStyle">
    <div class="field-header">
      <div class="field-inline-row">
        <span class="field-title">{{ node.label }}</span>
        <span v-if="node.aliases?.length" class="field-aliases">Alias: {{ node.aliases.join(' / ') }}</span>
        <span v-if="node.path" class="field-path">
          <span v-if="pathPrefix(node.path)">{{ pathPrefix(node.path) }}</span><strong>{{ pathLeaf(node.path) }}</strong>
        </span>
        <span v-if="node.meta" class="field-meta">{{ node.meta }}</span>
      </div>
    </div>

    <div v-if="node.compiledRules.length" class="compiled-list">
      <div
        v-for="item in node.compiledRules"
        :key="`${item.layerId}-${item.ruleId}`"
        class="compiled-item"
        :class="`is-${item.status}`"
      >
        <div class="compiled-main-row">
          <span class="compiled-main">{{ item.layerType }} / {{ item.family || item.operator }} / {{ item.summary }}</span>
          <span class="compiled-status">{{ statusLabel(item.status) }}</span>
        </div>
        <span v-if="item.reason" class="compiled-reason">{{ item.reason }}</span>
      </div>
    </div>

    <div v-else-if="!node.effectiveSummaries.length" class="field-empty">
      当前字段暂无校验
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CompiledRuleStatus, PolicyPreviewTreeNode } from '../types'

defineOptions({
  name: 'PolicyPreviewTree'
})

const props = withDefaults(defineProps<{
  node: PolicyPreviewTreeNode
  depth?: number
}>(), {
  depth: 0
})

const levelColors = ['#2563eb', '#0f766e', '#ca8a04', '#9333ea', '#dc2626', '#475569']
const currentColor = computed(() => levelColors[props.depth % levelColors.length])
const groupStyle = computed(() => ({ '--tree-accent': currentColor.value }))
const fieldStyle = computed(() => ({ '--tree-accent': currentColor.value }))

function statusLabel(status: CompiledRuleStatus): string {
  if (status === 'effective')
    return '生效'
  if (status === 'overridden')
    return '已覆盖'
  if (status === 'rejected')
    return '无效'
  return '已清除'
}

function pathPrefix(path?: string) {
  if (!path || !path.includes('.'))
    return ''
  return `${path.split('.').slice(0, -1).join('.')}.`
}

function pathLeaf(path?: string) {
  if (!path)
    return ''
  return path.split('.').pop() || path
}
</script>

<style scoped>
.tree-group + .tree-group,
.tree-group + .field-node,
.field-node + .tree-group,
.field-node + .field-node {
  margin-top: 4px;
}

.group-summary {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  padding: 5px 8px;
  border: 1px solid color-mix(in srgb, var(--tree-accent) 28%, #dcdfe6);
  border-radius: 6px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--tree-accent) 7%, #ffffff) 0%, #f7f9fc 100%);
  cursor: pointer;
  list-style: none;
  user-select: none;
}

.group-summary::-webkit-details-marker {
  display: none;
}

.tree-group[open] > .group-summary .group-arrow {
  transform: rotate(90deg);
}

.group-arrow {
  color: var(--tree-accent);
  font-size: 11px;
  transition: transform 0.15s ease;
}

.group-label {
  font-weight: 600;
  color: var(--tree-accent);
  font-size: 12px;
  line-height: 1.3;
}

.group-count {
  margin-left: auto;
  color: #909399;
  font-size: 10px;
}

.group-children {
  margin-left: 8px;
  padding-left: 12px;
  border-left: 1px solid color-mix(in srgb, var(--tree-accent) 35%, #e4e7ed);
  margin-top: 4px;
}

.field-node {
  padding: 7px 8px;
  border: 1px solid color-mix(in srgb, var(--tree-accent) 18%, #e4e7ed);
  border-left: 3px solid var(--tree-accent);
  border-radius: 6px;
  background: #ffffff;
}

.field-header {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.field-inline-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
  flex-wrap: wrap;
}

.field-title {
  font-weight: 700;
  color: var(--tree-accent);
  font-size: 12px;
  line-height: 1.25;
}

.field-aliases {
  color: #909399;
  font-size: 10px;
}

.field-meta {
  padding: 0 5px;
  border-radius: 999px;
  background: #f4f4f5;
  color: #606266;
  font-size: 10px;
  line-height: 16px;
}

.field-path {
  color: #606266;
  font-family: Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
  font-size: 10px;
  line-height: 1.25;
}

.compiled-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 6px;
}

.compiled-item {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 5px 7px;
  border-radius: 6px;
  background: #f5f7fa;
  color: #303133;
  font-size: 11px;
}

.compiled-main-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.compiled-main {
  min-width: 0;
  line-height: 1.25;
}

.compiled-status {
  flex-shrink: 0;
  color: #606266;
  font-size: 10px;
}

.compiled-item.is-effective {
  background: #f0f9eb;
}

.compiled-item.is-overridden {
  background: #f4f4f5;
  color: #909399;
}

.compiled-item.is-rejected {
  background: #fef0f0;
  color: #c45656;
}

.compiled-item.is-cleared {
  background: #ecf5ff;
  color: #409eff;
}

.compiled-reason {
  font-size: 10px;
  line-height: 1.2;
  opacity: 0.9;
}

.field-empty {
  margin-top: 6px;
  color: #909399;
  font-size: 10px;
}
</style>
