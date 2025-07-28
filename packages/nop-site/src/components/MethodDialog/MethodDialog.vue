<template>
  <el-dialog :model-value="visible" @update:model-value="onDialogClose" title="方法参数" width="900px" :close-on-click-modal="false" draggable resize>
    <el-tabs v-model="activeTab">
      <el-tab-pane label="入参" name="input">
        <div style="width: 100%">
          <el-table :data="inputParams" border row-key="name" default-expand-all :tree-props="{ children: 'children' }" size="small" style="width:100%;margin-top:8px;">
            <el-table-column prop="name" label="参数名" width="120" />
            <el-table-column prop="type" label="类型" width="120">
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
                <el-button :icon="Edit" size="small" style="height:1.2em;width:1.2em;padding:0;min-width:0;margin-left:4px;" @click="editDesc(scope.row)" />
              </template>
            </el-table-column>
            <el-table-column label="校验器" width="180">
              <template #header>
                <span>校验器</span>
                <el-tooltip content="智能生成校验器" placement="top">
                  <el-button :icon="MagicStick" size="small" style="margin-left:4px;vertical-align:middle;" @click="generateValidators" />
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
                    <el-button :icon="Edit" size="small" style="height:1.4em;width:1.4em;padding:0;min-width:0;" @click="editSeverity(scope.row, item)" />
                    <el-button :icon="Plus" size="small" style="height:1.4em;width:1.4em;padding:0;min-width:0;" @click="addSeverity(scope.row)" />
                    <el-button :icon="Delete" size="small" style="height:1.4em;width:1.4em;padding:0;min-width:0;color:#f56c6c;" @click="removeSeverity(scope.row, idx)" />
                  </li>
                </ol>
              </template>
            </el-table-column>
          </el-table>
          <!-- 高级校验器只在入参tab页展示 -->
          <div v-if="activeTab === 'input'" style="margin-bottom:8px;min-height:32px;">
            <div style="font-weight:bold;margin-bottom:4px;">高级校验器列表</div>
            <ul style="margin:0;padding-left:18px;">
              <li v-for="(item, idx) in unionValidators" :key="item.id || idx" style="margin-bottom:2px;display:flex;align-items:center;gap:4px;">
                <span style="font-weight:bold;">{{ idx+1 }}.</span>
                <span>{{ item.name }}</span>
                <el-tag size="small" type="info" v-if="item.type">{{ item.type }}</el-tag>
                <el-button :icon="Edit" size="small" style="height:1.2em;width:1.2em;padding:0;min-width:0;" @click="editUnionValidator(item)" />
                <el-button :icon="Delete" size="small" style="height:1.2em;width:1.2em;padding:0;min-width:0;color:#f56c6c;" @click="removeUnionValidator(idx)" />
              </li>
            </ul>
            <el-button :icon="Plus" size="small" style="height:1.2em;width:1.2em;padding:0;min-width:0;" @click="addUnionValidator" />
          </div>
        </div>
      </el-tab-pane>
      <el-tab-pane label="出参" name="output">
        <div style="width: 100%">
          <el-table :data="outputParams" border row-key="name" default-expand-all :tree-props="{ children: 'children' }" size="small" style="width:100%;margin-top:8px;">
            <el-table-column prop="name" label="参数名" width="120" />
            <el-table-column prop="type" label="类型" width="120">
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
        </div>
      </el-tab-pane>
    </el-tabs>
    <template #footer>
      <el-button type="primary" @click="onDialogClose(false)">关闭</el-button>
    </template>
    
    <!-- 统一的校验器编辑弹窗 -->
    <el-dialog v-model="editDialogVisible" width="1400px" :close-on-click-modal="false" draggable resize>
      <template #title>
        <span v-if="isUnionDialog" style="font-size:18px;font-weight:bold;">高级校验器</span>
        <span v-else v-html="dialogTitleRaw" style="font-size:18px;font-weight:bold;"></span>
      </template>
      <el-form v-if="dialogModel" :model="dialogModel" label-position="top">
        <el-row :gutter="12" style="margin-bottom: 0; align-items: center; min-height: 56px;">
          <el-col :span="10">
            <el-form-item label="name" style="margin-bottom:0;">
              <el-input v-model="dialogModel.name" style="width:100%; min-width:320px;" />
            </el-form-item>
          </el-col>
          <el-col :span="3">
            <el-form-item label="序号" style="margin-bottom:0;">
              <el-input-number v-model="dialogModel.index" :min="1" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="说明">
          <div style="display:flex;align-items:center;gap:8px;">
            <el-button size="small" @click="showDescPreview = !showDescPreview">{{ showDescPreview ? '编辑' : '预览' }}</el-button>
          </div>
          <div v-if="!showDescPreview">
            <QuillEditor v-model:content="dialogModel.desc" contentType="html" style="min-height:80px;max-height:180px;" />
          </div>
          <div v-else style="min-height:80px;max-height:180px;overflow:auto;border:1px solid #eee;padding:8px 12px;background:#fafbfc;">
            <div v-html="dialogModel.desc"></div>
          </div>
        </el-form-item>
        <el-form-item label="Check">
          <CheckEditor 
            :model-value="isUnionDialog ? dialogModel.checkData : dialogModel.check"
            @update:model-value="val => { if (isUnionDialog) dialogModel.checkData = val; else dialogModel.check = val; }"
            :is-union="isUnionDialog"
            :fields="isUnionDialog ? undefined : getFieldList()"
            :current-field="isUnionDialog ? undefined : currentEditingField"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible=false">取消</el-button>
        <el-button type="primary" @click="isUnionDialog ? saveUnionValidator() : saveSeverity()">保存</el-button>
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
import { ref, reactive, computed } from 'vue'
import { Edit, Plus, Document, Edit as EditIcon, Check, QuestionFilled, Delete, MagicStick } from '@element-plus/icons-vue'

import Quill from 'quill'
window.Quill = Quill
import { QuillEditor } from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.snow.css'
import CheckEditor from './CheckEditor.vue'
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
        { name: 'tag', type: 'String', desc: '标签', severityList: [{ name: '低', check: '' }]},
          { name: 'tag', type: 'String', desc: '标签2', severityList: [{ name: '低', check: '' }]}
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
  // 构建完整的路径信息
  const fullPath = buildFullPath(row);
  console.log('构建的路径:', fullPath, '当前行:', row);
  currentEditingField.value = {
    ...row,
    name: fullPath
  };
  // 确保check是CheckEditor需要的格式
  if (typeof item.check === 'string' || !item.check) {
    editingSeverity.value = { 
      ...item, 
      desc: item.desc || '',
      check: [
        {
          key: Date.now() + '',
          title: '根节点',
          check: '',
          desc: '',
          children: []
        }
      ]
    }
  } else {
    editingSeverity.value = { ...item, desc: item.desc || '' }
  }
  isUnionDialog.value = false
  editDialogVisible.value = true
}

// 构建完整路径的函数
function buildFullPath(node) {
  console.log('buildFullPath 被调用，节点:', node);
  
  // 根据节点在树中的位置构建路径
  const findNodePath = (nodes, targetNode, currentPath = []) => {
    for (const n of nodes) {
      const newPath = [...currentPath, n.name];
      
      if (n === targetNode) {
        return newPath;
      }
      
      if (n.children && n.children.length > 0) {
        const result = findNodePath(n.children, targetNode, newPath);
        if (result) {
          return result;
        }
      }
    }
    return null;
  };
  
  const pathArray = findNodePath(inputParams.value, node);
  console.log('找到的路径数组:', pathArray);
  
  if (pathArray && pathArray.length > 0) {
    // 处理数组索引
    let result = pathArray[0];
    for (let i = 1; i < pathArray.length; i++) {
      const parentPath = pathArray.slice(0, i).join('.');
      const parentNode = findNodeByPath(parentPath);
      
      if (parentNode && parentNode.type === 'Array') {
        result = `${parentPath}[0].${pathArray[i]}`;
      } else {
        result = `${parentPath}.${pathArray[i]}`;
      }
    }
    
    console.log('最终路径:', result);
    return result;
  }
  
  return node.name;
}

// 根据路径查找节点的辅助函数
function findNodeByPath(path) {
  const parts = path.split('.');
  let current = inputParams.value;
  let found = null;
  
  for (const part of parts) {
    found = current.find(item => item.name === part);
    if (!found) return null;
    current = found.children || [];
  }
  
  return found;
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
  row.severityList.push({ 
    name: '新等级', 
    desc: '',
    check: [
      {
        key: Date.now() + '',
        title: '根节点',
        check: '',
        desc: '',
        children: []
      }
    ],
    validatorType: 'required',
    index: (row.severityList.length + 1)
  })
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
  unionValidators.value.push({
    name: '新高级校验器',
    type: '',
    desc: '',
    id: Date.now(),
    checkData: [
      {
        key: Date.now() + '',
        title: '根节点',
        check: '',
        desc: '',
        children: []
      }
    ]
  })
}
const editUnionDialogVisible = ref(false)
const editingUnionValidator = ref(null)
function editUnionValidator(item) {
  editingUnionValidator.value = {
    ...item,
    desc: item.desc || '',
    checkData: item.checkData && item.checkData.length > 0 ? item.checkData : [
      {
        key: Date.now() + '',
        title: '根节点',
        check: '',
        desc: '',
        children: []
      }
    ]
  }
  isUnionDialog.value = true
  editDialogVisible.value = true
}
function saveUnionValidator() {
  if (editingUnionValidator.value) {
    const idx = unionValidators.value.findIndex(i => i.id === editingUnionValidator.value.id)
    if (idx > -1) {
      unionValidators.value[idx] = { ...editingUnionValidator.value }
    }
  }
  editDialogVisible.value = false
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
function onSaveUnionValidator(val) {
  // 可根据实际业务处理val
}

function getFieldList() {
  const fields = [];
  
  const addField = (node, prefix = '') => {
    const fieldName = prefix ? `${prefix}.${node.name}` : node.name;
    fields.push({
      name: fieldName,
      type: node.type,
      desc: node.desc
    });
    
    if (node.children && node.children.length > 0) {
      node.children.forEach((child, index) => {
        // 如果父节点是数组类型，添加索引
        const childPrefix = node.type === 'Array' ? `${fieldName}[0]` : fieldName;
        const childFieldName = `${childPrefix}.${child.name}`;
        fields.push({
          name: childFieldName,
          type: child.type,
          desc: child.desc
        });
        
        // 递归处理更深层的嵌套
        if (child.children && child.children.length > 0) {
          child.children.forEach((grandChild, grandIndex) => {
            const grandChildPrefix = child.type === 'Array' ? `${childFieldName}[0]` : childFieldName;
            const grandChildFieldName = `${grandChildPrefix}.${grandChild.name}`;
            fields.push({
              name: grandChildFieldName,
              type: grandChild.type,
              desc: grandChild.desc
            });
          });
        }
      });
    }
  };
  
  inputParams.value.forEach(param => {
    addField(param);
  });
  
  return fields;
}

const currentEditingField = ref(null);

// 计算对话框标题，包含路径信息
const dialogTitleRaw = computed(() => {
  if (currentEditingField.value && currentEditingField.value.name) {
    const path = currentEditingField.value.name;
    const pathParts = path.split('.');
    const highlightedPath = pathParts.map((part, index) => {
      const isLast = index === pathParts.length - 1;
      const highlightClass = isLast ? 'path-highlight-final' : 'path-highlight';
      
      if (part.includes('[')) {
        // 处理数组索引
        const [name, indexPart] = part.split('[');
        return `<span class="${highlightClass}">${name}</span>[${indexPart}`;
      } else {
        return `<span class="${highlightClass}">${part}</span>`;
      }
    }).join('.');
    
    return `编辑校验器 - ${highlightedPath}`;
  }
  return '编辑校验器';
});

const showDescPreview = ref(false)
const isUnionDialog = ref(false)
const dialogModel = computed(() => isUnionDialog.value ? editingUnionValidator.value : editingSeverity.value)
</script>

<style>
.path-highlight {
  color: #409eff;
  font-weight: bold;
  background: #ecf5ff;
  padding: 1px 4px;
  border-radius: 2px;
}
.path-highlight-final {
  color: #67c23a;
  font-weight: bold;
  background: #f0f9ff;
  padding: 1px 4px;
  border-radius: 2px;
  border: 1px solid #67c23a;
}
</style>

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
