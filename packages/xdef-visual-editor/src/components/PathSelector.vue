<template>
  <div class="path-selector">
    <el-tree-select
      ref="treeSelectRef"
      v-model="inputValue"
      :data="treeData"
      :props="treeProps"
      :placeholder="placeholder"
      :clearable="true"
      :filterable="true"
      :filter-node-method="filterNode"
      :render-after-expand="false"
      check-strictly
      @change="handleChange"
      @focus="handleFocus"
      @blur="handleBlur"
    >
      <template #default="{ node, data }">
        <div class="tree-node-content">
          <div class="node-header">
            <div class="node-main-info">
              <el-icon v-if="!node.isLeaf" class="node-icon">
                <Folder />
              </el-icon>
              <div class="node-names">
                <span v-if="node.isLeaf" class="node-field-name">{{ data.name }}</span>
                <span class="node-display-name">{{ data.displayName || data.label }}</span>
              </div>
            </div>
            <el-tag v-if="data.type" size="small" :type="getTypeTagColor(data.type)" class="node-type">
              {{ data.type }}
            </el-tag>
          </div>
        </div>
      </template>
    </el-tree-select>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { Folder } from '@element-plus/icons-vue'
import { HintEngine } from '../engines/hint-engine'
import type { FieldInfo } from '../types'

interface TreeNode {
  label: string
  value: string
  name: string
  path: string
  type?: string
  displayName?: string
  children?: TreeNode[]
}

interface Props {
  modelValue?: string | null
  placeholder?: string
  showPreview?: boolean
  showDescription?: boolean
  showCategory?: boolean
  hintEngine: HintEngine
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '选择字段...',
  showPreview: true,
  showDescription: true,
  showCategory: true,
  modelValue: ''
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'select': [field: FieldInfo]
  'change': [value: string]
  'focus': []
  'blur': []
}>()

const treeSelectRef = ref()
const inputValue = ref(props.modelValue)
const selectedField = ref<FieldInfo | null>(null)
const treeData = ref<TreeNode[]>([])

const treeProps = {
  label: 'label',
  value: 'value',
  children: 'children'
}

// 根据类型返回标签颜色
const getTypeTagColor = (type: string): 'success' | 'warning' | 'info' | 'danger' | 'primary' => {
  const typeMap: Record<string, 'success' | 'warning' | 'info' | 'danger' | 'primary'> = {
    'string': 'primary',
    'String': 'primary',
    'int': 'success',
    'Integer': 'success',
    'long': 'success',
    'Long': 'success',
    'boolean': 'danger',
    'Boolean': 'danger',
    'date': 'warning',
    'Date': 'warning',
    'datetime': 'warning',
    'DateTime': 'warning',
    'decimal': 'info',
    'Decimal': 'info',
    'double': 'info',
    'Double': 'info',
    'float': 'info',
    'Float': 'info'
  }
  return typeMap[type] || 'info'
}

// 树节点过滤方法
const filterNode = (value: string, data: TreeNode) => {
  if (!value) return true
  const lowerValue = value.toLowerCase()
  
  // 支持多属性搜索：搜索属性名、中文名、路径
  return data.name.toLowerCase().includes(lowerValue) ||
         (data.displayName && data.displayName.toLowerCase().includes(lowerValue)) ||
         data.path.toLowerCase().includes(lowerValue)
}

// 将字段列表转换为树形结构
const buildTreeData = (fields: FieldInfo[]): TreeNode[] => {
  const treeMap = new Map<string, TreeNode>()
  const rootNodes: TreeNode[] = []

  // 首先创建所有节点
  fields.forEach(field => {
    const parts = field.path.split('.')
    let currentPath = ''

    parts.forEach((part, index) => {
      currentPath = currentPath ? `${currentPath}.${part}` : part
      const nodeValue = currentPath

      if (!treeMap.has(nodeValue)) {
        const isLeaf = index === parts.length - 1
        const isRoot = index === 0

        let nodeLabel: string
        let nodeDisplayName: string
        let nodeType: string | undefined

        if (isLeaf) {
          // 叶子节点：字段 - label 显示 "路径(中文名) 类型"
          nodeLabel = `${field.path}(${field.displayName || part}) [${field.type}]`
          nodeDisplayName = field.displayName || part
          nodeType = field.type
        } else if (isRoot) {
          // 根节点：实体
          nodeDisplayName = part
          nodeLabel = part
        } else {
          // 中间节点
          nodeDisplayName = part
          nodeLabel = part
        }

        const node: TreeNode = {
          label: nodeLabel,
          value: nodeValue,
          name: part,
          path: currentPath,
          type: nodeType,
          displayName: nodeDisplayName,
          children: isLeaf ? undefined : []
        }
        treeMap.set(nodeValue, node)

        // 如果是根节点，添加到根节点列表
        if (index === 0) {
          rootNodes.push(node)
        } else {
          // 否则找到父节点并添加
          const parentPath = parts.slice(0, index).join('.')
          const parentNode = treeMap.get(parentPath)
          if (parentNode && parentNode.children) {
            parentNode.children.push(node)
          }
        }
      }
    })
  })

  return rootNodes
}

const loadTreeData = () => {
  const allFields = props.hintEngine.getAllFields?.() || []
  console.log('加载字段数据:', allFields)
  treeData.value = buildTreeData(allFields)
  console.log('构建的树形数据:', treeData.value)
}

const handleChange = (value: string) => {
  const field = props.hintEngine.parsePath(value)
  if (field) {
    selectedField.value = field
    props.hintEngine.addToRecent(field)
    emit('update:modelValue', value)
    emit('select', field)
    emit('change', value)
  }
}

const handleFocus = () => {
  emit('focus')
}

const handleBlur = () => {
  emit('blur')
}

// 监听外部值变化
watch(() => props.modelValue, (newVal) => {
  const field = props.hintEngine.parsePath(newVal)
  if (field) {
    selectedField.value = field
  } else {
    selectedField.value = null
  }
  if (newVal !== inputValue.value) {
    inputValue.value = newVal || ''
  }
})

// 初始化
onMounted(() => {
  loadTreeData()
  if (props.modelValue) {
    const field = props.hintEngine.parsePath(props.modelValue)
    if (field) {
      selectedField.value = field
      inputValue.value = props.modelValue
    }
  }
})

// 暴露方法
defineExpose({
  focus: () => {
    treeSelectRef.value?.focus()
  },
  blur: () => {
    treeSelectRef.value?.blur()
  },
  getSelectedField: () => selectedField.value
})
</script>

<style scoped>
.path-selector {
  width: 100%;
}

.path-selector :deep(.el-tree-select) {
  width: 100%;
}

/* 树节点内容容器 */
.tree-node-content {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 2px 6px;
  min-width: 280px;
}

/* 节点头部 */
.node-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 6px;
}

.node-main-info {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

/* 节点图标 */
.node-icon {
  font-size: 14px;
  color: #909399;
  flex-shrink: 0;
}

/* 节点名称容器 */
.node-names {
  display: flex;
  align-items: baseline;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

/* 属性名 */
.node-field-name {
  font-size: 11px;
  color: #909399;
  font-family: 'Monaco', 'Menlo', 'Courier New', 'Consolas', monospace;
  background-color: #f5f7fa;
  padding: 1px 4px;
  border-radius: 2px;
  flex-shrink: 0;
  line-height: 1.3;
}

/* 中文名称 */
.node-display-name {
  font-weight: 500;
  font-size: 12px;
  color: #303133;
  flex-shrink: 0;
  line-height: 1.3;
}

/* 类型标签 */
.node-type {
  font-size: 10px;
  padding: 1px 6px;
  height: 18px;
  line-height: 16px;
  border-radius: 3px;
  font-weight: 500;
  flex-shrink: 0;
  letter-spacing: 0.1px;
}

/* 树节点样式优化 */
.path-selector :deep(.el-tree-node__content) {
  height: auto;
  padding: 1px 4px;
  align-items: flex-start;
  border-radius: 3px;
  transition: all 0.2s ease;
  line-height: 1.3;
}

.path-selector :deep(.el-tree-node__content:hover) {
  background-color: #f5f7fa;
}

.path-selector :deep(.el-tree-node__content.is-current) {
  background-color: #ecf5ff;
}

.path-selector :deep(.el-tree-node__label) {
  width: 100%;
}

.path-selector :deep(.el-tree-node__children) {
  padding-left: 18px;
}

/* 确保自定义模板正确显示 */
.path-selector :deep(.el-tree-select__popper) {
  max-height: 420px;
  padding: 6px 0;
}

/* 确保选项内容不被截断 */
.path-selector :deep(.el-tree-select__dropdown-item) {
  width: 100%;
}

/* 优化下拉面板样式 */
.path-selector :deep(.el-tree-select__dropdown-wrap) {
  max-height: 420px;
}

/* 优化滚动条样式 */
.path-selector :deep(.el-scrollbar__wrap) {
  max-height: 420px;
}

.path-selector :deep(.el-scrollbar__bar) {
  opacity: 0.3;
}

.path-selector :deep(.el-scrollbar__bar:hover) {
  opacity: 0.8;
}
</style>