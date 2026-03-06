<template>
  <div class="condition-tree-editor">
    <div class="tree-header">
      <div class="header-left">
        <h3>条件树编辑器</h3>
        <el-tag type="info" size="small" effect="plain">单击编辑 • 右击删除</el-tag>
      </div>
      <div class="header-actions">
        <el-button size="small" @click="expandAll">
          <el-icon><DCaret /></el-icon>
          展开全部
        </el-button>
        <el-button size="small" @click="collapseAll">
          <el-icon><CaretTop /></el-icon>
          折叠全部
        </el-button>
        <el-button size="small" type="primary" @click="showAddDialog">
          <el-icon><Plus /></el-icon>
          添加根条件
        </el-button>
      </div>
    </div>
    
    <div class="tree-content">
      <el-tree
        ref="treeRef"
        :data="treeData"
        :props="treeProps"
        node-key="id"
        :expand-on-click-node="false"
        :expanded-keys="expandedKeys"
        @node-click="handleNodeClick"
        @node-contextmenu="handleNodeContextMenu"
      >
        <template #default="{ node, data }">
          <div class="tree-node">
            <div class="node-content">
              <el-tag :type="getConditionTypeColor(data.type)" size="small">
                {{ getConditionTypeLabel(data.type) }}
              </el-tag>

              <span v-if="data.type === 'simple'" class="node-description">
                <span v-if="data.field" class="field-name">{{ getFieldDisplayName(data.field) }}</span>
                <span v-if="data.operator" class="operator">{{ getOperatorDisplayName(data.operator) }}</span>
                <template v-if="(data.operator === 'between' || data.operator === 'lengthBetween' || data.operator === 'utf8LengthBetween' || data.operator === 'dateBetween' || data.operator === 'timeBetween' || data.operator === 'dateTimeBetween') && data.min !== undefined && data.max !== undefined">
                  <span class="value">{{ data.min }} ~ {{ data.max }}</span>
                </template>
                <template v-else-if="data.value !== undefined && data.value !== null && data.value !== ''">
                  <span v-if="Array.isArray(data.value)" class="value">
                    {{ data.value.join(' ~ ') }}
                  </span>
                  <span v-else class="value">{{ data.value }}</span>
                </template>
              </span>

              <span v-if="data.type === 'if' && data.test" class="node-description">
                IF {{ data.test }}
              </span>

              <div v-if="data.errorCode || data.errorDescription || data.severity !== undefined" class="node-extra">
                <el-tag v-if="data.errorCode" type="danger" size="small" effect="plain">
                  {{ data.errorCode }}
                </el-tag>
                <span v-if="data.errorDescription" class="error-desc">{{ data.errorDescription }}</span>
                <el-tag v-if="data.severity !== undefined" type="warning" size="small" effect="plain">
                  {{ data.severity }}
                </el-tag>
              </div>
            </div>
          </div>
        </template>
      </el-tree>
    </div>
    
    <el-dialog
      v-model="editDialogVisible"
      :title="isEditing ? '编辑条件' : '添加条件'"
      width="700px"
      @close="handleDialogClose"
    >
      <el-form label-width="100px">
        <ConditionBuilder
          v-if="editDialogVisible"
          v-model="currentCondition"
          :hint-engine="hintEngine"
          @delete="handleConditionDelete"
        />
        
        <el-form-item label="错误码">
          <ErrorCodeSelector
            v-model="currentCondition.errorCode"
            :hint-engine="hintEngine"
            :related-field="currentCondition.field"
          />
        </el-form-item>
        
        <el-form-item label="错误描述">
          <el-input
            v-model="currentCondition.errorDescription"
            type="textarea"
            :rows="2"
            placeholder="错误描述，例如: 用户名不能为空"
          />
        </el-form-item>
        
        <el-form-item label="严重程度">
          <el-input-number
            v-model="currentCondition.severity"
            :min="0"
            :max="10"
            placeholder="0-10"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleDialogConfirm">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { DCaret, CaretTop, Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { HintEngine } from '../engines/hint-engine'
import ConditionBuilder from './ConditionBuilder.vue'
import ErrorCodeSelector from './ErrorCodeSelector.vue'
import type { ConditionNode } from '../types'

interface Props {
  modelValue: ConditionNode[]
  hintEngine: HintEngine
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: ConditionNode[]]
}>()

const treeRef = ref()
const expandedKeys = ref<string[]>([])
const editDialogVisible = ref(false)
const isEditing = ref(false)
const currentCondition = ref<ConditionNode>({
  id: '',
  type: 'simple'
})
const editingNodeId = ref<string>('')

const treeProps = {
  children: 'conditions',
  label: (data: any) => {
    // 如果有 id，直接返回
    if (data.id && data.id.startsWith('check')) {
      return data.id
    }
    // 否则根据条件类型生成描述
    if (data.type === 'simple') {
      const parts = []
      if (data.field) {
        parts.push(data.field)
      }
      if (data.operator) {
        parts.push(getOperatorDisplayName(data.operator))
      }
      if (data.value !== undefined) {
        parts.push(data.value)
      }
      return parts.join(' ') || '条件'
    }
    if (data.type === 'and') {
      return 'AND (且)'
    }
    if (data.type === 'or') {
      return 'OR (或)'
    }
    if (data.type === 'not') {
      return 'NOT (非)'
    }
    if (data.type === 'if') {
      return data.test || 'IF 条件'
    }
    return data.type || '条件'
  }
}

const treeData = computed(() => {
  // 检查 modelValue 是否是 checks 数组
  if (props.modelValue.length > 0 && props.modelValue[0].condition) {
    // 如果是 checks 数组，提取所有 condition
    const conditions: ConditionNode[] = []
    props.modelValue.forEach((check: any) => {
      if (check.condition) {
        // 将 check 的其他属性合并到 condition 中
        conditions.push({
          ...check.condition,
          errorCode: check.errorCode,
          errorDescription: check.errorDescription,
          severity: check.severity,
          checkId: check.id
        })
      }
    })
    return conditions
  }
  // 否则直接使用 modelValue
  return props.modelValue.map((condition, index) => ({
    ...condition,
    id: condition.id || `root-${index}`
  }))
})

watch(() => props.modelValue, (newVal) => {
  if (newVal && newVal.length > 0 && expandedKeys.value.length === 0) {
    const keys = extractIds(newVal)
    expandedKeys.value = keys
  }
}, { immediate: true, deep: true })

const extractIds = (conditions: ConditionNode[]): string[] => {
  const ids: string[] = []
  
  function traverse(nodes: ConditionNode[]) {
    nodes.forEach(node => {
      ids.push(node.id)
      if (node.conditions) {
        traverse(node.conditions)
      }
      if (node.then) {
        traverse([node.then])
      }
      if (node.else) {
        traverse([node.else])
      }
    })
  }
  
  traverse(conditions)
  return ids
}

const handleNodeClick = (data: any) => {
  console.log('Node clicked:', data)
  isEditing.value = true
  editingNodeId.value = data.id
  currentCondition.value = { ...data }
  editDialogVisible.value = true
}

const handleNodeContextMenu = (event: MouseEvent, data: any) => {
  event.preventDefault()
  console.log('Node right clicked:', data)
  ElMessageBox.confirm(
    '确定要删除此条件吗？',
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    const newConditions = removeConditionById(props.modelValue, data.id)
    emit('update:modelValue', newConditions)
    ElMessage.success('删除成功')
  }).catch(() => {})
}

const getConditionTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    'simple': '简单条件',
    'and': 'AND (且)',
    'or': 'OR (或)',
    'not': 'NOT (非)',
    'if': 'IF (条件判断)',
    'elif': 'ELIF (分支)',
    'else': 'ELSE (否则)'
  }
  
  return labels[type] || type
}

const getConditionTypeColor = (type: string): string => {
  const colors: Record<string, string> = {
    'simple': 'info',
    'and': 'success',
    'or': 'warning',
    'not': 'info',
    'if': 'primary',
    'elif': 'primary',
    'else': 'info'
  }
  
  return colors[type] || 'info'
}

const getFieldDisplayName = (fieldPath: string): string => {
  const field = props.hintEngine.parsePath(fieldPath)
  return field ? field.displayName : fieldPath
}

const getOperatorDisplayName = (operator: string): string => {
  const displayNames: Record<string, string> = {
    'eq': '==',
    'ne': '!=',
    'gt': '>',
    'ge': '>=',
    'lt': '<',
    'le': '<=',
    'contains': '包含',
    'startsWith': '以...开头',
    'endsWith': '以...结尾',
    'regex': '匹配',
    'between': '范围内',
    'isNull': '为空',
    'notNull': '不为空'
  }
  
  return displayNames[operator] || operator
}

const expandAll = () => {
  if (treeRef.value) {
    const keys = extractIds(treeData.value)
    keys.forEach(key => {
      const node = treeRef.value.store.nodesMap[key]
      if (node) {
        node.expand()
      }
    })
  }
}

const collapseAll = () => {
  if (treeRef.value) {
    const keys = extractIds(treeData.value)
    keys.forEach(key => {
      const node = treeRef.value.store.nodesMap[key]
      if (node) {
        node.collapse()
      }
    })
  }
}

const showAddDialog = () => {
  isEditing.value = false
  currentCondition.value = {
    id: `condition-${Date.now()}`,
    type: 'simple'
  }
  editDialogVisible.value = true
}

const removeConditionById = (conditions: ConditionNode[], id: string): ConditionNode[] => {
  return conditions.filter(condition => {
    if (condition.id === id) {
      return false
    }
    
    if (condition.conditions) {
      condition.conditions = removeConditionById(condition.conditions, id)
    }
    
    if (condition.then && condition.then.id === id) {
      condition.then = undefined
    }
    
    if (condition.else && condition.else.id === id) {
      condition.else = undefined
    }
    
    return true
  })
}

const handleDialogConfirm = () => {
  console.log('handleDialogConfirm - isEditing:', isEditing.value)
  console.log('handleDialogConfirm - editingNodeId:', editingNodeId.value)
  console.log('handleDialogConfirm - currentCondition:', currentCondition.value)
  console.log('handleDialogConfirm - modelValue:', props.modelValue)

  if (isEditing.value) {
    // 检查是否是 checks 数组格式
    if (props.modelValue.length > 0 && props.modelValue[0].condition) {
      // 如果是 checks 数组，需要更新对应的 check 对象
      const newChecks = props.modelValue.map((check: any) => {
        if (check.condition && check.condition.id === editingNodeId.value) {
          return {
            ...check,
            condition: { ...currentCondition.value }
          }
        }
        return check
      })
      console.log('handleDialogConfirm - newChecks:', newChecks)
      emit('update:modelValue', newChecks)
    } else {
      // 如果是普通的 conditions 数组
      const newConditions = updateConditionById(props.modelValue, editingNodeId.value, currentCondition.value)
      console.log('handleDialogConfirm - newConditions:', newConditions)
      emit('update:modelValue', newConditions)
    }
  } else {
    const newConditions = [...props.modelValue, currentCondition.value]
    emit('update:modelValue', newConditions)
  }

  editDialogVisible.value = false
}

const updateConditionById = (conditions: ConditionNode[], id: string, newCondition: ConditionNode): ConditionNode[] => {
  return conditions.map(condition => {
    if (condition.id === id) {
      return { ...newCondition }
    }

    // 递归处理子条件
    if (condition.conditions && condition.conditions.length > 0) {
      condition.conditions = updateConditionById(condition.conditions, id, newCondition)
    }

    // 处理 if/elif/else 的分支
    if (condition.then) {
      if (condition.then.id === id) {
        condition.then = { ...newCondition }
      } else if (condition.then.conditions) {
        condition.then.conditions = updateConditionById(condition.then.conditions, id, newCondition)
      }
    }

    if (condition.else) {
      if (condition.else.id === id) {
        condition.else = { ...newCondition }
      } else if (condition.else.conditions) {
        condition.else.conditions = updateConditionById(condition.else.conditions, id, newCondition)
      }
    }

    return condition
  })
}

const handleDialogClose = () => {}

const handleConditionDelete = () => {
  editDialogVisible.value = false
}

defineExpose({
  expandAll,
  collapseAll,
  getTreeData: () => treeData.value
})
</script>

<style scoped>
.condition-tree-editor {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #ffffff;
}

.tree-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #ebeef5;
  background: #fafafa;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tree-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.tree-content {
  flex: 1;
  overflow: auto;
  padding: 16px;
}

.tree-node {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 4px 8px;
  line-height: 26px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.tree-node:hover {
  background-color: #f5f7fa;
}

.node-content {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.node-description {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #606266;
  flex-wrap: nowrap;
}

.field-name {
  font-weight: 500;
  color: #303133;
  font-size: 12px;
}

.operator {
  font-family: 'Courier New', monospace;
  padding: 1px 4px;
  background: #f5f7fa;
  border-radius: 2px;
  color: #409eff;
  font-size: 11px;
}

.value {
  font-family: 'Courier New', monospace;
  color: #67c23a;
  background: #f0f9ff;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 11px;
}

.node-extra {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: nowrap;
  margin-left: 8px;
}

.error-desc {
  font-size: 11px;
  color: #f56c6c;
  font-style: normal;
}
</style>