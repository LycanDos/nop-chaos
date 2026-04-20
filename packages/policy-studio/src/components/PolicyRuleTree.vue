<template>
  <details
    v-if="node.type === 'group'"
    class="rule-tree-group"
    :class="{ 'is-active': containsActivePath(node) }"
    :style="groupStyle"
    :open="isOpen"
    @toggle="handleToggle"
  >
    <summary class="rule-tree-group__summary">
      <span class="rule-tree-group__arrow">▸</span>
      <span class="rule-tree-group__label">{{ node.label }}</span>
      <span v-if="node.path" class="rule-tree-group__path">{{ node.path }}</span>
      <span class="rule-tree-group__count">{{ node.ruleCount }} 条校验</span>
    </summary>
    <div class="rule-tree-group__children">
      <PolicyRuleTree
        v-for="child in node.children"
        :key="child.key"
        :node="child"
        :depth="depth + 1"
        :active-path="activePath"
        :active-rule-id="activeRuleId"
      >
        <template #field="slotProps">
          <slot name="field" v-bind="slotProps" />
        </template>
      </PolicyRuleTree>
    </div>
  </details>

  <div
    v-else
    class="rule-tree-field"
    :class="{ 'is-active': activePath === node.path || containsActiveRule(node) }"
    :style="fieldStyle"
  >
    <div class="rule-tree-field__meta">
      <span class="rule-tree-field__label">{{ node.label }}</span>
      <span v-if="node.aliases?.length" class="rule-tree-field__aliases">Alias: {{ node.aliases.join(' / ') }}</span>
      <span v-if="node.path" class="rule-tree-field__path">
        <span v-if="pathPrefix(node.path)">{{ pathPrefix(node.path) }}</span><strong>{{ pathLeaf(node.path) }}</strong>
      </span>
      <span v-if="node.meta" class="rule-tree-field__tag">{{ node.meta }}</span>
    </div>
    <slot name="field" :node="node" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

defineOptions({
  name: 'PolicyRuleTree'
})

interface RuleTreeNode {
  key: string
  type: 'group' | 'field'
  label: string
  path?: string
  aliases?: string[]
  description?: string
  meta?: string
  ruleCount: number
  rules?: any[]
  children: RuleTreeNode[]
}

const props = withDefaults(defineProps<{
  node: RuleTreeNode
  depth?: number
  activePath?: string
  activeRuleId?: string
}>(), {
  depth: 0,
  activePath: '',
  activeRuleId: ''
})

const levelColors = ['#2563eb', '#0f766e', '#ca8a04', '#9333ea', '#dc2626', '#475569']
const currentColor = computed(() => levelColors[props.depth % levelColors.length])
const groupStyle = computed(() => ({ '--tree-accent': currentColor.value }))
const fieldStyle = computed(() => ({ '--tree-accent': currentColor.value }))
const isOpen = ref(true)

watch(() => [props.activePath, props.activeRuleId], () => {
  if (containsActivePath(props.node) || containsActiveRule(props.node))
    isOpen.value = true
}, { immediate: true })

function handleToggle(event: Event) {
  isOpen.value = (event.currentTarget as HTMLDetailsElement).open
}

function containsActivePath(node: RuleTreeNode): boolean {
  if (!props.activePath)
    return false
  if (node.path === props.activePath)
    return true
  return node.children.some(child => containsActivePath(child))
}

function containsActiveRule(node: RuleTreeNode): boolean {
  if (!props.activeRuleId)
    return false
  if (node.rules?.some(rule => rule.id === props.activeRuleId))
    return true
  return node.children.some(child => containsActiveRule(child))
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
.rule-tree-group + .rule-tree-group,
.rule-tree-group + .rule-tree-field,
.rule-tree-field + .rule-tree-group,
.rule-tree-field + .rule-tree-field {
  margin-top: 6px;
}

.rule-tree-group__summary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 9px;
  border: 1px solid color-mix(in srgb, var(--tree-accent) 28%, #dcdfe6);
  border-radius: 8px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--tree-accent) 8%, #ffffff) 0%, #f7f9fc 100%);
  cursor: pointer;
  list-style: none;
  user-select: none;
}

.rule-tree-group__summary::-webkit-details-marker {
  display: none;
}

.rule-tree-group[open] > .rule-tree-group__summary .rule-tree-group__arrow {
  transform: rotate(90deg);
}

.rule-tree-group.is-active > .rule-tree-group__summary {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--tree-accent) 18%, #ffffff);
}

.rule-tree-group__arrow {
  color: var(--tree-accent);
  font-size: 11px;
  transition: transform 0.15s ease;
}

.rule-tree-group__label {
  color: var(--tree-accent);
  font-size: 12px;
  font-weight: 700;
}

.rule-tree-group__path {
  color: #606266;
  font-size: 10px;
  font-family: Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
}

.rule-tree-group__count {
  margin-left: auto;
  color: #909399;
  font-size: 10px;
}

.rule-tree-group__children {
  margin-top: 6px;
  margin-left: 8px;
  padding-left: 12px;
  border-left: 1px solid color-mix(in srgb, var(--tree-accent) 35%, #e4e7ed);
}

.rule-tree-field {
  padding: 8px;
  border: 1px solid color-mix(in srgb, var(--tree-accent) 18%, #e4e7ed);
  border-left: 3px solid var(--tree-accent);
  border-radius: 8px;
  background: #fff;
}

.rule-tree-field.is-active {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--tree-accent) 18%, #ffffff);
}

.rule-tree-field__meta {
  display: flex;
  align-items: baseline;
  gap: 6px;
  flex-wrap: wrap;
}

.rule-tree-field__label {
  color: var(--tree-accent);
  font-size: 12px;
  font-weight: 700;
}

.rule-tree-field__aliases,
.rule-tree-field__description {
  color: #909399;
  font-size: 10px;
}

.rule-tree-field__path {
  color: #606266;
  font-size: 10px;
  font-family: Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
}

.rule-tree-field__tag {
  padding: 0 5px;
  border-radius: 999px;
  background: #f4f4f5;
  color: #606266;
  font-size: 10px;
  line-height: 16px;
}

.rule-tree-field__description {
  margin-top: 4px;
}
</style>
