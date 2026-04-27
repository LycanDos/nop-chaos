<template>
  <el-dialog
    v-model="visible"
    title="冲突规则审批人选择"
    width="640px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <!-- Approver Mode Selection -->
    <div class="approver-mode">
      <span class="mode-label">审批人选择模式：</span>
      <el-radio-group v-model="approverMode">
        <el-radio value="single">为所有冲突规则统一选择审批人</el-radio>
        <el-radio value="individual">为每条规则单独选择审批人</el-radio>
      </el-radio-group>
    </div>

    <!-- Single Approver Mode -->
    <div v-if="approverMode === 'single'" class="single-approver">
      <el-form-item label="审批人">
        <el-select
          v-model="defaultApproverId"
          placeholder="选择审批人"
          filterable
          class="approver-select"
        >
          <el-option
            v-for="approver in eligibleApprovers"
            :key="approver.id"
            :label="approver.displayName"
            :value="approver.id"
          >
            <span>{{ approver.displayName }}</span>
            <span class="approver-priority">优先级: {{ approver.effectivePriority }}</span>
          </el-option>
        </el-select>
      </el-form-item>
    </div>

    <!-- Individual Approver Mode -->
    <div v-if="approverMode === 'individual'" class="individual-approvers">
      <div
        v-for="rule in conflictRules"
        :key="rule.ruleId"
        class="conflict-rule-row"
      >
        <div class="rule-info">
          <el-tag size="small" type="danger">冲突</el-tag>
          <span class="rule-path">{{ rule.path || rule.ruleId }}</span>
          <el-tag v-if="rule.classification === 'UNKNOWN'" size="small" type="warning">
            UNKNOWN
          </el-tag>
        </div>

        <!-- UNKNOWN conflict resolution options -->
        <div v-if="rule.classification === 'UNKNOWN'" class="unknown-resolution">
          <span class="resolution-label">解决方式：</span>
          <el-radio-group
            :model-value="unknownResolutions[rule.ruleId] || ''"
            @update:model-value="setUnknownResolution(rule.ruleId, $event as string)"
          >
            <el-radio value="tighten">标记为收紧</el-radio>
            <el-radio value="relax">标记为放松</el-radio>
            <el-radio value="admin">提交给管理员</el-radio>
          </el-radio-group>
        </div>

        <el-select
          v-if="rule.classification !== 'UNKNOWN' || unknownResolutions[rule.ruleId] === 'relax' || unknownResolutions[rule.ruleId] === 'admin'"
          :model-value="perRuleApproverIds[rule.ruleId] || ''"
          placeholder="选择审批人"
          filterable
          class="approver-select"
          @update:model-value="setPerRuleApprover(rule.ruleId, $event as string)"
        >
          <el-option
            v-for="approver in eligibleApprovers"
            :key="approver.id"
            :label="approver.displayName"
            :value="approver.id"
          >
            <span>{{ approver.displayName }}</span>
            <span class="approver-priority">优先级: {{ approver.effectivePriority }}</span>
          </el-option>
        </el-select>
      </div>
    </div>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :disabled="!isValid" @click="handleConfirm">
        确认提交
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'

export interface EligibleApprover {
  id: string
  displayName: string
  effectivePriority: number
}

export interface ConflictRule {
  ruleId: string
  path: string
  classification: 'RELAXATION' | 'UNKNOWN'
}

export interface ApproverSelection {
  approverMode: 'single' | 'individual'
  defaultApproverId: string
  perRuleApproverIds: Record<string, string>
  unknownResolutions: Record<string, string>
}

interface Props {
  modelValue: boolean
  conflictRules?: ConflictRule[]
  eligibleApprovers?: EligibleApprover[]
}

const props = withDefaults(defineProps<Props>(), {
  conflictRules: () => [],
  eligibleApprovers: () => [],
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [selection: ApproverSelection]
  cancel: []
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val),
})

const approverMode = ref<'single' | 'individual'>('single')
const defaultApproverId = ref('')
const perRuleApproverIds = reactive<Record<string, string>>({})
const unknownResolutions = reactive<Record<string, string>>({})

// Reset state when dialog opens
watch(() => props.modelValue, (val) => {
  if (val) {
    approverMode.value = 'single'
    defaultApproverId.value = ''
    Object.keys(perRuleApproverIds).forEach(k => delete perRuleApproverIds[k])
    Object.keys(unknownResolutions).forEach(k => delete unknownResolutions[k])
  }
})

const isValid = computed(() => {
  if (approverMode.value === 'single') {
    return !!defaultApproverId.value
  }

  // Individual mode: every non-tighten conflict rule needs an approver
  return props.conflictRules.every((rule) => {
    if (rule.classification === 'UNKNOWN') {
      const resolution = unknownResolutions[rule.ruleId]
      if (!resolution) return false
      if (resolution === 'tighten') return true
      return !!perRuleApproverIds[rule.ruleId]
    }
    return !!perRuleApproverIds[rule.ruleId]
  })
})

function setPerRuleApprover(ruleId: string, approverId: string) {
  perRuleApproverIds[ruleId] = approverId
}

function setUnknownResolution(ruleId: string, resolution: string) {
  unknownResolutions[ruleId] = resolution
}

function handleConfirm() {
  emit('confirm', {
    approverMode: approverMode.value,
    defaultApproverId: defaultApproverId.value,
    perRuleApproverIds: { ...perRuleApproverIds },
    unknownResolutions: { ...unknownResolutions },
  })
  visible.value = false
}

function handleClose() {
  emit('cancel')
  visible.value = false
}
</script>

<style scoped>
.approver-mode {
  margin-bottom: 16px;
}

.mode-label {
  font-weight: 600;
  margin-right: 8px;
  color: #303133;
}

.single-approver {
  padding: 8px 0;
}

.approver-select {
  width: 100%;
}

.approver-priority {
  float: right;
  color: #909399;
  font-size: 12px;
}

.individual-approvers {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
}

.conflict-rule-row {
  padding: 10px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  background: #fafafa;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rule-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rule-path {
  font-size: 13px;
  color: #303133;
  font-family: monospace;
}

.unknown-resolution {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.resolution-label {
  font-size: 12px;
  color: #606266;
}
</style>
