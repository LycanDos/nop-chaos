<template>
  <div class="policy-studio">
    <div class="studio-header">
      <div>
        <h2>Clar</h2>
        <div class="studio-meta">
          <el-tag type="info">{{ localDocument.name }}</el-tag>
          <el-tag v-if="localSchema.id" type="warning">{{ localSchema.name }}</el-tag>
          <el-tag v-if="localDocument.targetSchema" type="success">{{ localDocument.targetSchema }}</el-tag>
        </div>
      </div>

      <div class="studio-actions">
        <el-button @click="bundleDialogVisible = true">加载 Schema</el-button>
      </div>
    </div>

    <div ref="studioBodyRef" class="studio-body">
      <section class="rules-pane" :style="editorPaneStyle">
        <div class="rules-pane__toolbar">
          <div class="rules-pane__toolbar-title">
            <span>校验集</span>
            <el-tag type="info">按顺序生效</el-tag>
          </div>
          <div class="rules-pane__toolbar-actions">
            <div class="rules-pane__group-switch">
              <span>是否分组</span>
              <el-switch v-model="groupRulesInTree" />
            </div>
            <el-radio-group v-model="layerTabPosition" size="small">
              <el-radio-button value="top">横向</el-radio-button>
              <el-radio-button value="left">纵向</el-radio-button>
            </el-radio-group>
          </div>
        </div>

        <el-tabs
          v-model="activeLayerId"
          :tab-position="layerTabPosition"
          addable
          class="rules-pane__tabs"
          @tab-add="addLayer"
        >
          <template #add-icon>
            <el-icon><Plus /></el-icon>
          </template>
          <el-tab-pane
            v-for="layer in orderedLayers"
            :key="layer.id"
            :name="layer.id"
          >
            <template #label>
              <div class="layer-tab-label">
                <template v-if="isEditingLayer(layer.id, 'name', 'tab')">
                  <div class="inline-edit inline-edit--tab">
                    <el-input
                      v-model="editingLayerValue"
                      size="small"
                      @click.stop
                      @keyup.enter.stop="saveLayerEdit(layer)"
                      @keyup.esc.stop="cancelLayerEdit"
                    />
                    <el-button class="inline-edit__action" link size="small" @click.stop="saveLayerEdit(layer)">
                      <el-icon><Check /></el-icon>
                    </el-button>
                    <el-button class="inline-edit__action" link size="small" @click.stop="cancelLayerEdit">
                      <el-icon><Close /></el-icon>
                    </el-button>
                  </div>
                </template>
                <template v-else>
                  <span class="layer-tab-label__text">{{ layer.name }} ({{ layer.orderNo }})</span>
                  <el-button
                    class="layer-tab-label__edit"
                    link
                    size="small"
                    @click.stop="startLayerEdit(layer, 'name', 'tab')"
                  >
                    <el-icon><EditPen /></el-icon>
                  </el-button>
                  <el-popconfirm
                    :title="`确认删除校验集「${layer.name}」？`"
                    confirm-button-text="删除"
                    cancel-button-text="取消"
                    @confirm="removeLayer(layer.id)"
                  >
                    <template #reference>
                      <el-button
                        class="layer-tab-label__delete"
                        link
                        size="small"
                        @click.stop
                      >
                        <el-icon><Delete /></el-icon>
                      </el-button>
                    </template>
                  </el-popconfirm>
                </template>
              </div>
            </template>
            <div class="layer-summary">
              <div class="layer-summary__item">
                <template v-if="isEditingLayer(layer.id, 'layerType', 'summary')">
                  <div class="inline-edit">
                    <el-input
                      v-model="editingLayerValue"
                      size="small"
                      @click.stop
                      @keyup.enter.stop="saveLayerEdit(layer)"
                      @keyup.esc.stop="cancelLayerEdit"
                    />
                    <el-button class="inline-edit__action" link size="small" @click.stop="saveLayerEdit(layer)">
                      <el-icon><Check /></el-icon>
                    </el-button>
                    <el-button class="inline-edit__action" link size="small" @click.stop="cancelLayerEdit">
                      <el-icon><Close /></el-icon>
                    </el-button>
                  </div>
                </template>
                <template v-else>
                  <el-tag :type="layerTagType(layer.layerType)">{{ layer.layerType }}</el-tag>
                  <el-button link size="small" @click.stop="startLayerEdit(layer, 'layerType', 'summary')">
                    <el-icon><EditPen /></el-icon>
                  </el-button>
                </template>
              </div>
              <div class="layer-summary__item">
                <template v-if="isEditingLayer(layer.id, 'name', 'summary')">
                  <div class="inline-edit">
                    <el-input
                      v-model="editingLayerValue"
                      size="small"
                      @click.stop
                      @keyup.enter.stop="saveLayerEdit(layer)"
                      @keyup.esc.stop="cancelLayerEdit"
                    />
                    <el-button class="inline-edit__action" link size="small" @click.stop="saveLayerEdit(layer)">
                      <el-icon><Check /></el-icon>
                    </el-button>
                    <el-button class="inline-edit__action" link size="small" @click.stop="cancelLayerEdit">
                      <el-icon><Close /></el-icon>
                    </el-button>
                  </div>
                </template>
                <template v-else>
                  <span>名称 {{ layer.name }}</span>
                  <el-button link size="small" @click.stop="startLayerEdit(layer, 'name', 'summary')">
                    <el-icon><EditPen /></el-icon>
                  </el-button>
                </template>
              </div>
              <div class="layer-summary__item">
                <template v-if="isEditingLayer(layer.id, 'orderNo', 'summary')">
                  <div class="inline-edit">
                    <el-input-number
                      v-model="editingLayerOrderNo"
                      size="small"
                      :min="0"
                      :step="10"
                      @click.stop
                    />
                    <el-button class="inline-edit__action" link size="small" @click.stop="saveLayerEdit(layer)">
                      <el-icon><Check /></el-icon>
                    </el-button>
                    <el-button class="inline-edit__action" link size="small" @click.stop="cancelLayerEdit">
                      <el-icon><Close /></el-icon>
                    </el-button>
                  </div>
                </template>
                <template v-else>
                  <span>顺序 {{ layer.orderNo }}</span>
                  <el-button link size="small" @click.stop="startLayerEdit(layer, 'orderNo', 'summary')">
                    <el-icon><EditPen /></el-icon>
                  </el-button>
                </template>
              </div>
              <span>校验数 {{ layer.rules.length }}</span>
            </div>

            <div v-if="groupRulesInTree" class="rule-tree-list">
              <PolicyRuleTree
                v-for="node in layerRuleTree(layer)"
                :key="node.key"
                :node="node"
                :depth="0"
                :active-path="activeRulePath"
                :active-rule-id="activeRuleId"
              >
                <template #field="{ node: fieldNode }">
                  <div v-if="fieldNode.path" class="field-node-actions">
                    <el-button size="small" type="primary" link @click="addRule(layer.id, fieldNode.path)">
                      增加添加规则
                    </el-button>
                  </div>
                  <PolicyRuleCard
                    v-for="rule in fieldNode.rules"
                    :key="rule.id"
                    :rule="rule"
                    :layer-id="layer.id"
                    :hint-engine="hintEngine"
                    :field-for-path="fieldEditorSchema"
                    :operator-display="operatorDisplay"
                    :active="isRuleActive(rule)"
                    :flash="flashingRuleId === rule.id"
                    :is-editing-rule-id="isEditingRule(rule.id)"
                    :editing-rule-value="editingRuleValue"
                    :validation-message="ruleValidationMessage(layer.id, rule)"
                    @select="setActiveRule(rule)"
                    @focus-path="setActiveRule(rule)"
                    @path-change="handleRulePathChange(rule)"
                    @remove="removeRule(layer.id, rule)"
                    @start-rule-edit="startRuleEdit(rule)"
                    @save-rule-edit="saveRuleEdit(rule)"
                    @cancel-rule-edit="cancelRuleEdit"
                    @update:editing-rule-value="editingRuleValue = $event"
                  />
                </template>
              </PolicyRuleTree>
            </div>

            <div v-else class="rule-flat-list">
              <PolicyRuleCard
                v-for="rule in sortedLayerRules(layer)"
                :key="rule.id"
                :rule="rule"
                :layer-id="layer.id"
                :hint-engine="hintEngine"
                :field-for-path="fieldEditorSchema"
                :operator-display="operatorDisplay"
                :active="isRuleActive(rule)"
                :flash="flashingRuleId === rule.id"
                :is-editing-rule-id="isEditingRule(rule.id)"
                :editing-rule-value="editingRuleValue"
                :validation-message="ruleValidationMessage(layer.id, rule)"
                @select="setActiveRule(rule)"
                @focus-path="setActiveRule(rule)"
                @path-change="handleRulePathChange(rule)"
                @remove="removeRule(layer.id, rule)"
                @start-rule-edit="startRuleEdit(rule)"
                @save-rule-edit="saveRuleEdit(rule)"
                @cancel-rule-edit="cancelRuleEdit"
                @update:editing-rule-value="editingRuleValue = $event"
              />
            </div>

            <div class="layer-actions">
              <el-button type="primary" plain size="small" @click="addRule(layer.id)">添加规则</el-button>
            </div>

            <el-empty v-if="layer.rules.length === 0" description="当前校验集暂无校验" :image-size="88" />
          </el-tab-pane>
        </el-tabs>
      </section>

      <div class="studio-splitter" :class="{ 'is-dragging': isDragging }" @mousedown="startDragging" />

      <section class="preview-pane" :style="previewPaneStyle">
        <el-tabs v-model="previewTab">
          <el-tab-pane label="Schema-JSON" name="schema-json">
            <SchemaJsonEditor v-model="localSchemaModel" mode="tree" />
          </el-tab-pane>

          <el-tab-pane label="生成表单" name="generated-form">
            <SchemaGeneratedForm
              :schema="localSchema"
              :document="localDocument"
              :model-value="localSampleData"
              @update:model-value="localSampleData = $event"
            />
          </el-tab-pane>

          <el-tab-pane label="AMIS表单" name="amis-form">
            <SchemaAmisGeneratedForm
              :schema="localSchema"
              :document="localDocument"
              :model-value="localSampleData"
            />
          </el-tab-pane>

          <el-tab-pane label="校验生效预览" name="effective">
            <div class="preview-toolbar">
              <div class="preview-title">字段校验树</div>
              <div class="preview-switches">
                <div class="switch-item">
                  <span>展示所有字段</span>
                  <el-switch v-model="showAllFields" />
                </div>
                <div class="switch-item">
                  <span>展示无效校验</span>
                  <el-switch v-model="showInvalidRules" />
                </div>
              </div>
            </div>

            <div v-if="previewTree.length" class="preview-tree">
              <PolicyPreviewTree
                v-for="node in previewTree"
                :key="node.key"
                :node="node"
                :depth="0"
              />
            </div>
            <el-empty v-else :description="emptyPreviewDescription" :image-size="88" />
          </el-tab-pane>

          <el-tab-pane label="校验 XML" name="xml">
            <MonacoCodeViewer
              :model-value="xmlPreviewText"
              language="xml"
              read-only
              :highlight-rule-id="activeRuleId"
              :highlight-path="activeRulePath"
              @rule-focus="handleXmlRuleFocus"
            />
          </el-tab-pane>

          <el-tab-pane label="校验 JSON" name="json">
            <SchemaJsonEditor :model-value="localDocument as unknown as Record<string, any>" mode="tree" read-only />
          </el-tab-pane>
        </el-tabs>
      </section>
    </div>

    <LoadBundleDialog
      v-model="bundleDialogVisible"
      :samples="sampleBundleOptions"
      @load="applyBundle"
    />
  </div>
</template>

<script setup lang="ts">
import { Check, Close, Delete, EditPen, Plus } from '@element-plus/icons-vue'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, toRaw, watch } from 'vue'
import { ElMessage } from 'element-plus/es/components/message/index.mjs'
import LoadBundleDialog from './LoadBundleDialog.vue'
import PolicyPreviewTree from './PolicyPreviewTree.vue'
import PolicyRuleCard from './PolicyRuleCard.vue'
import PolicyRuleTree from './PolicyRuleTree.vue'
import SchemaAmisGeneratedForm from './SchemaAmisGeneratedForm.vue'
import SchemaGeneratedForm from './SchemaGeneratedForm.vue'
import SchemaJsonEditor from './SchemaJsonEditor.vue'
import MonacoCodeViewer from './MonacoCodeViewer.vue'
import { HintEngine } from '../engines/hint-engine'
import { PolicyCompiler } from '../engines/policy-compiler'
import { PolicyXmlEngine } from '../engines/policy-xml-engine'
import { createFieldMappingFromSchema, getSchemaFieldByPath, toSchemaFieldType } from '../utils/schema-utils'
import { safeStructuredClone } from '../utils/clone-utils'
import { getOperatorMeta } from '../utils/operator-utils'
import type {
  EffectivePathView,
  FieldInfo,
  FieldMapping,
  PolicyBundle,
  PolicyDocument,
  PolicyLayer,
  PolicyLayerType,
  PolicyOperator,
  PolicyPreviewTreeNode,
  PolicyRule,
  PolicySchema,
  PolicySchemaField
} from '../types'

interface SampleBundleOption {
  id: string
  name: string
  bundle: PolicyBundle
}

interface LayerRuleTreeNode {
  key: string
  type: 'group' | 'field'
  label: string
  path?: string
  aliases?: string[]
  description?: string
  meta?: string
  ruleCount: number
  rules?: PolicyRule[]
  children: LayerRuleTreeNode[]
}

interface Props {
  modelValue: PolicyDocument
  schema?: PolicySchema
  sampleData?: Record<string, any>
  fieldMapping?: FieldMapping
  sampleBundles?: SampleBundleOption[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: PolicyDocument]
  'update:sampleData': [value: Record<string, any>]
  change: [value: PolicyDocument]
  exportXml: [value: string]
  exportJson: [value: string]
}>()

const MIN_PANE_WIDTH = 380
const compiler = new PolicyCompiler()
const xmlEngine = new PolicyXmlEngine()

function cloneDocument(value: PolicyDocument): PolicyDocument {
  return safeStructuredClone(toRaw(value))
}

function cloneSchema(value?: PolicySchema): PolicySchema {
  if (value)
    return safeStructuredClone(toRaw(value))
  return {
    id: '',
    name: '未加载 Schema',
    fields: []
  }
}

function cloneSampleData(value?: Record<string, any>) {
  return value ? safeStructuredClone(toRaw(value)) : {}
}

const localDocument = ref<PolicyDocument>(cloneDocument(props.modelValue))
const localSchema = ref<PolicySchema>(cloneSchema(props.schema))
const localSampleData = ref<Record<string, any>>(cloneSampleData(props.sampleData))
const localSchemaModel = computed({
  get: () => localSchema.value as unknown as Record<string, any>,
  set: (value: Record<string, any>) => {
    localSchema.value = value as PolicySchema
  }
})

const activeLayerId = ref(localDocument.value.layers[0]?.id || '')
const previewTab = ref<'schema-json' | 'generated-form' | 'amis-form' | 'effective' | 'xml' | 'json'>('schema-json')
const layerTabPosition = ref<'top' | 'left'>('top')
const groupRulesInTree = ref(true)
const showAllFields = ref(true)
const showInvalidRules = ref(true)
const splitRatio = ref(56)
const isDragging = ref(false)
const studioBodyRef = ref<HTMLElement>()
const bundleDialogVisible = ref(false)
const hintEngine = shallowRef<HintEngine>(new HintEngine(createFieldMappingFromSchema(localSchema.value)))
let syncingDocumentFromProps = false
let syncingSampleDataFromProps = false

const sampleBundleOptions = computed(() => props.sampleBundles || [])
const orderedLayers = computed(() => [...localDocument.value.layers].sort((a, b) => a.orderNo - b.orderNo))
const resolvedFieldMapping = computed(() => props.fieldMapping || createFieldMappingFromSchema(localSchema.value))
const compileResult = computed(() => compiler.compile(localDocument.value))
const compiledRuleMap = computed(() => {
  const map = new Map<string, { status: string; reason?: string }>()
  for (const pathView of compileResult.value.paths) {
    for (const compiledRule of pathView.compiledRules)
      map.set(`${compiledRule.layerId}::${compiledRule.ruleId}`, { status: compiledRule.status, reason: compiledRule.reason })
  }
  return map
})
const xmlPreviewText = computed(() => xmlEngine.export(localDocument.value))
const pathViewMap = computed(() => new Map(compileResult.value.paths.map(pathView => [pathView.path, pathView])))
const editorPaneStyle = computed(() => ({ flexBasis: `${splitRatio.value}%` }))
const previewPaneStyle = computed(() => ({ flexBasis: `${100 - splitRatio.value}%` }))
const editingLayerField = ref<{
  layerId: string
  field: 'name' | 'layerType' | 'orderNo'
  source: 'tab' | 'summary'
} | null>(null)
const editingLayerValue = ref('')
const editingLayerOrderNo = ref(0)
const editingRuleKey = ref<string | null>(null)
const editingRuleValue = ref('')
const activeRulePath = ref('')
const activeRuleId = ref('')
const flashingRuleId = ref('')
let flashingRuleTimer: ReturnType<typeof setTimeout> | null = null

const previewPaths = computed(() => {
  const allKnownPaths = new Set<string>()
  for (const path of resolvedFieldMapping.value.globalFields.keys())
    allKnownPaths.add(path)
  for (const pathView of compileResult.value.paths) {
    if (pathView.path)
      allKnownPaths.add(pathView.path)
  }

  if (showAllFields.value)
    return [...allKnownPaths].sort((a, b) => a.localeCompare(b, 'zh-CN'))

  return compileResult.value.paths
    .filter((pathView) => {
      if (!pathView.path)
        return false
      if (showInvalidRules.value)
        return pathView.compiledRules.length > 0
      return pathView.compiledRules.some(rule => rule.status === 'effective')
    })
    .map(pathView => pathView.path)
    .sort((a, b) => a.localeCompare(b, 'zh-CN'))
})

const previewTree = computed(() => buildPreviewTree(previewPaths.value))
const emptyPreviewDescription = computed(() => {
  if (showAllFields.value)
    return '当前字段树暂无可展示字段'
  if (showInvalidRules.value)
    return '当前没有命中校验的字段'
  return '当前没有生效校验字段'
})

watch(() => props.modelValue, async (value) => {
  syncingDocumentFromProps = true
  localDocument.value = cloneDocument(value)
  if (!orderedLayers.value.find(layer => layer.id === activeLayerId.value))
    activeLayerId.value = orderedLayers.value[0]?.id || ''
  await nextTick()
  syncingDocumentFromProps = false
}, { deep: true })

watch(() => props.schema, (value) => {
  if (value)
    localSchema.value = cloneSchema(value)
}, { deep: true })

watch(() => props.sampleData, async (value) => {
  syncingSampleDataFromProps = true
  localSampleData.value = cloneSampleData(value)
  await nextTick()
  syncingSampleDataFromProps = false
}, { deep: true })

watch(resolvedFieldMapping, (value) => {
  hintEngine.value = new HintEngine(value)
}, { deep: true, immediate: true })

watch(localDocument, (value) => {
  if (syncingDocumentFromProps)
    return
  emit('update:modelValue', cloneDocument(value))
  emit('change', cloneDocument(value))
}, { deep: true })

watch(localSampleData, (value) => {
  if (syncingSampleDataFromProps)
    return
  emit('update:sampleData', cloneSampleData(value))
}, { deep: true })

watch(localSchema, (value) => {
  if (!localDocument.value.targetSchema)
    localDocument.value.targetSchema = value.id
}, { deep: true })

watch(activeLayerId, () => {
  scrollActiveLayerTabIntoView()
})

onMounted(() => {
  window.addEventListener('mousemove', handleDragging)
  window.addEventListener('mouseup', stopDragging)
})

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', handleDragging)
  window.removeEventListener('mouseup', stopDragging)
  if (flashingRuleTimer)
    clearTimeout(flashingRuleTimer)
  stopDragging()
})

function activeLayer(): PolicyLayer | undefined {
  return localDocument.value.layers.find(layer => layer.id === activeLayerId.value)
}

function addLayer() {
  const layer: PolicyLayer = {
    id: `layer-${Date.now()}`,
    name: `校验集 ${localDocument.value.layers.length + 1}`,
    layerType: 'BASE',
    orderNo: nextLayerOrderNo(),
    editable: true,
    rules: []
  }

  localDocument.value.layers.push(layer)
  activeLayerId.value = layer.id
  nextTick(() => {
    startLayerEdit(layer, 'name', 'tab')
  })
}

function addRule(layerId?: string, path = '') {
  const layer = layerId
    ? localDocument.value.layers.find(item => item.id === layerId)
    : activeLayer()
  if (!layer)
    return

  const rule: PolicyRule = {
    id: `rule-${Date.now()}`,
    path,
    operator: 'required',
    enabled: true,
    orderNo: nextOrderNo(layer),
    severity: 5
  }
  if (rule.operator === 'locked')
    rule.lockMode = 'HARD_LOCK'
  if (rule.operator === 'softLock')
    rule.lockMode = 'SOFT_LOCK'
  rule.applyWhen = createDefaultCondition()
  layer.rules.push(rule)
  activeLayerId.value = layer.id
  activateAndFlashRule(rule)
}

function createDefaultCondition() {
  return {
    id: `condition-${Date.now()}`,
    type: 'simple' as const,
    operator: 'eq' as const,
    field: '',
    value: ''
  }
}

function nextOrderNo(layer: PolicyLayer) {
  return layer.rules.reduce((max, item) => Math.max(max, item.orderNo), 0) + 10
}

function nextLayerOrderNo() {
  return localDocument.value.layers.reduce((max, item) => Math.max(max, item.orderNo), 0) + 10
}

function removeRule(layerId: string, rule: PolicyRule) {
  const layer = localDocument.value.layers.find(item => item.id === layerId)
  if (!layer)
    return
  const index = layer.rules.findIndex(item => item.id === rule.id)
  if (index === -1)
    return
  layer.rules.splice(index, 1)
  if (activeRuleId.value === rule.id) {
    activeRuleId.value = ''
    activeRulePath.value = ''
  }
}

function activateAndFlashRule(rule: PolicyRule) {
  setActiveRule(rule)
  flashingRuleId.value = rule.id
  if (flashingRuleTimer)
    clearTimeout(flashingRuleTimer)
  flashingRuleTimer = setTimeout(() => {
    if (flashingRuleId.value === rule.id)
      flashingRuleId.value = ''
  }, 2000)

  nextTick(() => {
    const target = document.querySelector(`[data-rule-id="${rule.id}"]`) as HTMLElement | null
    target?.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
      behavior: 'smooth'
    })
  })
}

function sortedLayerRules(layer: PolicyLayer) {
  return [...layer.rules].sort((left, right) => left.orderNo - right.orderNo)
}

function layerRuleTree(layer: PolicyLayer): LayerRuleTreeNode[] {
  const rootNodes: LayerRuleTreeNode[] = []
  const fieldNodes = new Map<string, LayerRuleTreeNode>()

  for (const rule of sortedLayerRules(layer)) {
    const path = rule.path.trim()
    if (!path) {
      let node = fieldNodes.get('__unassigned__')
      if (!node) {
        node = {
          key: 'field:__unassigned__',
          type: 'field',
          label: '未选择字段',
          path: '',
          meta: undefined,
          description: '尚未绑定到 Schema 字段',
          ruleCount: 0,
          rules: [],
          children: []
        }
        fieldNodes.set('__unassigned__', node)
        rootNodes.push(node)
      }
      node.rules!.push(rule)
      node.ruleCount = node.rules!.length
      continue
    }

    const segments = path.split('.').filter(Boolean)
    let currentNodes = rootNodes
    let currentPath = ''

    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index]
      currentPath = currentPath ? `${currentPath}.${segment}` : segment
      const isLeaf = index === segments.length - 1

      if (isLeaf) {
        let fieldNode = fieldNodes.get(currentPath)
        if (!fieldNode) {
          const field = getFieldInfo(currentPath)
          fieldNode = {
            key: `field:${currentPath}`,
            type: 'field',
            label: field?.displayName || fieldEditorSchema(currentPath)?.label || segment,
            path: currentPath,
            aliases: field?.aliases || fieldEditorSchema(currentPath)?.aliases,
            meta: fieldMeta(field) || fieldEditorSchema(currentPath)?.type,
            description: fieldDescription(field) || fieldEditorSchema(currentPath)?.description,
            ruleCount: 0,
            rules: [],
            children: []
          }
          fieldNodes.set(currentPath, fieldNode)
          currentNodes.push(fieldNode)
        }
        fieldNode.rules!.push(rule)
        fieldNode.ruleCount = fieldNode.rules!.length
        break
      }

      let groupNode = currentNodes.find(node => node.key === `group:${currentPath}`)
      if (!groupNode) {
        groupNode = {
          key: `group:${currentPath}`,
          type: 'group',
          label: groupLabel(currentPath, segment, index),
          path: currentPath,
          ruleCount: 0,
          children: []
        }
        currentNodes.push(groupNode)
      }

      groupNode.ruleCount += 1
      currentNodes = groupNode.children
    }
  }

  return sortLayerRuleTree(rootNodes)
}

function sortLayerRuleTree(nodes: LayerRuleTreeNode[]): LayerRuleTreeNode[] {
  nodes.sort((left, right) => {
    if (left.type !== right.type)
      return left.type === 'group' ? -1 : 1
    return left.label.localeCompare(right.label, 'zh-CN')
  })

  return nodes.map((node) => {
    if (node.type === 'group')
      node.children = sortLayerRuleTree(node.children)
    return node
  })
}

function operatorDisplay(operator?: PolicyOperator) {
  if (!operator)
    return '-'
  const meta = getOperatorMeta(operator)
  if (!meta)
    return operator
  if (/^[<>=!]+$/.test(meta.title))
    return meta.title
  return meta.meaning || meta.title
}

function removeLayer(layerId: string) {
  const index = localDocument.value.layers.findIndex(item => item.id === layerId)
  if (index === -1)
    return

  const [removedLayer] = localDocument.value.layers.splice(index, 1)

  if (editingLayerField.value?.layerId === layerId)
    cancelLayerEdit()
  if (removedLayer?.rules.some(rule => rule.id === editingRuleKey.value))
    cancelRuleEdit()

  if (activeLayerId.value === layerId)
    activeLayerId.value = orderedLayers.value[0]?.id || ''

  ElMessage.success('校验集已删除')
}

function startLayerEdit(layer: PolicyLayer, field: 'name' | 'layerType' | 'orderNo', source: 'tab' | 'summary') {
  cancelRuleEdit()
  if (source === 'tab')
    activeLayerId.value = layer.id
  editingLayerField.value = {
    layerId: layer.id,
    field,
    source
  }
  if (field === 'orderNo') {
    editingLayerOrderNo.value = layer.orderNo
    editingLayerValue.value = ''
    return
  }
  editingLayerValue.value = field === 'layerType' ? layer.layerType : layer.name
  if (source === 'tab')
    scrollActiveLayerTabIntoView()
}

function isEditingLayer(layerId: string, field: 'name' | 'layerType' | 'orderNo', source: 'tab' | 'summary') {
  return editingLayerField.value?.layerId === layerId
    && editingLayerField.value?.field === field
    && editingLayerField.value?.source === source
}

function cancelLayerEdit() {
  editingLayerField.value = null
  editingLayerValue.value = ''
  editingLayerOrderNo.value = 0
}

function saveLayerEdit(layer: PolicyLayer) {
  const editing = editingLayerField.value
  if (!editing || editing.layerId !== layer.id)
    return

  if (editing.field === 'orderNo') {
    const nextOrderNo = Number(editingLayerOrderNo.value)
    if (!Number.isFinite(nextOrderNo) || nextOrderNo < 0) {
      ElMessage.error('顺序必须是大于等于 0 的数字')
      return
    }
    layer.orderNo = nextOrderNo
    cancelLayerEdit()
    return
  }

  const nextValue = editingLayerValue.value.trim()
  if (!nextValue) {
    ElMessage.error(editing.field === 'layerType' ? '类型不能为空' : '名称不能为空')
    return
  }

  if (editing.field === 'layerType')
    layer.layerType = nextValue as PolicyLayerType
  else
    layer.name = nextValue
  cancelLayerEdit()
}

function startRuleEdit(rule: PolicyRule) {
  cancelLayerEdit()
  editingRuleKey.value = rule.id
  editingRuleValue.value = rule.id
  setActiveRule(rule)
}

function isEditingRule(ruleId: string) {
  return editingRuleKey.value === ruleId
}

function cancelRuleEdit() {
  editingRuleKey.value = null
  editingRuleValue.value = ''
}

function saveRuleEdit(rule: PolicyRule) {
  if (editingRuleKey.value !== rule.id)
    return

  const nextId = editingRuleValue.value.trim()
  if (!nextId) {
    ElMessage.error('Rule ID 不能为空')
    return
  }
  if (hasRuleIdConflict(nextId, rule.id)) {
    ElMessage.error('Rule ID 不能重复')
    return
  }

  rule.id = nextId
  activeRuleId.value = nextId
  cancelRuleEdit()
}

function hasRuleIdConflict(nextId: string, currentId: string) {
  return localDocument.value.layers.some(layer =>
    layer.rules.some(rule => rule.id === nextId && rule.id !== currentId)
  )
}

function applyBundle(bundle: PolicyBundle) {
  localSchema.value = safeStructuredClone(bundle.schema)
  localDocument.value = safeStructuredClone(bundle.document)
  localSampleData.value = safeStructuredClone(bundle.sampleData || bundle.schema.sampleData || {})
  activeLayerId.value = bundle.document.layers[0]?.id || ''
  activeRuleId.value = ''
  activeRulePath.value = ''
  ElMessage.success('Schema 与校验集已加载')
}

function fieldEditorSchema(path: string): PolicySchemaField | undefined {
  if (!path)
    return undefined

  const schemaField = getSchemaFieldByPath(localSchema.value, path)
  if (schemaField)
    return schemaField

  const fieldInfo = resolvedFieldMapping.value.globalFields.get(path)
  if (!fieldInfo)
    return undefined

  const format = fieldInfo.format || (['date', 'time', 'datetime'].includes(fieldInfo.type.toLowerCase()) ? fieldInfo.type.toLowerCase() : undefined)
  return {
    name: fieldInfo.name,
    label: fieldInfo.displayName,
    path: fieldInfo.path,
    type: toSchemaFieldType(fieldInfo.type),
    format: format as PolicySchemaField['format'],
    options: fieldInfo.options
  }
}

function handleRulePathChange(rule: PolicyRule) {
  setActiveRule(rule)
  nextTick(() => {
    const target = document.querySelector(`[data-rule-id="${rule.id}"]`) as HTMLElement | null
    target?.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
      behavior: 'smooth'
    })
  })
}

function setActiveRule(rule: PolicyRule) {
  activeRuleId.value = rule.id
  activeRulePath.value = rule.path
}

function isRuleActive(rule: PolicyRule) {
  return activeRuleId.value === rule.id || (!!rule.path && activeRulePath.value === rule.path)
}

function ruleValidationMessage(layerId: string, rule: PolicyRule) {
  const item = compiledRuleMap.value.get(`${layerId}::${rule.id}`)
  if (!item)
    return ''
  return item.status === 'rejected' ? item.reason || '当前校验配置无效' : ''
}

function handleXmlRuleFocus(payload: { ruleId?: string; path?: string }) {
  if (!payload.ruleId && !payload.path)
    return

  if (payload.ruleId) {
    for (const layer of localDocument.value.layers) {
      const rule = layer.rules.find(item => item.id === payload.ruleId)
      if (rule) {
        activeLayerId.value = layer.id
        setActiveRule(rule)
        return
      }
    }
  }

  if (payload.path) {
    for (const layer of orderedLayers.value) {
      const rule = sortedLayerRules(layer).find(item => item.path === payload.path)
      if (rule) {
        activeLayerId.value = layer.id
        setActiveRule(rule)
        return
      }
    }
    activeRulePath.value = payload.path
  }
}

function layerTagType(layerType: PolicyLayerType): 'info' | 'success' | 'warning' | 'danger' {
  if (layerType === 'BASE')
    return 'info'
  if (layerType === 'PARTNER')
    return 'success'
  if (layerType === 'NODE')
    return 'warning'
  return 'danger'
}

function startDragging(event: MouseEvent) {
  if (window.innerWidth <= 960)
    return
  isDragging.value = true
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  updateSplitRatio(event.clientX)
  event.preventDefault()
}

function handleDragging(event: MouseEvent) {
  if (!isDragging.value)
    return
  updateSplitRatio(event.clientX)
}

function stopDragging() {
  if (!isDragging.value)
    return
  isDragging.value = false
  document.body.style.removeProperty('cursor')
  document.body.style.removeProperty('user-select')
}

function updateSplitRatio(clientX: number) {
  const body = studioBodyRef.value
  if (!body)
    return
  const rect = body.getBoundingClientRect()
  if (!rect.width)
    return

  const minRatio = Math.min(45, (MIN_PANE_WIDTH / rect.width) * 100)
  const maxRatio = 100 - minRatio
  const nextRatio = ((clientX - rect.left) / rect.width) * 100
  splitRatio.value = Math.min(maxRatio, Math.max(minRatio, nextRatio))
}

function buildPreviewTree(paths: string[]): PolicyPreviewTreeNode[] {
  const rootNodes: PolicyPreviewTreeNode[] = []

  for (const path of paths) {
    const normalizedPath = path.trim()
    if (!normalizedPath)
      continue
    const segments = normalizedPath.split('.').filter(Boolean)
    if (!segments.length)
      continue

    let currentNodes = rootNodes
    let currentPath = ''

    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index]
      currentPath = currentPath ? `${currentPath}.${segment}` : segment
      const isLeaf = index === segments.length - 1

      if (isLeaf) {
        currentNodes.push(buildFieldNode(normalizedPath))
        continue
      }

      let groupNode = currentNodes.find(node => node.key === `group:${currentPath}`)
      if (!groupNode) {
        groupNode = {
          key: `group:${currentPath}`,
          type: 'group',
          label: groupLabel(currentPath, segment, index),
          path: currentPath,
          description: undefined,
          meta: undefined,
          fieldCount: 0,
          finalFamilies: [],
          effectiveSummaries: [],
          compiledRules: [],
          children: []
        }
        currentNodes.push(groupNode)
      }

      currentNodes = groupNode.children
    }
  }

  return sortAndCountNodes(rootNodes)
}

function buildFieldNode(path: string): PolicyPreviewTreeNode {
  const field = getFieldInfo(path)
  const pathView = pathViewMap.value.get(path)
  return {
    key: `field:${path}`,
    type: 'field',
    label: field?.displayName || path.split('.').pop() || path,
    path,
    aliases: field?.aliases || [],
    description: fieldDescription(field),
    meta: fieldMeta(field),
    fieldCount: 1,
    finalFamilies: pathView?.finalFamilies || [],
    effectiveSummaries: pathView?.effectiveSummaries || [],
    compiledRules: visibleCompiledRules(pathView),
    children: []
  }
}

function sortAndCountNodes(nodes: PolicyPreviewTreeNode[]): PolicyPreviewTreeNode[] {
  nodes.sort((left, right) => {
    if (left.type !== right.type)
      return left.type === 'group' ? -1 : 1
    return left.label.localeCompare(right.label, 'zh-CN')
  })

  return nodes.map((node) => {
    if (node.type === 'field')
      return node

    node.children = sortAndCountNodes(node.children)
    node.fieldCount = node.children.reduce((count, child) => count + child.fieldCount, 0)
    return node
  })
}

function visibleCompiledRules(pathView?: EffectivePathView) {
  if (!pathView)
    return []
  if (showInvalidRules.value)
    return pathView.compiledRules
  return pathView.compiledRules.filter(rule => rule.status === 'effective')
}

function getFieldInfo(path: string): FieldInfo | undefined {
  return resolvedFieldMapping.value.globalFields.get(path)
}

function fieldDescription(field?: FieldInfo) {
  if (!field)
    return undefined
  if (field.name !== field.displayName)
    return field.name
  return undefined
}

function fieldMeta(field?: FieldInfo) {
  if (!field)
    return undefined
  return field.format || field.type
}

function groupLabel(path: string, segment: string, index: number) {
  if (index === 0) {
    const entity = resolvedFieldMapping.value.entities.get(segment)
    return entity ? `${entity.displayName} (${segment})` : path
  }
  return segment
}

function scrollActiveLayerTabIntoView() {
  nextTick(() => {
    const body = studioBodyRef.value
    if (!body)
      return

    const navScroll = body.querySelector('.rules-pane__tabs .el-tabs__nav-wrap .el-tabs__nav-scroll') as HTMLElement | null
    const activeItem = body.querySelector('.rules-pane__tabs .el-tabs__item.is-active') as HTMLElement | null
    if (!navScroll || !activeItem)
      return

    activeItem.scrollIntoView({
      block: 'nearest',
      inline: 'nearest'
    })

    const navRect = navScroll.getBoundingClientRect()
    const itemRect = activeItem.getBoundingClientRect()
    const padding = 28

    if (layerTabPosition.value === 'left') {
      if (itemRect.bottom > navRect.bottom)
        navScroll.scrollTop += itemRect.bottom - navRect.bottom + padding
      else if (itemRect.top < navRect.top)
        navScroll.scrollTop -= navRect.top - itemRect.top + padding
      return
    }

    if (itemRect.right > navRect.right)
      navScroll.scrollLeft += itemRect.right - navRect.right + padding
    else if (itemRect.left < navRect.left)
      navScroll.scrollLeft -= navRect.left - itemRect.left + padding
  })
}
</script>

<style scoped>
.policy-studio {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
  min-height: 0;
}

.studio-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.studio-header h2 {
  margin: 0;
  font-size: 18px;
  line-height: 1.2;
}

.studio-meta {
  display: flex;
  gap: 4px;
  margin-top: 4px;
  flex-wrap: wrap;
}

.studio-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.studio-body {
  display: flex;
  flex: 1;
  min-width: 0;
  min-height: 720px;
}

.rules-pane,
.preview-pane {
  min-width: 0;
  border: 1px solid #e4e7ed;
  border-radius: 10px;
  background: linear-gradient(180deg, #ffffff 0%, #f7f9fc 100%);
  overflow: auto;
}

.rules-pane {
  padding: 10px;
}

.rules-pane__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}

.rules-pane__toolbar-title,
.rules-pane__toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.rules-pane__group-switch {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #606266;
  font-size: 12px;
}

.rules-pane__toolbar-title span:first-child {
  font-size: 14px;
  font-weight: 700;
}

.rules-pane__tabs {
  min-height: calc(100% - 48px);
}

.rules-pane__tabs :deep(.el-tabs__item) {
  overflow: visible;
}

.layer-tab-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  max-width: 100%;
  overflow: visible;
}

.layer-tab-label:hover .layer-tab-label__delete,
.layer-tab-label:focus-within .layer-tab-label__delete {
  opacity: 1;
}

.layer-tab-label__text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.layer-tab-label__edit {
  flex-shrink: 0;
  padding: 0;
}

.layer-tab-label__delete {
  flex-shrink: 0;
  padding: 0;
  opacity: 0;
  transition: opacity 0.18s ease;
  color: #f56c6c;
}

.rules-pane__tabs :deep(.el-tabs__new-tab) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 8px;
}

.studio-splitter {
  position: relative;
  flex: 0 0 10px;
  cursor: col-resize;
}

.studio-splitter::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 3px;
  transform: translateX(-50%);
  border-radius: 999px;
  background: #dcdfe6;
}

.studio-splitter.is-dragging::before,
.studio-splitter:hover::before {
  background: #409eff;
}

.layer-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  color: #606266;
  font-size: 12px;
  flex-wrap: wrap;
}

.layer-summary__item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.layer-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 6px;
  margin-bottom: 10px;
}

.rule-tree-list,
.rule-flat-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.field-node-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 6px;
}

.inline-edit {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.inline-edit--tab {
  width: max-content;
  min-width: 220px;
  max-width: min(320px, calc(100vw - 180px));
}

.inline-edit :deep(.el-input) {
  min-width: 0;
}

.inline-edit--tab :deep(.el-input) {
  width: 220px;
  max-width: 100%;
}

.inline-edit :deep(.el-input-number) {
  width: 120px;
}

.inline-edit__action {
  padding: 0;
  flex-shrink: 0;
}

.preview-pane {
  padding: 8px;
}

.preview-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
  padding: 7px 9px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  background: #ffffff;
}

.preview-title {
  font-weight: 600;
  color: #303133;
  font-size: 13px;
}

.preview-switches {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.switch-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #606266;
  font-size: 11px;
}

.preview-tree {
  display: flex;
  flex-direction: column;
}

.preview-pane :deep(.el-tabs__content) {
  padding-top: 8px;
}

@media (max-width: 1100px) {
  .studio-header,
  .rules-pane__toolbar,
  .preview-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .studio-body {
    flex-direction: column;
    gap: 16px;
  }

  .studio-splitter {
    display: none;
  }

  .rules-pane,
  .preview-pane {
    flex-basis: auto !important;
    min-height: 360px;
  }
}
</style>
