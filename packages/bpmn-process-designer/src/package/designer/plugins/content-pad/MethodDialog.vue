<template>
  <el-dialog :model-value="visible" @update:model-value="onDialogClose" title="方法参数" width="700px" :close-on-click-modal="false">
    <el-tabs v-model="activeTab">
      <el-tab-pane label="入参" name="input">
        <el-table :data="inputParams" border row-key="name" default-expand-all :tree-props="{ children: 'children' }" size="small" style="width:100%;margin-top:8px;">
          <el-table-column prop="name" label="参数名" width="120" />
          <el-table-column prop="type" label="类型" width="80">
            <template #default="scope">
              <el-tag :type="typeColor[scope.row.type] || typeColor.Default" 
                      :class="{
                        'tag-blue': scope.row.type === 'String',
                        'tag-purple': scope.row.type === 'Array',
                        'tag-gray': scope.row.type === 'Object'
                      }"
                      size="small" effect="plain" style="font-size:12px;padding:0 8px;min-width:40px;line-height:20px;height:22px;">
                {{ scope.row.type }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="desc" label="说明" min-width="120">
            <template #default="scope">
              <span v-html="scope.row.desc"></span>
              <el-button :icon="Edit" size="small" circle plain style="height:1.2em;width:1.2em;padding:0;min-width:0;margin-left:4px;" @click="editDesc(scope.row)" />
            </template>
          </el-table-column>
          <el-table-column label="校验器" width="180">
            <template #header>
              <span>校验器</span>
              <el-tooltip content="智能生成校验器" placement="top">
                <el-button :icon="MagicStick" size="small" circle plain style="margin-left:4px;vertical-align:middle;" @click="generateValidators" />
              </el-tooltip>
            </template>
            <template #default="scope">
              <ol style="margin:0;padding-left:18px;">
                <li v-for="(item, idx) in scope.row.severityList || []" :key="item.id || idx" style="margin-bottom:2px;display:flex;align-items:center;gap:4px;">
                  <span style="font-weight:bold;min-width:1.5em;text-align:right;">{{ item.index || idx+1 }}.</span>
                  <el-icon v-if="item.icon"><component :is="item.icon" /></el-icon>
                  <el-icon v-else-if="item.validatorType==='string'" style="color:#409eff;"><Document /></el-icon>
                  <el-icon v-else-if="item.validatorType==='number'" style="color:#67c23a;"><Edit /></el-icon>
                  <el-icon v-else-if="item.validatorType==='boolean'" style="color:#e6a23c;"><Check /></el-icon>
                  <el-icon v-else style="color:#909399;"><QuestionFilled /></el-icon>
                  <span>{{ item.name }}</span>
                  <el-button :icon="Edit" size="small" circle plain style="height:1.4em;width:1.4em;padding:0;min-width:0;" @click="editSeverity(scope.row, item)" />
                  <el-button :icon="Plus" size="small" circle plain style="height:1.4em;width:1.4em;padding:0;min-width:0;" @click="addSeverity(scope.row)" />
                  <el-button :icon="Delete" size="small" circle plain style="height:1.4em;width:1.4em;padding:0;min-width:0;color:#f56c6c;" @click="removeSeverity(scope.row, idx)" />
                </li>
              </ol>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
      <el-tab-pane label="出参" name="output">
        <el-table :data="outputParams" border row-key="name" default-expand-all :tree-props="{ children: 'children' }" size="small" style="width:100%;margin-top:8px;">
          <el-table-column prop="name" label="参数名" width="120" />
          <el-table-column prop="type" label="类型" width="80">
            <template #default="scope">
              <el-tag :type="typeColor[scope.row.type] || typeColor.Default"
                      :class="{
                        'tag-blue': scope.row.type === 'String',
                        'tag-purple': scope.row.type === 'Array',
                        'tag-gray': scope.row.type === 'Object'
                      }"
                      size="small" effect="plain" style="font-size:12px;padding:0 8px;min-width:40px;line-height:20px;height:22px;">
                {{ scope.row.type }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="desc" label="说明" min-width="120">
            <template #default="scope">
              <span v-html="scope.row.desc"></span>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>
    <template #footer>
      <div style="margin-bottom:8px;min-height:32px;">
        <div style="font-weight:bold;margin-bottom:4px;">联合校验器列表</div>
        <ul style="margin:0;padding-left:18px;">
          <li v-for="(item, idx) in unionValidators" :key="item.id || idx" style="margin-bottom:2px;display:flex;align-items:center;gap:4px;">
            <span style="font-weight:bold;">{{ idx+1 }}.</span>
            <span>{{ item.name }}</span>
            <el-tag size="small" type="info" v-if="item.type">{{ item.type }}</el-tag>
            <el-button :icon="Edit" size="small" circle plain style="height:1.2em;width:1.2em;padding:0;min-width:0;" @click="editUnionValidator(item)" />
            <el-button :icon="Delete" size="small" circle plain style="height:1.2em;width:1.2em;padding:0;min-width:0;color:#f56c6c;" @click="removeUnionValidator(idx)" />
          </li>
        </ul>
        <el-button :icon="Plus" size="small" circle plain style="height:1.2em;width:1.2em;padding:0;min-width:0;" @click="addUnionValidator" />
      </div>
      <el-button type="primary" @click="onDialogClose(false)">关闭</el-button>
    </template>
    <el-dialog v-model="editDialogVisible" title="编辑校验器" width="320px" :close-on-click-modal="false">
      <el-form v-if="editingSeverity" :model="editingSeverity">
        <el-form-item label="name">
          <el-input v-model="editingSeverity.name" />
        </el-form-item>
        <el-form-item label="check">
          <el-input v-model="editingSeverity.check" type="textarea" :rows="4" placeholder="请输入XML格式内容" autosize style="font-family:monospace;" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="editingSeverity.validatorType" placeholder="请选择类型" style="width:100%">
            <el-option v-for="item in validatorTypes" :key="item.value" :label="item.label" :value="item.value">
              <div style="display:flex;flex-direction:column;">
                <div style="display:flex;align-items:center;gap:6px;">
                  <el-icon v-if="item.icon"><component :is="item.icon" /></el-icon>
                  <span style="font-weight:bold;">{{ item.label }}</span>
                  <span style="color:#999;font-size:12px;margin-left:4px;">{{ item.desc }}</span>
                </div>
                <div v-if="item.example" style="color:#bbb;font-size:12px;margin-left:24px;">示例: {{ item.example }}</div>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="序号">
          <el-input-number v-model="editingSeverity.index" :min="1" style="width:100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible=false">取消</el-button>
        <el-button type="primary" @click="saveSeverity">保存</el-button>
      </template>
    </el-dialog>
    <el-dialog v-model="editDescDialogVisible" title="编辑说明(支持HTML)" width="520px" :close-on-click-modal="false">
      <QuillEditor
 v-model:content="editingDesc"
        contentType="html"
        style="height:220px;"

 
      />
      <!-- :modules="quillModules" -->
      <template #footer>
        <el-button @click="editDescDialogVisible=false">取消</el-button>
        <el-button type="primary" @click="saveDesc">保存</el-button>
      </template>
    </el-dialog>
  </el-dialog>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { Edit, Plus, Document, Edit as EditIcon, Check, QuestionFilled, Delete, MagicStick } from '@element-plus/icons-vue'

import Quill from 'quill'
window.Quill = Quill
import { QuillEditor } from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.snow.css'
const props = defineProps({
  visible: Boolean,
  onClose: Function
})


const activeTab = ref('input')
const inputParams = ref([
  { name: 'user', type: 'Object', desc: '用户对象', severityList: [{ name: '非空校验器', check: '' }], children: [
    { name: 'id', type: 'String', desc: '用户ID', severityList: [{ name: '中', check: '' }] },
    { name: 'profile', type: 'Object', desc: '用户资料', severityList: [{ name: '低', check: '' }], children: [
      { name: 'age', type: 'Number', desc: '年龄', severityList: [{ name: '高', check: '' }] },
      { name: 'tags', type: 'Array', desc: '标签', severityList: [{ name: '中', check: '' }], children: [
        { name: 'tag', type: 'String', desc: '标签名', severityList: [{ name: '低', check: '' }] }
      ] }
    ] }
  ] },
  { name: 'isActive', type: 'Boolean', desc: '是否激活', severityList: [{ name: '高', check: '' }] }
])
const outputParams = ref([
  { name: 'result', type: 'Boolean', desc: '是否成功' },
  { name: 'data', type: 'Array', desc: '返回数据', children: [
    { name: 'item', type: 'Object', desc: '数据项', children: [
      { name: 'value', type: 'Number', desc: '数值' },
      { name: 'label', type: 'String', desc: '标签' }
    ] }
  ] }
])
const typeColor = {
  String: 'info', // 蓝色
  Number: 'success',
  Boolean: 'warning',
  Array: 'primary',
  Object: 'info', // 改为info，避免default
  Default: 'info'
}
const editDialogVisible = ref(false)
const editingSeverity = ref(null)
let editingRow = null
function editSeverity(row, item) {
  editingRow = row
  editingSeverity.value = { ...item }
  editDialogVisible.value = true
}
function saveSeverity() {
  if (editingRow && editingSeverity.value) {
    const idx = (editingRow.severityList || []).findIndex(i => i.name === editingSeverity.value.name)
    if (idx > -1) {
      editingRow.severityList[idx] = { ...editingSeverity.value }
    }
  }
  editDialogVisible.value = false
}
function addSeverity(row) {
  if (!row.severityList) row.severityList = []
  row.severityList.push({ name: '新等级', check: '' })
}
function removeSeverity(row, idx) {
  if (row.severityList) row.severityList.splice(idx, 1)
}
function onDialogClose(val) {
  props.onClose && props.onClose(val === false ? false : true)
}
const validatorTypes = [
  { value: 'format', label: '格式校验', icon: Document, desc: '验证输入数据是否符合特定格式', example: '邮箱格式、手机号格式' },
  { value: 'required', label: '非空校验', icon: Check, desc: '确保字段不为空', example: 'required' },
  { value: 'regex', label: '正则校验', icon: EditIcon, desc: '使用正则表达式验证数据格式', example: '^[a-zA-Z0-9]+$' },
  { value: 'range', label: '范围校验', icon: EditIcon, desc: '验证数值或字符串长度是否在指定范围内', example: 'min, max' },
  { value: 'unique', label: '唯一性校验', icon: Check, desc: '确保输入值在数据库中是唯一的', example: '用户名唯一性校验' },
  { value: 'condition', label: '条件校验', icon: EditIcon, desc: '根据特定条件动态调整校验规则', example: '条件性必填字段' },
  { value: 'enum', label: '枚举校验', icon: Document, desc: '验证输入值是否在预定义的枚举列表中', example: 'in, not-in' },
  { value: 'datatype', label: '数据类型校验', icon: Document, desc: '验证输入数据的类型是否符合预期', example: 'int, double, date' },
  { value: 'file', label: '文件校验', icon: Document, desc: '验证上传文件的类型和大小', example: '文件类型、文件大小' },
  { value: 'password', label: '密码校验', icon: EditIcon, desc: '验证密码的复杂度和长度', example: '包含大小写字母、数字和特殊字符' },
  { value: 'date', label: '日期校验', icon: Document, desc: '验证日期格式和范围', example: 'YYYY-MM-DD' },
  { value: 'custom', label: '自定义校验', icon: QuestionFilled, desc: '允许用户编写自定义校验函数', example: '自定义校验逻辑' },
]
const unionValidators = ref([])
function addUnionValidator() {
  unionValidators.value.push({ name: '新联合校验器', type: '', id: Date.now() })
}
function editUnionValidator(item) {
  // TODO: 实现弹窗编辑逻辑
}
function removeUnionValidator(idx) {
  unionValidators.value.splice(idx, 1)
}
async function generateValidators() {
  // TODO: 调用后端接口智能生成校验器
  // 示例：const res = await fetch('/api/ai/generate-validators', { method: 'POST', body: ... })
  // 处理返回结果并更新 inputParams.value
}
const editDescDialogVisible = ref(false)
const editingDesc = ref('')
let editingDescRow = null
function editDesc(row) {
  editingDescRow = row
  editingDesc.value = row.desc || ''
  editDescDialogVisible.value = true
}
function saveDesc() {
  if (editingDescRow) {
    editingDescRow.desc = editingDesc.value
  }
  editDescDialogVisible.value = false
}
const quillModules = {
  toolbar: [
    [{ 'font': [] }, { 'size': [] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'script': 'sub'}, { 'script': 'super' }],
    [{ 'header': 1 }, { 'header': 2 }, 'blockquote', 'code-block'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }, { 'indent': '-1'}, { 'indent': '+1' }],
    [{ 'direction': 'rtl' }, { 'align': [] }],
    ['link', 'image', 'video'],
    ['clean']
  ]
}
</script>

<style scoped>
.tag-blue {
  color: #409EFF;
  border-color: #409EFF;
  background: #ecf5ff;
}
.tag-purple {
  color: #a259ec;
  border-color: #a259ec;
  background: #f3e8ff;
}
.tag-gray {
  color: #909399;
  border-color: #909399;
  background: #f4f4f5;
}
</style>
