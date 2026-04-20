<template>
  <el-dialog
    :model-value="modelValue"
    title="加载 Schema / 校验集"
    width="820px"
    destroy-on-close
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-tabs v-model="activeTab">
      <el-tab-pane label="示例 Schema" name="sample">
        <el-select
          v-model="selectedSampleId"
          class="load-bundle-dialog__full"
          placeholder="选择示例包"
          filterable
          :filter-method="filterSample"
        >
          <el-option
            v-for="sample in filteredSamples"
            :key="sample.id"
            :label="sample.name"
            :value="sample.id"
          >
            <span v-html="highlightMatch(sample.name)" />
          </el-option>
        </el-select>
      </el-tab-pane>

      <el-tab-pane label="粘贴文本" name="text">
        <el-input
          v-model="bundleText"
          type="textarea"
          :rows="18"
          placeholder="粘贴 policy.bundle.md 文本"
        />
      </el-tab-pane>

      <el-tab-pane label="上传压缩包" name="file">
        <input
          ref="fileInputRef"
          type="file"
          accept=".zip,application/zip"
          class="load-bundle-dialog__file-input"
          @change="handleFileChange"
        >
        <div class="load-bundle-dialog__file-panel">
          <el-button @click="fileInputRef?.click()">选择压缩包</el-button>
          <span>{{ selectedFile?.name || '未选择压缩包' }}</span>
        </div>
      </el-tab-pane>

      <el-tab-pane label="从网址解析" name="url">
        <el-input
          v-model="bundleUrl"
          placeholder="输入返回 zip 或 markdown 文本的 URL"
        />
      </el-tab-pane>
    </el-tabs>

    <el-alert
      v-if="errorMessage"
      type="error"
      show-icon
      :closable="false"
      :title="errorMessage"
      class="load-bundle-dialog__error"
    />

    <template #footer>
      <div class="load-bundle-dialog__actions">
        <el-button @click="emit('update:modelValue', false)">取消</el-button>
        <el-button type="primary" :loading="loading" @click="loadCurrentSource">加载</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { fetchPolicyBundleFromUrl, parsePolicyBundleFile, parsePolicyBundleText } from '../utils/policy-bundle'
import type { PolicyBundle } from '../types'

interface SampleBundleOption {
  id: string
  name: string
  bundle: PolicyBundle
}

interface Props {
  modelValue: boolean
  samples: SampleBundleOption[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  load: [bundle: PolicyBundle]
}>()

const activeTab = ref<'sample' | 'text' | 'file' | 'url'>('sample')
const bundleText = ref('')
const bundleUrl = ref('')
const selectedSampleId = ref(props.samples[0]?.id || '')
const selectedFile = ref<File | null>(null)
const errorMessage = ref('')
const loading = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)
const sampleSearchKeyword = ref('')
const filteredSamples = computed(() => {
  const keyword = sampleSearchKeyword.value.trim().toLowerCase()
  if (!keyword)
    return props.samples
  return props.samples.filter(sample => sample.name.toLowerCase().includes(keyword))
})

async function loadCurrentSource() {
  errorMessage.value = ''
  loading.value = true
  try {
    let bundle: PolicyBundle | null = null

    if (activeTab.value === 'sample') {
      bundle = props.samples.find(item => item.id === selectedSampleId.value)?.bundle || null
      if (!bundle)
        throw new Error('未选择示例 Schema')
    }

    if (activeTab.value === 'text') {
      if (!bundleText.value.trim())
        throw new Error('请输入 policy.bundle.md 文本')
      bundle = parsePolicyBundleText(bundleText.value)
    }

      if (activeTab.value === 'file') {
        if (!selectedFile.value)
          throw new Error('请先选择压缩包')
        bundle = await parsePolicyBundleFile(selectedFile.value)
      }

    if (activeTab.value === 'url') {
      if (!bundleUrl.value.trim())
        throw new Error('请输入 URL')
      bundle = await fetchPolicyBundleFromUrl(bundleUrl.value.trim())
    }

    if (!bundle)
      throw new Error('未能解析任何 Bundle')

    emit('load', bundle)
    emit('update:modelValue', false)
  }
  catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载失败'
  }
  finally {
    loading.value = false
  }
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  selectedFile.value = input.files?.[0] || null
}

function filterSample(keyword: string) {
  sampleSearchKeyword.value = keyword.trim()
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function highlightMatch(value: string) {
  const keyword = sampleSearchKeyword.value.trim()
  if (!keyword)
    return escapeHtml(value)

  const pattern = new RegExp(`(${escapeRegExp(keyword)})`, 'ig')
  return escapeHtml(value).replace(pattern, '<mark>$1</mark>')
}
</script>

<style scoped>
.load-bundle-dialog__full {
  width: 100%;
}

.load-bundle-dialog__file-input {
  display: none;
}

.load-bundle-dialog__file-panel {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 40px;
}

.load-bundle-dialog__error {
  margin-top: 12px;
}

.load-bundle-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

:deep(mark) {
  padding: 0 2px;
  border-radius: 3px;
  background: #fff1b8;
  color: inherit;
}
</style>
