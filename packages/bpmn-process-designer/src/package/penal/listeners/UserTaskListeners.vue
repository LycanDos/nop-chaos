<template>
  <div class="panel-tab__content">
    <el-table :data="elementListenersList" size="small" border>
      <el-table-column label="序号" width="50px" type="index" />
      <el-table-column
        label="事件类型"
        min-width="80px"
        show-overflow-tooltip
        :formatter="(row) => listenerEventTypeObject[row.event]"
      />
      <el-table-column label="事件id" min-width="80px" prop="id" show-overflow-tooltip />
      <el-table-column
        label="监听器类型"
        min-width="80px"
        show-overflow-tooltip
        :formatter="(row) => listenerTypeObject[row.listenerType]"
      />
      <el-table-column label="操作" width="90px">
        <template #default="scope">
          <el-button size="small" link @click="openListenerForm(scope.row, scope.$index)"
            >编辑</el-button
          >
          <el-divider direction="vertical" />
          <el-button
            size="small"
            link
            style="color: #ff4d4f"
            @click="removeListener(scope.row, scope.$index)"
            >移除</el-button
          >
        </template>
      </el-table-column>
    </el-table>
    <div class="element-drawer__button">
      <XButton
        size="small"
        type="primary"
        preIcon="ep:plus"
        title="添加监听器"
        @click="openListenerForm(null)"
      />
      <XButton
        type="success"
        preIcon="ep:select"
        title="选择监听器"
        size="small"
        @click="openProcessListenerDialog"
      />
    </div>

    <!-- 监听器 编辑/创建 部分 -->
    <el-drawer
      v-model="listenerFormModelVisible"
      title="任务监听器"
      :size="`${width}px`"
      append-to-body
      destroy-on-close
    >
      <el-form size="small" :model="listenerForm" label-width="96px" ref="listenerFormRef">
        <el-form-item
          label="事件类型"
          prop="event"
          :rules="{ required: true, trigger: ['blur', 'change'] }"
        >
          <el-select v-model="listenerForm.event">
            <el-option
              v-for="i in Object.keys(listenerEventTypeObject)"
              :key="i"
              :label="listenerEventTypeObject[i]"
              :value="i"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          label="监听器ID"
          prop="id"
          :rules="{ required: true, trigger: ['blur', 'change'] }"
        >
          <el-input v-model="listenerForm.id" clearable />
        </el-form-item>
        <el-form-item
          label="监听器类型"
          prop="listenerType"
          :rules="{ required: true, trigger: ['blur', 'change'] }"
        >
          <el-select v-model="listenerForm.listenerType">
            <el-option
              v-for="i in Object.keys(listenerTypeObject)"
              :key="i"
              :label="listenerTypeObject[i]"
              :value="i"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          v-if="listenerForm.listenerType === 'classListener'"
          label="Java类"
          prop="class"
          key="listener-class"
          :rules="{ required: true, trigger: ['blur', 'change'] }"
        >
          <el-input v-model="listenerForm.class" clearable />
        </el-form-item>
        <el-form-item
          v-if="listenerForm.listenerType === 'expressionListener'"
          label="表达式"
          prop="expression"
          key="listener-expression"
          :rules="{ required: true, trigger: ['blur', 'change'] }"
        >
          <el-input v-model="listenerForm.expression" clearable />
        </el-form-item>
        <el-form-item
          v-if="listenerForm.listenerType === 'delegateExpressionListener'"
          label="代理表达式"
          prop="delegateExpression"
          key="listener-delegate"
          :rules="{ required: true, trigger: ['blur', 'change'] }"
        >
          <el-input v-model="listenerForm.delegateExpression" clearable />
        </el-form-item>
        <template v-if="listenerForm.listenerType === 'scriptListener'">
          <el-form-item
            label="脚本格式"
            prop="scriptFormat"
            key="listener-script-format"
            :rules="{ required: true, trigger: ['blur', 'change'], message: '请填写脚本格式' }"
          >
            <el-input v-model="listenerForm.scriptFormat" clearable />
          </el-form-item>
          <el-form-item
            label="脚本类型"
            prop="scriptType"
            key="listener-script-type"
            :rules="{ required: true, trigger: ['blur', 'change'], message: '请选择脚本类型' }"
          >
            <el-select v-model="listenerForm.scriptType">
              <el-option label="内联脚本" value="inlineScript" />
              <el-option label="外部脚本" value="externalScript" />
            </el-select>
          </el-form-item>
          <el-form-item
            v-if="listenerForm.scriptType === 'inlineScript'"
            label="脚本内容"
            prop="value"
            key="listener-script"
            :rules="{ required: true, trigger: ['blur', 'change'], message: '请填写脚本内容' }"
          >
            <el-input v-model="listenerForm.value" clearable />
          </el-form-item>
          <el-form-item
            v-if="listenerForm.scriptType === 'externalScript'"
            label="资源地址"
            prop="resource"
            key="listener-resource"
            :rules="{ required: true, trigger: ['blur', 'change'], message: '请填写资源地址' }"
          >
            <el-input v-model="listenerForm.resource" clearable />
          </el-form-item>
        </template>

        <template v-if="listenerForm.event === 'timeout'">
          <el-form-item label="定时器类型" prop="eventDefinitionType" key="eventDefinitionType">
            <el-select v-model="listenerForm.eventDefinitionType">
              <el-option label="日期" value="date" />
              <el-option label="持续时长" value="duration" />
              <el-option label="循环" value="cycle" />
              <el-option label="无" value="null" />
            </el-select>
          </el-form-item>
          <el-form-item
            v-if="!!listenerForm.eventDefinitionType && listenerForm.eventDefinitionType !== 'null'"
            label="定时器"
            prop="eventTimeDefinitions"
            key="eventTimeDefinitions"
            :rules="{ required: true, trigger: ['blur', 'change'], message: '请填写定时器配置' }"
          >
            <el-input v-model="listenerForm.eventTimeDefinitions" clearable />
          </el-form-item>
        </template>
      </el-form>

      <el-divider />
      <p class="listener-filed__title">
        <span><Icon icon="ep:menu" />注入字段：</span>
        <el-button size="small" type="primary" @click="openListenerFieldForm(null)"
          >添加字段</el-button
        >
      </p>
      <el-table
        :data="fieldsListOfListener"
        size="small"
        max-height="240"
        fit
        border
        style="flex: none"
      >
        <el-table-column label="序号" width="50px" type="index" />
        <el-table-column label="字段名称" min-width="100px" prop="name" />
        <el-table-column
          label="字段类型"
          min-width="80px"
          show-overflow-tooltip
          :formatter="(row) => fieldTypeObject[row.fieldType]"
        />
        <el-table-column
          label="字段值/表达式"
          min-width="100px"
          show-overflow-tooltip
          :formatter="(row) => row.string || row.expression"
        />
        <el-table-column label="操作" width="100px">
          <template #default="scope">
            <el-button size="small" link @click="openListenerFieldForm(scope.row, scope.$index)"
              >编辑</el-button
            >
            <el-divider direction="vertical" />
            <el-button
              size="small"
              link
              style="color: #ff4d4f"
              @click="removeListenerField(scope.row, scope.$index)"
              >移除</el-button
            >
          </template>
        </el-table-column>
      </el-table>

      <div class="element-drawer__button">
        <el-button size="small" @click="listenerFormModelVisible = false">取 消</el-button>
        <el-button size="small" type="primary" @click="saveListenerConfig">保 存</el-button>
      </div>
    </el-drawer>

    <!-- 注入西段 编辑/创建 部分 -->
    <el-dialog
      title="字段配置"
      v-model="listenerFieldFormModelVisible"
      width="600px"
      append-to-body
      destroy-on-close
    >
      <el-form
        :model="listenerFieldForm"
        size="small"
        label-width="96px"
        ref="listenerFieldFormRef"
        style="height: 136px"
      >
        <el-form-item
          label="字段名称："
          prop="name"
          :rules="{ required: true, trigger: ['blur', 'change'] }"
        >
          <el-input v-model="listenerFieldForm.name" clearable />
        </el-form-item>
        <el-form-item
          label="字段类型："
          prop="fieldType"
          :rules="{ required: true, trigger: ['blur', 'change'] }"
        >
          <el-select v-model="listenerFieldForm.fieldType">
            <el-option
              v-for="i in Object.keys(fieldTypeObject)"
              :key="i"
              :label="fieldTypeObject[i]"
              :value="i"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          v-if="listenerFieldForm.fieldType === 'string'"
          label="字段值："
          prop="string"
          key="field-string"
          :rules="{ required: true, trigger: ['blur', 'change'] }"
        >
          <el-input v-model="listenerFieldForm.string" clearable />
        </el-form-item>
        <el-form-item
          v-if="listenerFieldForm.fieldType === 'expression'"
          label="表达式："
          prop="expression"
          key="field-expression"
          :rules="{ required: true, trigger: ['blur', 'change'] }"
        >
          <el-input v-model="listenerFieldForm.expression" clearable />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="small" @click="listenerFieldFormModelVisible = false">取 消</el-button>
        <el-button size="small" type="primary" @click="saveListenerFiled">确 定</el-button>
      </template>
    </el-dialog>
  </div>

  <!-- 选择弹窗 -->
  <ProcessListenerDialog ref="processListenerDialogRef" @select="selectProcessListener" />
</template>
<script lang="ts" setup>
import { ElMessageBox } from 'element-plus'
import { createListenerObject, updateElementExtensions } from '../../utils'
import {
  initListenerForm,
  initListenerType,
  eventType,
  listenerType,
  fieldType,
  initListenerForm2
} from './utilSelf'
import ProcessListenerDialog from './ProcessListenerDialog.vue'
// import ProcessListenerDialog from '@/'

defineOptions({ name: 'UserTaskListeners' })

const props = defineProps({
  id: String,
  type: String
})
const prefix = inject('prefix')
const width = inject('width')
const elementListenersList = ref<any[]>([])
const listenerEventTypeObject = ref(eventType)
const listenerTypeObject = ref(listenerType)
const listenerFormModelVisible = ref(false)
const listenerForm = ref<any>({})
const fieldTypeObject = ref(fieldType)
const fieldsListOfListener = ref<any[]>([])
const listenerFieldFormModelVisible = ref(false) // 监听器 注入字段表单弹窗 显示状态
const editingListenerIndex = ref(-1) // 监听器所在下标，-1 为新增
const editingListenerFieldIndex = ref(-1) // 字段所在下标，-1 为新增
const listenerFieldForm = ref<any>({}) // 监听器 注入字段 详情表单
const bpmnElement = ref()
const bpmnElementListeners = ref()
const otherExtensionList = ref()
const listenerFormRef = ref()
const listenerFieldFormRef = ref()
const bpmnInstances = () => (window as any)?.bpmnInstances

const resetListenersList = () => {
  console.log(
    bpmnInstances().bpmnElement,
    'window.bpmnInstances.bpmnElementwindow.bpmnInstances.bpmnElementwindow.bpmnInstances.bpmnElementwindow.bpmnInstances.bpmnElementwindow.bpmnInstances.bpmnElementwindow.bpmnInstances.bpmnElement'
  )
  bpmnElement.value = bpmnInstances().bpmnElement
  otherExtensionList.value = []
  bpmnElementListeners.value =
    bpmnElement.value.businessObject?.extensionElements?.values.filter(
      (ex) => ex.$type === `${prefix}:TaskListener`
    ) ?? []
  elementListenersList.value = bpmnElementListeners.value.map((listener) =>
    initListenerType(listener)
  )
}
const openListenerForm = (listener, index?) => {
  if (listener) {
    listenerForm.value = initListenerForm(listener)
    editingListenerIndex.value = index
  } else {
    listenerForm.value = {}
    editingListenerIndex.value = -1 // 标记为新增
  }
  if (listener && listener.fields) {
    fieldsListOfListener.value = listener.fields.map((field) => ({
      ...field,
      fieldType: field.string ? 'string' : 'expression'
    }))
  } else {
    fieldsListOfListener.value = []
    listenerForm.value['fields'] = []
  }
  // 打开侧边栏并清楚验证状态
  listenerFormModelVisible.value = true
  nextTick(() => {
    if (listenerFormRef.value) listenerFormRef.value.clearValidate()
  })
}
// 移除监听器
const removeListener = (listener, index?) => {
  console.log(listener, 'listener')
  ElMessageBox.confirm('确认移除该监听器吗？', '提示', {
    confirmButtonText: '确 认',
    cancelButtonText: '取 消'
  })
    .then(() => {
      bpmnElementListeners.value.splice(index, 1)
      elementListenersList.value.splice(index, 1)
      updateElementExtensions(
        bpmnElement.value,
        otherExtensionList.value.concat(bpmnElementListeners.value)
      )
    })
    .catch(() => console.info('操作取消'))
}
// 保存监听器
const saveListenerConfig = async () => {
  let validateStatus = await listenerFormRef.value.validate()
  if (!validateStatus) return // 验证不通过直接返回
  const listenerObject = createListenerObject(listenerForm.value, true, prefix)
  if (editingListenerIndex.value === -1) {
    bpmnElementListeners.value.push(listenerObject)
    elementListenersList.value.push(listenerForm.value)
  } else {
    bpmnElementListeners.value.splice(editingListenerIndex.value, 1, listenerObject)
    elementListenersList.value.splice(editingListenerIndex.value, 1, listenerForm.value)
  }
  // 保存其他配置
  otherExtensionList.value =
    bpmnElement.value.businessObject?.extensionElements?.values?.filter(
      (ex) => ex.$type !== `${prefix}:TaskListener`
    ) ?? []
  updateElementExtensions(
    bpmnElement.value,
    otherExtensionList.value.concat(bpmnElementListeners.value)
  )
  // 4. 隐藏侧边栏
  listenerFormModelVisible.value = false
  listenerForm.value = {}
}
// 打开监听器字段编辑弹窗
const openListenerFieldForm = (field, index?) => {
  listenerFieldForm.value = field ? JSON.parse(JSON.stringify(field)) : {}
  editingListenerFieldIndex.value = field ? index : -1
  listenerFieldFormModelVisible.value = true
  nextTick(() => {
    if (listenerFieldFormRef.value) listenerFieldFormRef.value.clearValidate()
  })
}
// 保存监听器注入字段
const saveListenerFiled = async () => {
  let validateStatus = await listenerFieldFormRef.value.validate()
  if (!validateStatus) return // 验证不通过直接返回
  if (editingListenerFieldIndex.value === -1) {
    fieldsListOfListener.value.push(listenerFieldForm.value)
    listenerForm.value.fields.push(listenerFieldForm.value)
  } else {
    fieldsListOfListener.value.splice(editingListenerFieldIndex.value, 1, listenerFieldForm.value)
    listenerForm.value.fields.splice(editingListenerFieldIndex.value, 1, listenerFieldForm.value)
  }
  listenerFieldFormModelVisible.value = false
  nextTick(() => {
    listenerFieldForm.value = {}
  })
}
// 移除监听器字段
const removeListenerField = (field, index) => {
  console.log(field, 'field')
  ElMessageBox.confirm('确认移除该字段吗？', '提示', {
    confirmButtonText: '确 认',
    cancelButtonText: '取 消'
  })
    .then(() => {
      fieldsListOfListener.value.splice(index, 1)
      listenerForm.value.fields.splice(index, 1)
    })
    .catch(() => console.info('操作取消'))
}

// 打开监听器弹窗
const processListenerDialogRef = ref()
const openProcessListenerDialog = async () => {
  processListenerDialogRef.value.open('task')
}
const selectProcessListener = (listener) => {
  const listenerForm = initListenerForm2(listener)
  const listenerObject = createListenerObject(listenerForm, true, prefix)
  bpmnElementListeners.value.push(listenerObject)
  elementListenersList.value.push(listenerForm)

  // 保存其他配置
  otherExtensionList.value =
    bpmnElement.value.businessObject?.extensionElements?.values?.filter(
      (ex) => ex.$type !== `${prefix}:TaskListener`
    ) ?? []
  updateElementExtensions(
    bpmnElement.value,
    otherExtensionList.value.concat(bpmnElementListeners.value)
  )
}

watch(
  () => props.id,
  (val) => {
    val &&
      val.length &&
      nextTick(() => {
        resetListenersList()
      })
  },
  { immediate: true }
)
</script>
