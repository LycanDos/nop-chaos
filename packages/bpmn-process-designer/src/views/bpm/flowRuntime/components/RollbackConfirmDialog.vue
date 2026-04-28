<template>
  <el-dialog
    :model-value="visible"
    title="⚠️ 回退确认"
    width="560px"
    :close-on-click-modal="false"
    @update:model-value="$emit('update:visible', $event)"
    @close="handleClose"
  >
    <!-- 回退目标节点信息 -->
    <section class="rollback-dialog__section">
      <div class="rollback-dialog__target">
        <span class="rollback-dialog__label">回退目标：</span>
        <span class="rollback-dialog__target-name">
          {{ impactData?.targetNodeName || targetNodeId }}
        </span>
        <el-tag size="small" type="info">{{ targetNodeId }}</el-tag>
      </div>
    </section>

    <!-- 将撤销的节点列表 -->
    <section class="rollback-dialog__section" v-if="affectedNodes.length > 0">
      <h4 class="rollback-dialog__subtitle">
        将撤销以下 {{ affectedNodes.length }} 个节点：
      </h4>
      <div class="rollback-dialog__node-list">
        <div
          v-for="node in affectedNodes"
          :key="node.nodeId"
          class="rollback-dialog__node-item"
        >
          <span class="rollback-dialog__node-seq">{{ formatSeq(node.executionSeq) }}</span>
          <span class="rollback-dialog__node-name">{{ node.nodeName || node.nodeId }}</span>
          <!-- 可逆性图标和说明 -->
          <span v-if="node.rollbackType === 'REVERSIBLE'" class="rollback-tag rollback-tag--reversible">
            ✅ 可逆
          </span>
          <span v-else-if="node.rollbackType === 'COMPENSABLE'" class="rollback-tag rollback-tag--compensable">
            ⚠️ 有副作用（{{ node.hasCompensation ? '将执行补偿' : '无补偿方法' }}）
          </span>
          <span v-else class="rollback-tag rollback-tag--irreversible">
            🚫 不可逆{{ node.hasCompensation ? '（有补偿方法）' : '（无补偿方法）' }}
          </span>
        </div>
      </div>
    </section>

    <!-- 影响摘要 -->
    <section class="rollback-dialog__section">
      <h4 class="rollback-dialog__subtitle">📊 影响摘要：</h4>
      <ul class="rollback-dialog__summary">
        <li>
          有副作用节点：<strong>{{ impactData?.sideEffectCount || 0 }}</strong> 个
          <span v-if="impactData?.compensableCount">（{{ impactData.compensableCount }} 个有补偿方法）</span>
        </li>
        <li :class="{ 'text-danger': hasIrreversible }">
          不可逆节点：<strong>{{ impactData?.irreversibleCount || 0 }}</strong> 个
          <span v-if="hasIrreversible"> ⚠️</span>
        </li>
        <li>变量池将恢复到 <strong>{{ impactData?.targetNodeName || targetNodeId }}</strong> 执行后状态</li>
      </ul>
    </section>

    <!-- 不可逆节点强烈警告 -->
    <el-alert
      v-if="hasIrreversible"
      type="error"
      :closable="false"
      show-icon
      class="rollback-dialog__warning"
    >
      <template #title>
        存在不可逆节点，回退后无法撤销其影响！
      </template>
      <template #default>
        请确认已了解不可逆操作的后果。强制回退仅标记节点为已回退，不会撤销实际副作用。
      </template>
    </el-alert>

    <!-- 底部按钮 -->
    <template #footer>
      <div class="rollback-dialog__footer">
        <el-button @click="handleClose">取消</el-button>
        <!-- 有不可逆节点时：强制回退按钮（需二次确认） -->
        <template v-if="hasIrreversible">
          <el-popconfirm
            title="确定要强制回退吗？不可逆操作的影响无法撤销！"
            confirm-button-text="确定强制回退"
            cancel-button-text="再想想"
            confirm-button-type="danger"
            @confirm="handleForceConfirm"
          >
            <template #reference>
              <el-button type="danger" :loading="executing">
                ⚠️ 强制回退
              </el-button>
            </template>
          </el-popconfirm>
        </template>
        <!-- 全部可逆/可补偿时：普通确认按钮 -->
        <template v-else>
          <el-button type="primary" :loading="executing" @click="handleConfirm">
            确认回退
          </el-button>
        </template>
      </div>
    </template>
  </el-dialog>
</template>

<script lang="ts" setup>
/**
 * 回退确认对话框组件
 * 展示回退影响分析，确认后调用 executeRollback API
 */
import request from '@/config/axios'
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps<{
  /** 对话框可见性 */
  visible: boolean
  /** 流程实例 ID */
  processInstanceId: string
  /** 回退目标节点 ID */
  targetNodeId: string
  /** 回退影响分析数据（来自 analyzeRollbackImpact API） */
  impactData: any
}>()

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void
  (e: 'success'): void
}>()

/** 执行中状态 */
const executing = ref(false)

/** 受影响的节点列表 */
const affectedNodes = computed<any[]>(() => {
  return props.impactData?.affectedNodes || []
})

/** 是否存在不可逆节点 */
const hasIrreversible = computed(() => {
  return (props.impactData?.irreversibleCount || 0) > 0
})

/** 格式化执行序号为带圈数字 */
function formatSeq(seq: number | undefined): string {
  if (seq == null) return '?'
  // 带圈数字 ① ~ ⑳
  const circled = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳'
  if (seq >= 1 && seq <= 20) return circled[seq - 1]
  return `(${seq})`
}

/** 关闭对话框 */
function handleClose() {
  emit('update:visible', false)
}

/** 普通确认回退（无不可逆节点） */
async function handleConfirm() {
  await doExecuteRollback(false)
}

/** 强制回退确认（有不可逆节点，已通过二次确认） */
async function handleForceConfirm() {
  await doExecuteRollback(true)
}

/**
 * 调用 executeRollback API 执行回退
 * @param forceFlag - 是否强制回退
 */
async function doExecuteRollback(forceFlag: boolean) {
  executing.value = true
  try {
    const res = await request.post({
      url: '/graphql',
      data: {
        query: `mutation($processInstanceId: String!, $targetNodeId: String!, $forceFlag: Boolean!) {
          LProcessConsole__executeRollback(
            processInstanceId: $processInstanceId,
            targetNodeId: $targetNodeId,
            forceFlag: $forceFlag
          ) {
            success
            rolledBackNodeCount
            compensationExecutedCount
            variablesRestoredCount
            compensationResults {
              nodeId
              nodeName
              compensationMethodName
              status
              errorMessage
            }
            rollbackLogId
          }
        }`,
        variables: {
          processInstanceId: props.processInstanceId,
          targetNodeId: props.targetNodeId,
          forceFlag,
        },
      },
    })

    const result = res?.LProcessConsole__executeRollback
    if (result?.success) {
      ElMessage.success(
        `回退成功：撤销 ${result.rolledBackNodeCount} 个节点，执行 ${result.compensationExecutedCount} 个补偿，恢复 ${result.variablesRestoredCount} 个变量`,
      )
      emit('update:visible', false)
      emit('success')
    } else {
      ElMessage.error('回退操作未成功，请检查后重试')
    }
  } catch (err: any) {
    console.error('[RollbackConfirmDialog] 执行回退失败:', err)
    ElMessage.error(`回退失败：${err?.message || '未知错误'}`)
  } finally {
    executing.value = false
  }
}
</script>

<style scoped>
.rollback-dialog__section {
  margin-bottom: 16px;
}

.rollback-dialog__target {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.rollback-dialog__label {
  color: #606266;
}

.rollback-dialog__target-name {
  font-weight: 600;
  color: #303133;
  font-size: 15px;
}

.rollback-dialog__subtitle {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  margin: 0 0 8px 0;
}

.rollback-dialog__node-list {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 4px 0;
}

.rollback-dialog__node-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  font-size: 13px;
  border-bottom: 1px solid #f5f7fa;
}

.rollback-dialog__node-item:last-child {
  border-bottom: none;
}

.rollback-dialog__node-seq {
  color: #909399;
  font-size: 12px;
  flex-shrink: 0;
}

.rollback-dialog__node-name {
  flex: 1;
  color: #303133;
}

.rollback-tag {
  font-size: 12px;
  flex-shrink: 0;
}

.rollback-tag--reversible {
  color: #52c41a;
}

.rollback-tag--compensable {
  color: #faad14;
}

.rollback-tag--irreversible {
  color: #f5222d;
}

.rollback-dialog__summary {
  list-style: disc;
  padding-left: 20px;
  margin: 0;
  font-size: 13px;
  color: #606266;
  line-height: 2;
}

.rollback-dialog__summary .text-danger {
  color: #f5222d;
  font-weight: 500;
}

.rollback-dialog__warning {
  margin-bottom: 8px;
}

.rollback-dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
