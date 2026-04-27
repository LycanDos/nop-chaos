<template>
  <div class="batch-submit-wrapper">
    <el-badge :value="changeCount" :hidden="changeCount === 0" :max="99">
      <el-button
        type="primary"
        :disabled="changeCount === 0 || isSubmitting"
        :loading="isSubmitting"
        @click="handleSubmit"
      >
        全部提交
      </el-button>
    </el-badge>

    <!-- Submit Result Dialog -->
    <el-dialog
      v-model="resultDialogVisible"
      title="提交结果"
      width="480px"
      :close-on-click-modal="false"
    >
      <div v-if="submitResult" class="submit-result">
        <div class="result-summary">
          <div class="result-item result-item--applied">
            <el-icon class="result-icon" color="#67c23a"><CircleCheckFilled /></el-icon>
            <span class="result-label">已应用</span>
            <span class="result-count">{{ submitResult.appliedCount }}</span>
          </div>
          <div class="result-item result-item--draft">
            <el-icon class="result-icon" color="#e6a23c"><WarningFilled /></el-icon>
            <span class="result-label">待审批（草稿）</span>
            <span class="result-count">{{ submitResult.draftCount }}</span>
          </div>
        </div>

        <el-alert
          v-if="submitResult.draftCount > 0"
          type="warning"
          :closable="false"
          show-icon
          class="result-alert"
        >
          {{ submitResult.draftCount }} 条规则因优先级冲突已保存为草稿，需要审批人批准后才能生效。
        </el-alert>

        <div v-if="submitResult.createdUnlockRequestIds.length > 0" class="unlock-requests">
          <span class="unlock-label">已创建解锁申请：</span>
          <el-tag
            v-for="reqId in submitResult.createdUnlockRequestIds"
            :key="reqId"
            size="small"
            type="info"
          >
            {{ reqId }}
          </el-tag>
        </div>
      </div>

      <div v-if="submitError" class="submit-error">
        <el-alert type="error" :title="submitError" :closable="false" show-icon />
      </div>

      <template #footer>
        <el-button type="primary" @click="resultDialogVisible = false">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { CircleCheckFilled, WarningFilled } from '@element-plus/icons-vue'
import type { BatchSubmitResult } from '../composables/useBatchChanges'

interface Props {
  changeCount: number
  isSubmitting: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  submit: []
  'update:resultVisible': [visible: boolean]
}>()

const resultDialogVisible = ref(false)
const submitResult = ref<BatchSubmitResult | null>(null)
const submitError = ref<string | null>(null)

function handleSubmit() {
  emit('submit')
}

/**
 * Show the result dialog after a batch submission completes.
 * Called by the parent component.
 */
function showResult(result: BatchSubmitResult) {
  submitResult.value = result
  submitError.value = null
  resultDialogVisible.value = true
}

/**
 * Show an error in the result dialog.
 */
function showError(message: string) {
  submitResult.value = null
  submitError.value = message
  resultDialogVisible.value = true
}

defineExpose({ showResult, showError })
</script>

<style scoped>
.batch-submit-wrapper {
  display: inline-flex;
  align-items: center;
}

.submit-result {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.result-summary {
  display: flex;
  gap: 24px;
  justify-content: center;
  padding: 12px 0;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
}

.result-icon {
  font-size: 22px;
}

.result-label {
  color: #606266;
}

.result-count {
  font-weight: 700;
  font-size: 20px;
}

.result-item--applied .result-count {
  color: #67c23a;
}

.result-item--draft .result-count {
  color: #e6a23c;
}

.result-alert {
  margin-top: 4px;
}

.unlock-requests {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.unlock-label {
  font-size: 13px;
  color: #606266;
}

.submit-error {
  padding: 8px 0;
}
</style>
