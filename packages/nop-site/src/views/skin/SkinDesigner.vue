<template>
  <div class="skin-designer" @keydown.esc="onEscKey" tabindex="0" ref="designerRef">
    <!-- ===== Toolbar ===== -->
    <div class="designer-toolbar">
      <div class="toolbar-left">
        <span class="toolbar-title">皮肤设计器</span>
        <el-select
          v-model="selectedCode"
          placeholder="选择已有皮肤继续编辑"
          filterable clearable size="small"
          style="width: 220px"
          @change="onSkinSelect"
        >
          <el-option v-for="s in skinList" :key="s.templateCode"
            :label="s.templateName" :value="s.templateCode" />
        </el-select>
      </div>
      <div class="toolbar-info" v-if="form.templateName">
        <span class="info-name">{{ form.templateName }}</span>
        <span class="info-code">{{ form.templateCode || '未保存' }}</span>
        <el-tag :type="statusTagType" size="small" effect="plain">{{ statusLabel }}</el-tag>
      </div>
      <div class="toolbar-actions">
        <el-button size="small" @click="handleNew">新建</el-button>
        <el-button size="small" type="primary" @click="handleSave">保存</el-button>
        <el-button size="small" @click="handleRefresh">刷新预览</el-button>
      </div>
    </div>

    <!-- ===== Body: Preview + Property Panel ===== -->
    <div class="designer-body">
      <!-- LEFT: BPMN Preview -->
      <div class="designer-preview">
        <SkinPreview
          ref="previewRef"
          :skin-json="form.skinJson"
          :preview-state="previewState"
          :preview-progress="previewProgress"
          :preview-actor="previewActor"
          :selected-element-id="selectedElementId"
          @select-element="onSelectElement"
          @set-preview-state="onSetPreviewState"
        />
      </div>

      <!-- RIGHT: Property Panel -->
      <div class="designer-property">
        <SkinPropertyPanel
          :skin-json="form.skinJson"
          :selected-element-id="selectedElementId"
          @select-element="onSelectElement"
        />
      </div>
    </div>

    <!-- Preview Controls Bar -->
    <div class="preview-controls">
      <div class="control-group">
        <span class="control-label">经办人</span>
        <el-input v-model="previewActor" placeholder="经办人" size="small" style="width:120px" />
      </div>
      <div class="control-group">
        <span class="control-label">进度</span>
        <el-slider v-model="previewProgress" :min="0" :max="100" :step="5" style="width:140px" />
        <span class="control-value">{{ previewProgress }}%</span>
      </div>
      <div class="control-group" v-if="selectedElementId">
        <span class="control-label">选中</span>
        <span class="selected-id">{{ selectedElementId }}</span>
        <el-button size="small" text @click="onSelectElement(null)">取消</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, provide, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ajaxRequest } from '@nop-chaos/sdk'
import SkinPreview from './components/SkinPreview.vue'
import SkinPropertyPanel from './components/SkinPropertyPanel.vue'
import { DEFAULT_SKIN_JSON } from './types'
import type { StateKey } from './types'

// ===== Route =====
const route = useRoute()

// ===== Refs =====
const designerRef = ref<HTMLDivElement | null>(null)
const previewRef = ref<InstanceType<typeof SkinPreview> | null>(null)

// ===== Skin Data =====
const skinList = ref<any[]>([])
const selectedCode = ref<string>('')
const loading = ref(false)
const selectedElementId = ref<string | null>(null)

// ===== Preview Controls =====
const previewState = ref<StateKey>('activated')
const previewActor = ref('当前办理人')
const previewProgress = ref(45)

// ===== Form =====
const form = reactive({
  templateCode: '',
  templateName: '',
  category: '',
  bpmnBaseType: 'bpmn:UserTask',
  status: 'draft',
  thumbnail: '',
  skinJson: JSON.parse(JSON.stringify(DEFAULT_SKIN_JSON)) as any,
})

// ===== Provide child state =====
provide('skinDesignerState', {
  form,
  previewState,
  previewProgress,
  previewActor,
  selectedElementId,
})

// Provide refresh for child components
provide('$preview', {
  refresh: () => nextTick(() => previewRef.value?.refresh()),
})

// ===== Computed =====
const statusTagType = computed(() => {
  const m: Record<string, string> = { draft: 'warning', enabled: 'success', disabled: 'info' }
  return m[form.status] || 'info'
})
const statusLabel = computed(() => {
  const m: Record<string, string> = { draft: '草稿', enabled: '已启用', disabled: '已禁用' }
  return m[form.status] || form.status
})

// ===== Element Selection =====
function onSelectElement(id: string | null): void {
  selectedElementId.value = id
}

function onSetPreviewState(state: StateKey): void {
  previewState.value = state
}

function onEscKey(): void {
  selectedElementId.value = null
}

// ===== API Methods =====
async function loadSkinList(): Promise<void> {
  try {
    const data = await ajaxRequest({
      url: '@query:WfSkin__listSkins/templateCode,templateName,category,status,bpmnBaseType,icon,iconColor,thumbnail,sortNo',
    })
    skinList.value = data || []
  } catch (e) {
    console.error('加载皮肤列表失败:', e)
  }
}

async function loadSkinDetail(code: string): Promise<void> {
  try {
    loading.value = true
    const data = await ajaxRequest({
      url: '@query:WfSkin__getSkinDef/templateCode,templateName,skinJson,category,status,bpmnBaseType,thumbnail',
      data: { code },
    })
    if (data) {
      form.templateCode = data.templateCode || ''
      form.templateName = data.templateName || ''
      form.category = data.category || ''
      form.bpmnBaseType = data.bpmnBaseType || 'bpmn:UserTask'
      form.status = data.status || 'draft'
      form.thumbnail = data.thumbnail || ''
      form.skinJson = data.skinJson
        ? JSON.parse(JSON.stringify(data.skinJson))
        : JSON.parse(JSON.stringify(DEFAULT_SKIN_JSON))
      ensureSkinJsonDefaults()
    }
  } catch (e) {
    console.error('加载皮肤详情失败:', e)
    ElMessage.error('加载皮肤详情失败')
  } finally {
    loading.value = false
  }
}

function ensureSkinJsonDefaults(): void {
  const sk = form.skinJson

  // palette
  if (!sk.variables) sk.variables = {}
  if (!sk.variables.palette) sk.variables.palette = { ...DEFAULT_SKIN_JSON.variables.palette }
  for (const key of Object.keys(DEFAULT_SKIN_JSON.variables.palette)) {
    if (!sk.variables.palette[key]) sk.variables.palette[key] = (DEFAULT_SKIN_JSON.variables.palette as any)[key]
  }

  // semantic palette
  if (!sk.variables.semantic) sk.variables.semantic = { ...(DEFAULT_SKIN_JSON.variables.semantic || {}) }

  // states
  if (!sk.states) sk.states = {}
  for (const key of Object.keys(DEFAULT_SKIN_JSON.states)) {
    if (!sk.states[key]) sk.states[key] = {}
    const def = (DEFAULT_SKIN_JSON.states as any)[key]
    for (const [pk, pv] of Object.entries(def)) {
      if (sk.states[key][pk] === undefined) sk.states[key][pk] = pv
    }
  }

  // progress
  if (!sk.progress) sk.progress = JSON.parse(JSON.stringify(DEFAULT_SKIN_JSON.progress))

  // overlays
  if (!sk.overlays) sk.overlays = JSON.parse(JSON.stringify(DEFAULT_SKIN_JSON.overlays))

  // new fields
  if (!sk.elementOverrides) sk.elementOverrides = {}
  if (!sk.canvasDecorations) sk.canvasDecorations = []
  if (!sk.info) sk.info = {}
}

async function handleSave(): Promise<void> {
  if (!form.templateCode) {
    ElMessage.warning('请填写皮肤编码')
    return
  }
  if (!form.templateName) {
    ElMessage.warning('请填写皮肤名称')
    return
  }
  try {
    const saveData: Record<string, any> = {
      templateCode: form.templateCode,
      templateName: form.templateName,
      skinJson: JSON.stringify(form.skinJson),
      bpmnBaseType: form.bpmnBaseType,
      category: form.category || 'custom',
      thumbnail: form.thumbnail || '-',
    }

    await ajaxRequest({
      url: '@mutation:WfSkin__saveSkinDef',
      data: saveData,
    })
    ElMessage.success('皮肤保存成功！')
    await loadSkinList()
  } catch (e) {
    console.error('保存失败:', e)
    ElMessage.error('皮肤保存失败')
  }
}

function handleNew(): void {
  selectedCode.value = ''
  selectedElementId.value = null
  form.templateCode = ''
  form.templateName = ''
  form.category = ''
  form.bpmnBaseType = 'bpmn:UserTask'
  form.status = 'draft'
  form.thumbnail = ''
  form.skinJson = JSON.parse(JSON.stringify(DEFAULT_SKIN_JSON))
}

function handleRefresh(): void {
  previewRef.value?.refresh()
}

function onSkinSelect(code: string): void {
  if (code) loadSkinDetail(code)
}

// ===== Handle route params =====
onMounted(async () => {
  await loadSkinList()
  const code = route.query.code as string
  if (code) {
    selectedCode.value = code
    await loadSkinDetail(code)
  }
  // Focus for keyboard events
  nextTick(() => designerRef.value?.focus())
})
</script>

<style scoped>
.skin-designer {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 100px);
  background: #f5f7fa;
  overflow: hidden;
  outline: none;
}

/* ===== Toolbar ===== */
.designer-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
  flex-wrap: wrap;
  gap: 10px;
  flex-shrink: 0;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolbar-title {
  font-size: 16px;
  font-weight: 600;
  color: #262626;
  white-space: nowrap;
}

.toolbar-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-name {
  font-weight: 600;
  color: #333;
}

.info-code {
  font-size: 12px;
  color: #999;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
}

/* ===== Body: Preview + Property ===== */
.designer-body {
  display: grid;
  grid-template-columns: 1fr 380px;
  flex: 1;
  gap: 12px;
  padding: 12px 20px;
  overflow: hidden;
  min-height: 0;
}

.designer-preview {
  min-height: 0;
  overflow: hidden;
}

.designer-property {
  min-height: 0;
  overflow: hidden;
}

/* ===== Preview Controls Bar ===== */
.preview-controls {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 8px 20px;
  background: #fff;
  border-top: 1px solid #e8e8e8;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-label {
  font-size: 12px;
  color: #666;
  font-weight: 500;
  white-space: nowrap;
}

.control-value {
  font-size: 12px;
  color: #999;
  font-family: monospace;
  min-width: 32px;
}

.selected-id {
  font-size: 12px;
  color: #1890ff;
  font-family: monospace;
  font-weight: 600;
}
</style>
