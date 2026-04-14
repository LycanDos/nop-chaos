<template>
  <div class="policy-studio">
    <div class="studio-header">
      <div>
        <h2>Policy Studio</h2>
        <div class="studio-meta">
          <el-tag type="info">{{ localDocument.name }}</el-tag>
          <el-tag v-if="localDocument.targetSchema" type="success">{{ localDocument.targetSchema }}</el-tag>
        </div>
      </div>
      <div class="studio-actions">
        <el-button @click="addRule">添加规则</el-button>
        <el-button @click="emitJson">导出 JSON</el-button>
        <el-button type="primary" @click="emitXml">导出 XML</el-button>
      </div>
    </div>

    <div class="studio-body">
      <div class="editor-pane">
        <el-tabs v-model="activeLayerId" type="border-card">
          <el-tab-pane
            v-for="layer in orderedLayers"
            :key="layer.id"
            :label="layer.name"
            :name="layer.id"
          >
            <div class="layer-summary">
              <el-tag>{{ layer.layerType }}</el-tag>
              <span>规则数 {{ layer.rules.length }}</span>
              <span>顺序 {{ layer.orderNo }}</span>
            </div>

            <div
              v-for="(rule, index) in layer.rules"
              :key="rule.id"
              class="rule-card"
            >
              <div class="rule-card-header">
                <div class="rule-title">
                  <el-tag size="small" :type="layerTagType(layer.layerType)">{{ layer.layerType }}</el-tag>
                  <span>{{ rule.id }}</span>
                </div>
                <div class="rule-tools">
                  <el-switch v-model="rule.enabled" />
                  <el-button link type="danger" @click="removeRule(layer.id, index)">删除</el-button>
                </div>
              </div>

              <el-form label-width="92px" size="small">
                <el-row :gutter="12">
                  <el-col :span="12">
                    <el-form-item label="字段路径">
                      <PathSelector
                        v-model="rule.path"
                        :hint-engine="hintEngine"
                        placeholder="选择字段路径"
                      />
                    </el-form-item>
                  </el-col>
                  <el-col :span="6">
                    <el-form-item label="操作符">
                      <el-select v-model="rule.operator">
                        <el-option
                          v-for="option in operatorOptions"
                          :key="option.value"
                          :label="option.label"
                          :value="option.value"
                        />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="6">
                    <el-form-item label="顺序">
                      <el-input-number v-model="rule.orderNo" :min="0" :step="10" />
                    </el-form-item>
                  </el-col>
                </el-row>

                <el-row :gutter="12">
                  <el-col :span="8" v-if="needsValue(rule.operator)">
                    <el-form-item label="值">
                      <el-input v-model="rule.value" placeholder="输入值" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="8" v-if="rule.operator === 'between'">
                    <el-form-item label="最小值">
                      <el-input-number v-model="rule.min" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="8" v-if="rule.operator === 'between'">
                    <el-form-item label="最大值">
                      <el-input-number v-model="rule.max" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="8" v-if="rule.operator === 'regex'">
                    <el-form-item label="正则">
                      <el-input v-model="rule.pattern" placeholder="正则表达式" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="8" v-if="rule.operator === 'default'">
                    <el-form-item label="默认值">
                      <el-input v-model="rule.defaultValue" placeholder="默认值" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="8" v-if="rule.operator === 'locked'">
                    <el-form-item label="锁定值">
                      <el-input v-model="rule.lockedValue" placeholder="锁定值" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="8" v-if="rule.operator === 'locked'">
                    <el-form-item label="锁定模式">
                      <el-select v-model="rule.lockMode">
                        <el-option label="LOCKED" value="LOCKED" />
                        <el-option label="MUST_EQUAL_PREFILL" value="MUST_EQUAL_PREFILL" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="8" v-if="rule.operator === 'in'">
                    <el-form-item label="集合">
                      <el-select
                        :model-value="rule.values"
                        multiple
                        allow-create
                        filterable
                        default-first-option
                        @change="onValuesChange(rule, $event)"
                      />
                    </el-form-item>
                  </el-col>
                  <el-col :span="8" v-if="rule.operator === 'clear'">
                    <el-form-item label="目标族">
                      <el-select v-model="rule.targetFamily">
                        <el-option v-for="family in clearFamilies" :key="family" :label="family" :value="family" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                </el-row>

                <el-row :gutter="12">
                  <el-col :span="8">
                    <el-form-item label="错误码">
                      <el-input v-model="rule.errorCode" placeholder="可选" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="6">
                    <el-form-item label="严重度">
                      <el-input-number v-model="rule.severity" :min="0" :max="10" />
                    </el-form-item>
                  </el-col>
                </el-row>

                <el-form-item label="说明">
                  <el-input v-model="rule.errorDescription" type="textarea" :rows="2" />
                </el-form-item>

                <el-form-item label="生效条件">
                  <ConditionBuilder
                    v-if="rule.applyWhen"
                    v-model="rule.applyWhen"
                    :hint-engine="hintEngine"
                    @delete="rule.applyWhen = undefined"
                  />
                  <el-button v-else link type="primary" @click="rule.applyWhen = createDefaultCondition()">
                    添加生效条件
                  </el-button>
                </el-form-item>
              </el-form>
            </div>

            <el-empty v-if="layer.rules.length === 0" description="当前层暂无规则" :image-size="80" />
          </el-tab-pane>
        </el-tabs>
      </div>

      <div class="preview-pane">
        <el-tabs v-model="previewTab">
          <el-tab-pane label="生效预览" name="effective">
            <div v-for="pathView in compileResult.paths" :key="pathView.path" class="path-view">
              <div class="path-header">{{ pathView.path }}</div>
              <div class="effective-list">
                <el-tag
                  v-for="summary in pathView.effectiveSummaries"
                  :key="summary"
                  type="success"
                  class="effective-tag"
                >
                  {{ summary }}
                </el-tag>
              </div>
              <div v-if="pathView.finalFamilies.length" class="family-list">
                <div
                  v-for="family in pathView.finalFamilies"
                  :key="`${family.family}-${family.ruleId}`"
                  class="family-item"
                >
                  <span class="family-name">{{ family.family }}</span>
                  <span class="family-value">{{ family.layerType }} / {{ family.summary }}</span>
                </div>
              </div>
              <div class="compiled-list">
                <div
                  v-for="item in pathView.compiledRules"
                  :key="`${item.layerId}-${item.ruleId}`"
                  class="compiled-item"
                  :class="`is-${item.status}`"
                >
                  <span class="compiled-main">{{ item.layerType }} / {{ item.family || item.operator }} / {{ item.summary }}</span>
                  <span v-if="item.reason" class="compiled-reason">{{ item.reason }}</span>
                </div>
              </div>
            </div>
          </el-tab-pane>
          <el-tab-pane label="XML" name="xml">
            <el-input v-model="xmlPreview" type="textarea" :rows="28" readonly />
          </el-tab-pane>
          <el-tab-pane label="JSON" name="json">
            <el-input v-model="jsonPreview" type="textarea" :rows="28" readonly />
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, toRaw, watch } from 'vue'
import { ElMessage } from 'element-plus/es/components/message/index.mjs'
import ConditionBuilder from './ConditionBuilder.vue'
import PathSelector from './PathSelector.vue'
import { HintEngine } from '../engines/hint-engine'
import { PolicyCompiler } from '../engines/policy-compiler'
import { PolicyXmlEngine } from '../engines/policy-xml-engine'
import type {
  FieldMapping,
  PolicyDocument,
  PolicyLayer,
  PolicyLayerType,
  PolicyOperator,
  PolicyRule
} from '../types'

interface Props {
  modelValue: PolicyDocument
  fieldMapping: FieldMapping
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: PolicyDocument]
  change: [value: PolicyDocument]
  exportXml: [value: string]
  exportJson: [value: string]
}>()

const compiler = new PolicyCompiler()
const xmlEngine = new PolicyXmlEngine()
const hintEngine = new HintEngine(props.fieldMapping)

function cloneDocument(value: PolicyDocument): PolicyDocument {
  return structuredClone(toRaw(value))
}

const localDocument = ref<PolicyDocument>(cloneDocument(props.modelValue))
const activeLayerId = ref(localDocument.value.layers[0]?.id || '')
const previewTab = ref('effective')

const operatorOptions: Array<{ label: string; value: PolicyOperator }> = [
  { label: 'required', value: 'required' },
  { label: 'gt', value: 'gt' },
  { label: 'ge', value: 'ge' },
  { label: 'lt', value: 'lt' },
  { label: 'le', value: 'le' },
  { label: 'eq', value: 'eq' },
  { label: 'in', value: 'in' },
  { label: 'between', value: 'between' },
  { label: 'contains', value: 'contains' },
  { label: 'regex', value: 'regex' },
  { label: 'default', value: 'default' },
  { label: 'locked', value: 'locked' },
  { label: 'readonly', value: 'readonly' },
  { label: 'clear', value: 'clear' }
]

const clearFamilies = [
  'required',
  'range',
  'exact',
  'set',
  'regex',
  'contains',
  'default',
  'locked',
  'readonly'
]

const orderedLayers = computed(() => [...localDocument.value.layers].sort((a, b) => a.orderNo - b.orderNo))
const compileResult = computed(() => compiler.compile(localDocument.value))
const xmlPreview = computed(() => xmlEngine.export(localDocument.value))
const jsonPreview = computed(() => JSON.stringify(localDocument.value, null, 2))

watch(
  () => props.modelValue,
  (value) => {
    localDocument.value = cloneDocument(value)
    if (!orderedLayers.value.find(layer => layer.id === activeLayerId.value)) {
      activeLayerId.value = orderedLayers.value[0]?.id || ''
    }
  },
  { deep: true }
)

watch(
  localDocument,
  (value) => {
    emit('update:modelValue', cloneDocument(value))
    emit('change', cloneDocument(value))
  },
  { deep: true }
)

function activeLayer(): PolicyLayer | undefined {
  return localDocument.value.layers.find(layer => layer.id === activeLayerId.value)
}

function addRule() {
  const layer = activeLayer()
  if (!layer)
    return

  const rule: PolicyRule = {
    id: `rule-${Date.now()}`,
    path: '',
    operator: 'required',
    enabled: true,
    orderNo: nextOrderNo(layer),
    severity: 5
  }
  rule.applyWhen = createDefaultCondition()
  layer.rules.push(rule)
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

function nextOrderNo(layer: PolicyLayer): number {
  return layer.rules.reduce((max, item) => Math.max(max, item.orderNo), 0) + 10
}

function removeRule(layerId: string, index: number) {
  const layer = localDocument.value.layers.find(item => item.id === layerId)
  if (!layer)
    return
  layer.rules.splice(index, 1)
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

function onValuesChange(rule: PolicyRule, values: string[]) {
  rule.values = values
}

function needsValue(operator: PolicyOperator): boolean {
  return ['gt', 'ge', 'lt', 'le', 'eq', 'contains'].includes(operator)
}

function emitXml() {
  emit('exportXml', xmlPreview.value)
  ElMessage.success('已导出 XML')
}

function emitJson() {
  emit('exportJson', jsonPreview.value)
  ElMessage.success('已导出 JSON')
}
</script>

<style scoped>
.policy-studio {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
}

.studio-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.studio-header h2 {
  margin: 0;
}

.studio-meta {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.studio-actions {
  display: flex;
  gap: 8px;
}

.studio-body {
  display: grid;
  grid-template-columns: minmax(720px, 1.3fr) minmax(420px, 0.7fr);
  gap: 16px;
  min-height: 720px;
}

.editor-pane,
.preview-pane {
  min-width: 0;
}

.layer-summary {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  color: #606266;
  font-size: 13px;
}

.rule-card {
  margin-bottom: 16px;
  padding: 16px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background: #fff;
}

.rule-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.rule-title,
.rule-tools {
  display: flex;
  align-items: center;
  gap: 8px;
}

.path-view {
  margin-bottom: 16px;
  padding: 12px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #fff;
}

.path-header {
  font-weight: 600;
  margin-bottom: 8px;
}

.effective-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.effective-tag {
  margin-right: 0;
}

.compiled-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.family-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 8px;
}

.family-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 6px;
  background: #f5f7fa;
  font-size: 13px;
}

.family-name {
  min-width: 72px;
  font-weight: 600;
  color: #606266;
}

.family-value {
  color: #303133;
}

.compiled-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 13px;
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
  font-size: 12px;
  opacity: 0.9;
}
</style>
