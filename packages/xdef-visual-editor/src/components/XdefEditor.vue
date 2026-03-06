<template>
  <div class="xdef-editor">
    <div class="editor-header">
      <div class="header-left">
        <h2>Xdef 可视化编辑器</h2>
        <el-tag v-if="metadata" type="info">{{ metadata.name }}</el-tag>
      </div>
      <div class="header-actions">
        <el-button @click="loadExample" :icon="Document">
          加载示例
        </el-button>
        <el-button @click="clearAll" :icon="Delete">
          清空
        </el-button>
        <el-button type="primary" @click="exportXml" :icon="Download">
          导出 XML
        </el-button>
        <el-button type="success" @click="exportJson" :icon="Document">
          导出 JSON
        </el-button>
      </div>
    </div>

    <div class="editor-content">
      <!-- 左侧：表单编辑区 -->
      <div class="editor-form" ref="formContainerRef" :style="{ width: leftPanelWidth }">
        <el-tabs v-model="activeTab">
          <el-tab-pane label="表单编辑" name="form">
            <div class="form-section">
              <h3>检查规则</h3>
              <div class="check-list">
                <div
                  v-for="(check, index) in formData.checks"
                  :key="check.id"
                  class="check-item"
                  :class="{ 'check-item-active': activeCheckIndex === index }"
                  @click="selectCheck(index)"
                >
                  <div class="check-header">
                    <div class="check-title-group">
                      <div v-if="editingCheckId === index" class="check-id-edit">
                        <el-input
                          v-model="check.id"
                          placeholder="规则ID"
                          size="small"
                          @blur="finishEditCheckId"
                          @keyup.enter="finishEditCheckId"
                          ref="checkIdInputRef"
                          style="width: 200px;"
                        />
                      </div>
                      <template v-else>
                        <span class="check-title">{{ check.id || `规则 ${index + 1}` }}</span>
                        <el-button
                          type="primary"
                          size="small"
                          text
                          :icon="Edit"
                          @click.stop="startEditCheckId(index)"
                        >
                          编辑
                        </el-button>
                      </template>
                    </div>
                    <el-button
                      type="danger"
                      size="small"
                      text
                      :icon="Delete"
                      @click.stop="removeCheck(index)"
                    >
                      删除
                    </el-button>
                  </div>

                  <div class="check-body">
                    <el-form :model="check" label-width="80px" size="small">
                      <!-- 第一行：错误码、严重程度 -->
                      <el-row :gutter="8">
                        <el-col :span="12">
                          <el-form-item
                            label="错误码"
                            label-width="70px"
                            :class="{ 'field-highlight': highlightSource === 'right' && activeCheckIndex === index && activeField?.field === 'errorCode' }"
                          >
                            <ErrorCodeSelector
                              :ref="el => setInputRef(el, index, 'errorCode')"
                              v-model="check.errorCode"
                              :hint-engine="hintEngine"
                              :related-field="check.condition?.field"
                              @focus="selectField('errorCode', index)"
                            />
                          </el-form-item>
                        </el-col>
                        <el-col :span="12">
                          <el-form-item
                            label="严重程度"
                            label-width="70px"
                            :class="{ 'field-highlight': highlightSource === 'right' && activeCheckIndex === index && activeField?.field === 'severity' }"
                          >
                            <el-input-number
                              v-model="check.severity"
                              :min="0"
                              :max="10"
                              placeholder="0-10"
                              @focus="selectField('severity', index)"
                            />
                          </el-form-item>
                        </el-col>
                      </el-row>

                      <!-- 第二行：错误描述 -->
                      <el-form-item 
                        label="错误描述" 
                        label-width="70px"
                        :class="{ 'field-highlight': highlightSource === 'right' && activeCheckIndex === index && activeField?.field === 'errorDescription' }"
                      >
                        <el-input
                          v-model="check.errorDescription"
                          type="textarea"
                          :rows="2"
                          placeholder="例如: 密码长度必须至少6位"
                          @focus="selectField('errorDescription', index)"
                        />
                      </el-form-item>

                      <!-- 第三行：校验条件 -->
                      <el-form-item 
                        label="校验条件" 
                        label-width="70px"
                        :class="{ 'field-highlight': highlightSource === 'right' && activeCheckIndex === index && activeField?.field === 'condition' }"
                      >
                        <ConditionBuilder
                          v-model="check.condition"
                          :hint-engine="hintEngine"
                          @delete="() => {}"
                          @field-focus="(field) => selectField(field, index)"
                        />
                      </el-form-item>
                    </el-form>
                  </div>
                </div>

                <el-empty
                  v-if="formData.checks.length === 0"
                  description="暂无检查规则，请点击下方按钮添加"
                  :image-size="80"
                />

                <el-button
                  type="primary"
                  :icon="Plus"
                  @click="addCheck"
                  style="width: 100%; margin-top: 16px;"
                >
                  添加检查规则
                </el-button>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="条件树" name="tree">
            <ConditionTreeEditor
              v-model="formData.checks"
              :hint-engine="hintEngine"
            />
          </el-tab-pane>
        </el-tabs>
      </div>

      <!-- 拖拽分隔条 -->
      <div
        class="resizer"
        @mousedown="startResize"
        @dblclick="resetResize"
      >
        <div class="resizer-handle"></div>
      </div>

      <!-- 右侧：XML 编辑器 -->
      <div class="editor-preview" :style="{ width: rightPanelWidth }">
        <div class="preview-header">
          <h3>XML 编辑器</h3>
          <div class="header-actions">
            <el-button size="small" @click="copyXml" :icon="CopyDocument">
              复制
            </el-button>
          </div>
        </div>
        <div class="preview-content">
          <CodeMirrorXmlEditor
            ref="xmlEditorRef"
            v-model="xmlContent"
            :active-check-id="activeCheckId"
            :active-field="activeField?.field"
            :show-highlight="true"
            :highlight-source="highlightSource"
            placeholder="在此编辑 XML..."
            @click-position="handleEditorClick"
            @trigger-highlight="handleTriggerHighlight"
          />
        </div>
      </div>
    </div>

    <!-- 导出对话框 -->
    <el-dialog
      v-model="exportDialogVisible"
      title="导出 XML"
      width="800px"
    >
      <el-input
        v-model="exportedXml"
        type="textarea"
        :rows="20"
        readonly
      />
      <template #footer>
        <el-button @click="exportDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="copyExportedXml">复制</el-button>
        <el-button type="success" @click="downloadXml">下载</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import * as cheerio from 'cheerio'
import { ElMessage } from 'element-plus'
import {
  Document,
  Delete,
  Download,
  Plus,
  CopyDocument,
  Edit
} from '@element-plus/icons-vue'
import { EnhancedXdefParser } from '../parsers/enhanced-xdef-parser'
import { FieldMappingLoader } from '../loaders/field-mapping-loader'
import { HintEngine } from '../engines/hint-engine'
import { ExportEngine } from '../engines/export-engine'
import { FormGenerator } from '../generators/form-generator'
import ErrorCodeSelector from './ErrorCodeSelector.vue'
import ConditionBuilder from './ConditionBuilder.vue'
import ConditionTreeEditor from './ConditionTreeEditor.vue'
import CodeMirrorXmlEditor from './CodeMirrorXmlEditor.vue'
import type { XdefMetadata, FormData, CheckData, ConditionNode } from '../types'

interface Props {
  xdefPath?: string
  fieldMappingPath?: string
}

const props = withDefaults(defineProps<Props>(), {
  xdefPath: '',
  fieldMappingPath: ''
})

const emit = defineEmits<{
  'export': [xml: string]
  'change': [data: FormData]
  'trigger-highlight': []
}>()

// 核心引擎
const parser = new EnhancedXdefParser()
const fieldMappingLoader = new FieldMappingLoader()
const hintEngine = ref<HintEngine>(new HintEngine(fieldMappingLoader.createDefaultMapping()))
const exportEngine = new ExportEngine()
const formGenerator = new FormGenerator()

// 数据
const metadata = ref<XdefMetadata | null>(null)
const formData = ref<FormData>({ checks: [] })
const activeTab = ref('form')
const activeCheckIndex = ref<number>(-1)
const activeCheckId = ref<string | null>(null)
const activeField = ref<{ checkId: string; field: string } | null>(null)
const editingCheckId = ref<number>(-1)
const checkIdInputRef = ref<InstanceType<typeof HTMLInputElement> | null>(null)
const highlightSource = ref<'left' | 'right' | null>(null)
const exportDialogVisible = ref(false)
const exportedXml = ref('')
const xmlContent = ref('')

// 面板宽度控制
const leftPanelWidth = ref('50%')
const rightPanelWidth = ref('50%')
const isResizing = ref(false)
const startX = ref(0)
const startLeftWidth = ref(0)

// 表单容器引用
const formContainerRef = ref<HTMLElement | null>(null)

// XML 编辑器引用
const xmlEditorRef = ref<any>(null)

// 输入框引用存储
const inputRefs = ref<Map<string, HTMLElement>>(new Map())

// 设置输入框引用
const setInputRef = (el: any, index: number, field: string) => {
  if (el) {
    const key = `${index}-${field}`
    inputRefs.value.set(key, el)
    console.log('设置输入框引用:', key, '元素:', el)
  }
}

// 获取输入框引用
const getInputRef = (index: number, field: string): HTMLElement | null => {
  const key = `${index}-${field}`
  const ref = inputRefs.value.get(key)
  console.log('获取输入框引用:', key, '结果:', ref)
  return ref || null
}

// 聚焦到输入框
const focusInput = (index: number, field: string) => {
  console.log('=== focusInput 被调用 ===')
  console.log('index:', index, 'field:', field)
  
  const inputEl = getInputRef(index, field)
  console.log('获取到的 inputEl:', inputEl)
  console.log('inputEl 类型:', typeof inputEl)
  console.log('inputEl.$el:', inputEl?.$el)
  console.log('inputEl.$refs:', inputEl?.$refs)
  
  if (inputEl) {
    // 查找实际的 input 元素
    let actualInput = null
    
    // 如果是 Vue 组件实例，尝试获取其 DOM 元素
    if (inputEl.$el) {
      console.log('是 Vue 组件，使用 $el')
      actualInput = inputEl.$el.querySelector('input') || inputEl.$el.querySelector('textarea')
    } else if (typeof inputEl.querySelector === 'function') {
      console.log('是 DOM 元素，直接使用 querySelector')
      actualInput = inputEl.querySelector('input') || inputEl.querySelector('textarea')
    } else {
      console.log('尝试其他方式获取 input')
      // 可能是 el-input 的内部结构
      if (inputEl.input) {
        actualInput = inputEl.input
      } else if (inputEl.textarea) {
        actualInput = inputEl.textarea
      }
    }
    
    console.log('找到的 actualInput:', actualInput)
    
    if (actualInput) {
      actualInput.focus()
      console.log('成功聚焦到输入框:', field)
    } else {
      console.log('未找到 input 或 textarea 元素')
    }
  } else {
    console.log('未找到输入框引用')
  }
}

// 生成的 XML
const generatedXml = computed(() => {
  if (formData.value.checks.length === 0) {
    return '<!-- 暂无检查规则 -->'
  }
  return exportEngine.exportToXml(formData.value, { pretty: true, indent: '  ' })
})

// 解析条件节点（保留用于其他可能的用途）
const parseConditionNode = (element: Element): ConditionNode => {
  if (!element) {
    return { id: '', type: 'simple' }
  }
  
  const tagName = element.tagName
  
  // 处理简单条件
  if (['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'contains', 'startsWith', 'endsWith', 'regex', 
      'isNull', 'notNull', 'isEmpty', 'notEmpty', 'isBlank', 'notBlank', 'isTrue', 'notTrue', 
      'isFalse', 'notFalse', 'in', 'notIn'].includes(tagName)) {
    return {
      id: `cond-${Date.now()}`,
      type: 'simple',
      operator: tagName,
      field: element.getAttribute('name'),
      value: element.getAttribute('value'),
      min: element.getAttribute('min'),
      max: element.getAttribute('max'),
      pattern: element.getAttribute('pattern')
    }
  }
  
  // 处理组合条件
  if (tagName === 'and' || tagName === 'or' || tagName === 'not') {
    const conditions: ConditionNode[] = []
    element.querySelectorAll(':scope > *').forEach(child => {
      conditions.push(parseConditionNode(child))
    })
    
    return {
      id: `cond-${Date.now()}`,
      type: tagName,
      conditions
    }
  }
  
  // 处理 if 条件
  if (tagName === 'if') {
    const test = element.getAttribute('test')
    const thenEl = element.querySelector('then > *')
    const elseEl = element.querySelector('else > *')
    
    return {
      id: `cond-${Date.now()}`,
      type: 'if',
      test,
      then: thenEl ? parseConditionNode(thenEl) : undefined,
      else: elseEl ? parseConditionNode(elseEl) : undefined
    }
  }
  
  return { id: `cond-${Date.now()}`, type: 'simple' }
}

// 初始化
onMounted(async () => {
  await initialize()
})

// 初始化编辑器
const initialize = async () => {
  try {
    // 1. 加载字段映射
    let fieldMapping
    if (props.fieldMappingPath) {
      fieldMapping = await fieldMappingLoader.loadFromConfig(props.fieldMappingPath)
    } else {
      fieldMapping = fieldMappingLoader.createDefaultMapping()
      fieldMappingLoader.addSampleData(fieldMapping)
    }

    // 2. 设置提示引擎
    hintEngine.value = new HintEngine(fieldMapping)

    // 3. 解析 Xdef
    if (props.xdefPath) {
      metadata.value = await parser.parse(props.xdefPath)
    }

    // 4. 加载示例数据
    loadExample()

    ElMessage.success('编辑器初始化成功')
  } catch (error) {
    console.error('初始化失败:', error)
    ElMessage.error('编辑器初始化失败')
  }
}

// 加载示例
const loadExample = () => {
  formData.value = {
    checks: [
      {
        id: 'checkUsername',
        condition: {
          id: 'cond-1',
          type: 'simple',
          field: 'User.username',
          operator: 'notNull'
        },
        errorCode: 'validation.required',
        errorDescription: '用户名不能为空',
        severity: 5
      },
      {
        id: 'checkPassword',
        condition: {
          id: 'cond-2',
          type: 'simple',
          field: 'User.password',
          operator: 'lengthBetween',
          min: 6,
          max: 20
        },
        errorCode: 'validation.length',
        errorDescription: '密码长度必须在6-20位之间',
        severity: 5
      },
      {
        id: 'checkOrder',
        condition: {
          id: 'cond-3',
          type: 'and',
          conditions: [
            {
              id: 'cond-3-1',
              type: 'simple',
              field: 'Order.qty',
              operator: 'gt',
              value: 0
            },
            {
              id: 'cond-3-2',
              type: 'simple',
              field: 'Order.total',
              operator: 'gt',
              value: 0
            }
          ]
        },
        errorCode: 'validation.invalid',
        errorDescription: '订单数量和总额都必须大于0',
        severity: 3
      }
    ]
  }
}

// 清空所有
const clearAll = () => {
  formData.value = { checks: [] }
}

// 添加检查规则
const addCheck = () => {
  const newCheck: CheckData = {
    id: `check-${Date.now()}`,
    condition: {
      id: `condition-${Date.now()}`,
      type: 'simple'
    }
  }
  formData.value.checks.push(newCheck)
}

// 移除检查规则
const removeCheck = (index: number) => {
  formData.value.checks.splice(index, 1)
  // 如果移除的是当前选中的规则，取消选中
  if (activeCheckIndex.value === index) {
    activeCheckIndex.value = -1
  } else if (activeCheckIndex.value > index) {
    activeCheckIndex.value--
  }
}

// 选择检查规则
const selectCheck = (index: number, clearFieldHighlight = true) => {
  if (activeCheckIndex.value === index) {
    return // 避免重复设置
  }
  activeCheckIndex.value = index

  // 只有在需要时才清空字段高亮
  if (clearFieldHighlight) {
    activeField.value = null
    activeCheckId.value = null
  }

  // 设置 activeCheckId
  if (index >= 0 && index < formData.value.checks.length) {
    const check = formData.value.checks[index]
    if (check && check.id) {
      activeCheckId.value = check.id
    }
  }
}

const startEditCheckId = (index: number) => {
  editingCheckId.value = index

  // 激活编辑时，高亮右侧XML中的规则ID
  if (index >= 0 && index < formData.value.checks.length) {
    selectField('id', index)
  }

  nextTick(() => {
    if (checkIdInputRef.value) {
      checkIdInputRef.value.focus()
    }
  })
}

const finishEditCheckId = () => {
  editingCheckId.value = -1
}

// 选中字段
const selectField = (field: string, index?: number) => {
  console.log('=== selectField 被调用 ===')
  console.log('field:', field)
  console.log('index:', index)
  console.log('activeCheckIndex.value:', activeCheckIndex.value)
  console.log('formData.value.checks.length:', formData.value.checks.length)

  // 设置高亮来源为左侧（表单编辑触发）
  highlightSource.value = 'left'
  console.log('设置 highlightSource = left')

  // 如果提供了 index，先选中这个 check（不清空字段高亮）
  if (index !== undefined && index >= 0 && index < formData.value.checks.length) {
    console.log('自动选中 check:', index)
    selectCheck(index, false) // 不清空字段高亮
  }

  // 使用当前选中的 check index
  const checkIndex = activeCheckIndex.value
  if (checkIndex >= 0 && checkIndex < formData.value.checks.length) {
    const check = formData.value.checks[checkIndex]
    console.log('找到 check:', check)
    if (check && check.id) {
      activeField.value = { checkId: check.id, field }
      activeCheckId.value = check.id
      console.log('选中字段:', activeField.value)
      console.log('activeCheckId.value:', activeCheckId.value)
      console.log('activeField.value?.field:', activeField.value?.field)
      console.log('准备传递给 CodeMirrorXmlEditor 的 props:', {
        activeCheckId: activeCheckId.value,
        activeField: activeField.value?.field
      })
    }
  } else {
    console.log('没有选中的 check，跳过')
  }
}

// 清除字段高亮
const clearFieldHighlight = () => {
  activeField.value = null
  activeCheckId.value = null
}

// 处理触发高亮事件
const handleTriggerHighlight = () => {
  console.log('=== handleTriggerHighlight 被调用 ===')
  console.log('xmlEditorRef.value:', xmlEditorRef.value)

  if (xmlEditorRef.value && xmlEditorRef.value.triggerHighlight) {
    console.log('调用 triggerHighlight 方法')
    xmlEditorRef.value.triggerHighlight()
  } else {
    console.log('xmlEditorRef.value 或 triggerHighlight 方法不存在')
  }
}

// 处理 XML 编辑器点击
const handleEditorClick = (position: { line: number; text: string; checkId?: string; offsetInLine?: number }) => {
  console.log('=== handleEditorClick 被调用 ===')
  console.log('点击位置:', JSON.stringify(position))
  console.log('xmlContent 前100字符:', xmlContent.value.substring(0, 100))
  console.log('formData.checks:', formData.value.checks)

  // 设置高亮来源为右侧（点击触发）
  highlightSource.value = 'right'
  console.log('设置 highlightSource = right')

  const { line, text, checkId, offsetInLine } = position

  // 如果点击的是 check 标签，找到对应的 check 并选中
  if (checkId) {
    console.log('检测到 checkId:', checkId)
    const checkIndex = formData.value.checks.findIndex(c => c.id === checkId)
    console.log('查找结果 checkIndex:', checkIndex)
    if (checkIndex !== -1) {
      console.log('选中 check:', checkIndex)
      // 直接设置 activeCheckIndex，不调用 selectCheck
      if (activeCheckIndex.value !== checkIndex) {
        activeCheckIndex.value = checkIndex
      }

      // 设置 activeCheckId
      const check = formData.value.checks[checkIndex]
      if (check && check.id) {
        activeCheckId.value = check.id
      }

      // 根据点击位置识别对应的属性
      let clickedField = null

      if (offsetInLine !== undefined) {
        console.log('根据点击位置识别属性，offsetInLine:', offsetInLine)

        // 解析行文本中所有属性的位置
        const attrPattern = /(\w+)="([^"]*)"/g
        let match
        const attrs = []

        while ((match = attrPattern.exec(text)) !== null) {
          attrs.push({
            name: match[1],
            value: match[2],
            start: match.index,
            end: match.index + match[0].length
          })
        }

        console.log('找到的属性:', attrs)

        // 找到点击位置所在的属性
        for (const attr of attrs) {
          if (offsetInLine >= attr.start && offsetInLine <= attr.end) {
            clickedField = attr.name
            console.log('点击的属性:', clickedField)
            break
          }
        }

        // 如果没有点击到任何属性，默认使用第一个属性
        if (!clickedField && attrs.length > 0) {
          clickedField = attrs[0].name
          console.log('未点击到具体属性，使用第一个属性:', clickedField)
        }
      } else {
        // 如果没有 offsetInLine，使用旧的逻辑（找到第一个属性）
        const fieldMatch = text.match(/(\w+)="([^"]*)"/)
        if (fieldMatch) {
          clickedField = fieldMatch[1]
          console.log('使用旧逻辑识别到的属性:', clickedField)
        }
      }

      if (clickedField) {
        // 字段名映射
        const fieldMapping: Record<string, string> = {
          'id': 'id',
          'errorCode': 'errorCode',
          'errorDescription': 'errorDescription',
          'severity': 'severity',
          'name': 'name',
          'value': 'value',
          'min': 'min',
          'max': 'max',
          'pattern': 'pattern'
        }

        const mappedField = fieldMapping[clickedField]
        console.log('映射字段:', mappedField)
        if (mappedField) {
          console.log('直接设置 activeField:', mappedField)
          // 直接设置 activeField，不调用 selectField
          activeField.value = { checkId: check.id, field: mappedField }
        }
      }
    } else {
      console.log('未找到对应的 check')
    }
  } else {
    console.log('没有 checkId，需要向上查找')
    // 检查是否在某个 check 内部
    // 需要向上查找最近的 check 标签
    let foundCheck = false
    for (let i = line - 1; i >= 0; i--) {
      const lineText = xmlContent.value.split('\n')[i]
      console.log(`检查行 ${i}:`, lineText)
      const match = lineText.match(/<check[^>]*id="([^"]*)"/)
      if (match) {
        const matchedCheckId = match[1]
        console.log('匹配到 check ID:', matchedCheckId)
        const checkIndex = formData.value.checks.findIndex(c => c.id === matchedCheckId)
        console.log('查找结果 checkIndex:', checkIndex)
        if (checkIndex !== -1) {
          console.log('找到包含的 check:', matchedCheckId, '索引:', checkIndex)
          // 直接设置 activeCheckIndex
          if (activeCheckIndex.value !== checkIndex) {
            activeCheckIndex.value = checkIndex
          }

          // 设置 activeCheckId
          const check = formData.value.checks[checkIndex]
          if (check && check.id) {
            activeCheckId.value = check.id
          }

          foundCheck = true

          // 根据点击位置识别对应的属性
          let clickedField = null

          if (offsetInLine !== undefined) {
            console.log('根据点击位置识别属性，offsetInLine:', offsetInLine)

            // 解析行文本中所有属性的位置
            const attrPattern = /(\w+)="([^"]*)"/g
            let match
            const attrs = []

            while ((match = attrPattern.exec(text)) !== null) {
              attrs.push({
                name: match[1],
                value: match[2],
                start: match.index,
                end: match.index + match[0].length
              })
            }

            console.log('找到的属性:', attrs)

            // 找到点击位置所在的属性
            for (const attr of attrs) {
              if (offsetInLine >= attr.start && offsetInLine <= attr.end) {
                clickedField = attr.name
                console.log('点击的属性:', clickedField)
                break
              }
            }

            // 如果没有点击到任何属性，默认使用第一个属性
            if (!clickedField && attrs.length > 0) {
              clickedField = attrs[0].name
              console.log('未点击到具体属性，使用第一个属性:', clickedField)
            }
          } else {
            // 如果没有 offsetInLine，使用旧的逻辑
            const fieldMatch = text.match(/(\w+)="([^"]*)"/)
            if (fieldMatch) {
              clickedField = fieldMatch[1]
              console.log('使用旧逻辑识别到的属性:', clickedField)
            }
          }

          if (clickedField) {
            // 字段名映射
            const fieldMapping: Record<string, string> = {
              'id': 'id',
              'errorCode': 'errorCode',
              'errorDescription': 'errorDescription',
              'severity': 'severity',
              'name': 'name',
              'value': 'value',
              'min': 'min',
              'max': 'max',
              'pattern': 'pattern'
            }

            const mappedField = fieldMapping[clickedField]
            console.log('映射字段:', mappedField)
            if (mappedField) {
              console.log('直接设置 activeField:', mappedField)
              // 直接设置 activeField
              activeField.value = { checkId: check.id, field: mappedField }
            }
          }
          break
        }
      }
      // 如果遇到结束标签，停止查找
      if (lineText.trim().startsWith('</check>')) {
        console.log('遇到结束标签，停止查找')
        break
      }
    }

    if (!foundCheck) {
      console.log('未找到对应的 check')
    }
  }
}

// 开始拖拽调整宽度
const startResize = (e: MouseEvent) => {
  isResizing.value = true
  startX.value = e.clientX

  // 获取左侧面板的实际宽度（像素）
  const leftPanel = document.querySelector('.editor-form') as HTMLElement
  startLeftWidth.value = leftPanel.offsetWidth

  // 添加全局事件监听
  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', stopResize)

  // 防止文本选择
  document.body.style.userSelect = 'none'
  document.body.style.cursor = 'col-resize'
}

// 拖拽中
const onResize = (e: MouseEvent) => {
  if (!isResizing.value) return

  const deltaX = e.clientX - startX.value
  const containerWidth = (document.querySelector('.editor-content') as HTMLElement).offsetWidth
  const newLeftWidth = startLeftWidth.value + deltaX

  // 限制最小宽度（20% - 80%）
  const minWidth = containerWidth * 0.2
  const maxWidth = containerWidth * 0.8

  if (newLeftWidth >= minWidth && newLeftWidth <= maxWidth) {
    const leftPercent = (newLeftWidth / containerWidth) * 100
    const rightPercent = 100 - leftPercent

    leftPanelWidth.value = `${leftPercent}%`
    rightPanelWidth.value = `${rightPercent}%`
  }
}

// 停止拖拽
const stopResize = () => {
  isResizing.value = false

  // 移除全局事件监听
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)

  // 恢复鼠标样式
  document.body.style.userSelect = ''
  document.body.style.cursor = ''
}

// 重置为默认比例 1:1
const resetResize = () => {
  leftPanelWidth.value = '50%'
  rightPanelWidth.value = '50%'
}

// 从 XML 编辑器同步到表单
const syncXmlFromEditor = (xml: string) => {
  try {
    console.log('=== syncXmlFromEditor 开始 ===')
    console.log('原始 XML:', xml)
    console.log('XML 类型:', typeof xml)
    console.log('XML 长度:', xml?.length)
    
    // 清理 XML - 移除多余的空白和换行
    const cleanedXml = xml.trim()
    console.log('清理后的 XML:', cleanedXml)
    
    // 使用 cheerio 解析 XML
    const $ = cheerio.load(cleanedXml, { xmlMode: true })
    const checkElements = $('check')
    
    console.log('找到的 check 元素数量:', checkElements.length)
    
    const newChecks: CheckData[] = []
    
    checkElements.each((index, element) => {
      const checkEl = $(element)
      const checkId = checkEl.attr('id')
      const errorCode = checkEl.attr('errorCode')
      const errorDescription = checkEl.attr('errorDescription')
      const severity = checkEl.attr('severity')
      
      console.log(`\n--- 解析 check ${index} ---`)
      console.log('checkId:', checkId)
      console.log('errorCode:', errorCode)
      console.log('errorDescription:', errorDescription)
      console.log('severity:', severity)
      
      // 解析条件 - 获取第一个子元素
      const children = checkEl.children()
      console.log('子元素数量:', children.length)
      console.log('子元素 HTML:', children.html())
      
      let condition: ConditionNode = { id: '', type: 'simple' }
      
      if (children.length > 0) {
        const firstChild = children.first()
        console.log('第一个子元素:', firstChild.html())
        console.log('第一个子元素标签名:', firstChild[0]?.tagName)
        
        condition = parseConditionNodeFromCheerio(firstChild, $)
        console.log('解析后的 condition:', JSON.stringify(condition, null, 2))
      } else {
        console.log('没有子元素，使用空 condition')
      }
      
      newChecks.push({
        id: checkId || `check-${Date.now()}-${index}`,
        condition,
        errorCode,
        errorDescription,
        severity: severity ? parseInt(severity) : undefined
      })
    })    
    console.log('\n=== 解析完成 ===')
    console.log('newChecks:', JSON.stringify(newChecks, null, 2))

    // 保存当前激活的 check 索引和字段
    const currentActiveIndex = activeCheckIndex.value
    const currentActiveField = activeField.value

    console.log('当前激活状态:')
    console.log('  currentActiveIndex:', currentActiveIndex)
    console.log('  currentActiveField:', currentActiveField)

    // 更新 formData
    formData.value = { checks: newChecks }
    console.log('formData.value 已更新')

    // 恢复高亮状态
    if (currentActiveIndex >= 0 && currentActiveIndex < newChecks.length) {
      console.log('恢复激活状态，索引:', currentActiveIndex)
      activeCheckIndex.value = currentActiveIndex
      const check = newChecks[currentActiveIndex]
      if (check && check.id) {
        activeCheckId.value = check.id
        console.log('恢复激活的 check:', check.id)
      }
      if (currentActiveField) {
        activeField.value = currentActiveField
        console.log('恢复激活的字段:', currentActiveField)
      }

      // 滚动到视野中
      console.log('准备滚动到视野中...')
      setTimeout(() => {
        const checkItems = document.querySelectorAll('.check-item')
        console.log('找到 check-item 元素数量:', checkItems.length)
        console.log('目标索引:', currentActiveIndex)
        
        if (checkItems[currentActiveIndex]) {
          console.log('执行滚动操作')
          checkItems[currentActiveIndex].scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          })
          console.log('滚动完成')
        } else {
          console.log('未找到目标 check-item 元素')
        }
      }, 100)
    } else {
      console.log('不需要恢复激活状态或索引无效')
    }
  } catch (e) {
    console.error('=== XML 解析失败 ===')
    console.error('错误:', e)
    console.error('错误堆栈:', (e as Error).stack)
  }
}

// 从 cheerio 元素解析条件节点
const parseConditionNodeFromCheerio = (element: any, $: any): ConditionNode => {
  console.log('=== parseConditionNodeFromCheerio 开始 ===')
  console.log('element:', element)
  console.log('element.length:', element?.length)
  
  if (!element || element.length === 0) {
    console.log('元素为空，返回默认 condition')
    return { id: '', type: 'simple' }
  }
  
  const tagName = element[0]?.tagName || ''
  console.log('tagName:', tagName)
  console.log('element.html():', element.html())
  console.log('element.attr():', element.attr())
  
  // 处理简单条件 - 包含所有可能的运算符
  if (['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'contains', 'startsWith', 'endsWith', 'regex', 
      'isNull', 'notNull', 'isEmpty', 'notEmpty', 'isBlank', 'notBlank', 'isTrue', 'notTrue', 
      'isFalse', 'notFalse', 'in', 'notIn', 'between', 'lengthBetween', 'utf8LengthBetween',
      'dateBetween', 'timeBetween', 'dateTimeBetween', 'yearBetween'].includes(tagName)) {
    const result = {
      id: `cond-${Date.now()}`,
      type: 'simple',
      operator: tagName,
      field: element.attr('name'),
      value: element.attr('value'),
      min: element.attr('min'),
      max: element.attr('max'),
      pattern: element.attr('pattern')
    }
    console.log('解析为简单条件:', JSON.stringify(result, null, 2))
    return result
  }
  
  // 处理组合条件
  if (tagName === 'and' || tagName === 'or' || tagName === 'not') {
    const conditions: ConditionNode[] = []
    element.children().each((_: any, child: any) => {
      conditions.push(parseConditionNodeFromCheerio($(child), $))
    })
    
    const result = {
      id: `cond-${Date.now()}`,
      type: tagName,
      conditions
    }
    console.log('解析为组合条件:', JSON.stringify(result, null, 2))
    return result
  }
  
  // 处理 if 条件
  if (tagName === 'if') {
    const test = element.attr('test')
    const thenEl = element.find('then').children().first()
    const elseEl = element.find('else').children().first()
    
    const result = {
      id: `cond-${Date.now()}`,
      type: 'if',
      test,
      then: thenEl.length > 0 ? parseConditionNodeFromCheerio(thenEl, $) : undefined,
      else: elseEl.length > 0 ? parseConditionNodeFromCheerio(elseEl, $) : undefined
    }
    console.log('解析为 if 条件:', JSON.stringify(result, null, 2))
    return result
  }
  
  // 处理 expr 条件
  if (tagName === 'expr') {
    const result = {
      id: `cond-${Date.now()}`,
      type: 'expr',
      value: element.text()
    }
    console.log('解析为 expr 条件:', JSON.stringify(result, null, 2))
    return result
  }
  
  console.log('未识别的标签类型，返回默认 condition')
  return { id: `cond-${Date.now()}`, type: 'simple' }
}

// 复制导出的内容
const copyExportedXml = async () => {
  try {
    await navigator.clipboard.writeText(exportedXml.value)
    ElMessage.success('已复制到剪贴板')
  } catch (error) {
    ElMessage.error('复制失败')
  }
}

// 导出 XML
const exportXml = () => {
  exportedXml.value = generatedXml.value
  exportDialogVisible.value = true
}

// 导出 JSON
const exportJson = () => {
  const json = exportEngine.exportToJson(formData.value)
  exportedXml.value = json
  exportDialogVisible.value = true
}

// 复制 XML
const copyXml = async () => {
  try {
    await navigator.clipboard.writeText(generatedXml.value)
    ElMessage.success('已复制到剪贴板')
  } catch (error) {
    ElMessage.error('复制失败')
  }
}

// 下载 XML
const downloadXml = () => {
  const blob = new Blob([exportedXml.value], { type: 'text/xml' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'validator.xml'
  link.click()
  URL.revokeObjectURL(url)
  exportDialogVisible.value = false
  ElMessage.success('下载成功')
}

// 监听数据变化
watch(formData, (newData) => {
  emit('change', newData)
}, { deep: true })

// 监听导出事件
watch(() => generatedXml.value, (xml) => {
  emit('export', xml)
})

// 监听生成的 XML 和选中索引变化，更新 CodeMirror 内容
watch([() => generatedXml.value, activeCheckIndex, activeField], ([newXml, newIndex, newField]) => {
  xmlContent.value = newXml || ''
}, { immediate: true })

// 监听 XML 编辑器内容变化，同步到表单（防抖）
let xmlSyncTimer: ReturnType<typeof setTimeout> | null = null
watch(() => xmlContent.value, (newXml, oldXml) => {
  // 忽略由 formData 变化引起的更新（避免循环）
  if (!oldXml || newXml === generatedXml.value) {
    return
  }

  // 防抖处理
  if (xmlSyncTimer) {
    clearTimeout(xmlSyncTimer)
  }

  xmlSyncTimer = setTimeout(() => {
    syncXmlFromEditor(newXml)
  }, 500)
})




// 暴露方法给子组件使用
defineExpose({
  loadExample,
  clearAll,
  exportXml,
  exportJson,
  getFormData: () => formData.value,
  getGeneratedXml: () => generatedXml.value,
  selectField,
  clearFieldHighlight
})
</script>

<style scoped>
.xdef-editor {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: white;
  border-bottom: 1px solid #ebeef5;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-left h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.editor-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.editor-form {
  flex: none;
  width: 50%;
  min-width: 0;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 16px;
  position: relative;
}

/* 确保下拉框可以显示在容器外部 */
.editor-form :deep(.el-select-dropdown),
.editor-form :deep(.el-popper),
.editor-form :deep(.el-select__popper),
.editor-form :deep(.el-tooltip__popper) {
  position: fixed !important;
  z-index: 9999 !important;
}

/* 确保下拉框不受父容器 overflow 影响 */
.editor-form :deep(.el-select) {
  position: relative;
}

/* 修复嵌套条件中的下拉框位置 */
.check-body :deep(.el-select-dropdown),
.check-body :deep(.el-popper),
.check-body :deep(.el-select__popper) {
  position: fixed !important;
  z-index: 10000 !important;
}

/* 修复 ConditionBuilder 内部的下拉框 */
.check-body :deep(.condition-builder) .el-select-dropdown,
.check-body :deep(.condition-builder) .el-popper,
.check-body :deep(.condition-builder) .el-select__popper,
.check-body :deep(.condition-builder) .el-tooltip__popper {
  position: fixed !important;
  z-index: 10001 !important;
}

/* 修复 PathSelector 下拉框 */
.check-body :deep(.path-selector) .el-select-dropdown,
.check-body :deep(.path-selector) .el-popper,
.check-body :deep(.path-selector) .el-select__popper {
  position: fixed !important;
  z-index: 10002 !important;
}

/* 修复所有嵌套的下拉框，无论多深 */
.editor-form :deep(.el-select-dropdown),
.editor-form :deep(.el-popper),
.editor-form :deep(.el-select__popper),
.editor-form :deep(.el-autocomplete-suggestion),
.editor-form :deep(.el-cascader__dropdown) {
  position: fixed !important;
  z-index: 99999 !important;
}

.editor-preview {
  flex: none;
  width: 50%;
  min-width: 0;
  background: white;
  border-left: 1px solid #ebeef5;
  display: flex;
  flex-direction: column;
}

.resizer {
  width: 6px;
  background: #ebeef5;
  cursor: col-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
  flex-shrink: 0;
}

.resizer:hover {
  background: #409eff;
}

.resizer-handle {
  width: 2px;
  height: 40px;
  background: #c0c4cc;
  border-radius: 1px;
  transition: background-color 0.2s;
}

.resizer:hover .resizer-handle {
  background: white;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #ebeef5;
}

.preview-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.preview-content {
  flex: 1;
  overflow: auto;
  padding: 16px;
  background: #fafafa;
}

.check-item {
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 12px;
  background: #fafafa;
  transition: all 0.3s ease;
  cursor: pointer;
}

.check-item:hover {
  border-color: #c6e2ff;
  background: #ecf5ff;
}

.check-item-active {
  border-color: #409eff;
  background: #ecf5ff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
}

.form-section {
  background: white;
  padding: 16px;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.form-section h3 {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}

.check-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.check-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
}

.check-title-group {
  display: flex;
  align-items: center;
  gap: 2px;
}

.check-id-edit {
  flex: 1;
  max-width: 200px;
}

.check-title {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.check-body {
  padding: 4px 0;
}

.check-body :deep(.el-form-item) {
  margin-bottom: 12px;
}

.check-body :deep(.el-form-item__content) {
  flex: 1;
}

/* 使表单更紧凑 */
.check-body :deep(.el-input),
.check-body :deep(.el-input-number),
.check-body :deep(.el-select),
.check-body :deep(.el-textarea) {
  --el-component-size-small: 28px;
}

.check-body :deep(.el-input__wrapper) {
  padding: 1px 11px;
}

.check-body :deep(.el-form-item__label) {
  font-size: 13px;
  line-height: 28px;
}

/* 字段高亮样式 */
.check-body :deep(.field-highlight) {
  background-color: #fff7e6 !important;
  border-radius: 4px;
  padding: 4px 8px;
  margin: -4px -8px;
  border-left: 3px solid #faad14;
}

.check-body :deep(.field-highlight .el-form-item__label) {
  color: #faad14 !important;
  font-weight: 600;
}

.check-body :deep(.el-input),
.check-body :deep(.el-textarea),
.check-body :deep(.el-input-number) {
  width: 100%;
}
</style>