<template>
  <div class="check-editor" style="display: flex; gap: 20px; height: 520px; align-items: flex-start;">
    <!-- 左侧列表面板 -->
    <div class="list-panel" style="flex: 1; min-width: 472px; max-width: 520px; background: #fff; box-shadow: none; border-radius: 0; padding: 16px 8px; overflow: hidden; height: 480px; display: flex; flex-direction: column;">
      
      <!-- 转换类型展示区域（始终显示） -->
      <div class="transform-section">
        <div class="section-header">
          <!-- 转换按钮 -->
          <el-button 
            :class="['transform-btn', { 'active': transformChecks.length > 0 }]"
            @click="toggleTransform"
            size="small"
          >
            <el-icon :class="['transform-icon', { 'rotating': transformChecks.length > 0 }]">
              <Refresh />
            </el-icon>
            <span>转换</span>
          </el-button>
        </div>
        
        <!-- 有转换类型时显示转换结果 -->
        <div v-if="transformChecks.length > 0" class="transform-content">
          <div 
            v-for="check in transformChecks" 
            :key="check.id"
            class="transform-card"
            :class="{ 'selected': isSelectedCheck(check) }"
            @click="onSelectCheck(check)"
          >
            <div class="transform-header">
              <el-icon class="transform-icon"><Refresh /></el-icon>
              <span class="transform-type">{{ getTransformTypeLabel(check.condition?.operationValue) }}</span>
              <el-button 
                type="text" 
                size="small" 
                class="delete-btn"
                @click.stop="removeCheck(0, 'transform')"
              >
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
            <div class="transform-tree">
              <el-tree
                :data="getTransformResultTree(check)"
                :props="{ label: 'name', children: 'children' }"
                node-key="id"
                @node-click="(node) => onTransformNodeClick(node, check)"
                style="background: transparent;"
              >
                <template #default="{ node, data }">
                  <span class="tree-node">
                    <span class="property-name">{{ data.name }}</span>
                    <span class="property-type">: {{ data.type }}</span>
                  </span>
                </template>
              </el-tree>
            </div>
          </div>
        </div>
        
        <!-- 没有转换类型时显示默认参数类型 -->
        <div v-else class="default-transform">
          <div class="default-transform-card">
            <div class="default-transform-header">
              <el-icon class="default-icon"><Document /></el-icon>
              <span>方法参数类型</span>
            </div>
            <div class="default-transform-tree">
              <el-tree
                :data="getDefaultParameterTree()"
                :props="{ label: 'name', children: 'children' }"
                node-key="id"
                @node-click="(node) => onTransformNodeClick(node, undefined)"
                style="background: transparent;"
              >
                <template #default="{ node, data }">
                  <span class="tree-node">
                    <span class="property-name">{{ data.name }}</span>
                    <span class="property-type">: {{ data.type }}</span>
                  </span>
                </template>
              </el-tree>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 校验类型Check列表 -->
      <div class="validation-section">
        <div class="section-header">
          <el-icon><Check /></el-icon>
          <span>校验</span>
          <el-button 
            type="primary" 
            size="small" 
            class="add-validation-btn"
            @click="addValidation"
          >
            新增校验
          </el-button>
        </div>
        <el-table 
          :data="validationChecks" 
          size="small" 
          border 
          highlight-current-row 
          :row-class-name="rowClassName" 
          @current-change="onSelectCheck" 
          :row-key="row => row.id" 
          style="width:100%; border-radius: 0; box-shadow: none; border: none; background: #fff;"
        >
          <el-table-column prop="id" label="ID" width="120" />
          <el-table-column prop="errorDescription" label="错误描述" min-width="200" />
          <el-table-column label="操作" width="80">
            <template #default="scope">
              <el-button type="text" size="small" @click.stop="removeCheck(scope.$index, 'validation')">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        
        <!-- 空状态 -->
        <div v-if="validationChecks.length === 0" class="empty-state">
          <el-empty description="暂无校验配置" />
        </div>
      </div>
    </div>
    
    <!-- 右侧表单面板 -->
    <div class="form-panel" style="flex: 2; min-width: 520px; background: #fff; box-shadow: none; border-radius: 0; padding: 18px 24px; min-height: 480px; display: flex; flex-direction: column; justify-content: flex-start;">
      <div v-if="!selectedCheck" class="no-selection">
        <el-empty description="请选择一个Check进行配置" />
      </div>
      
      <div v-else>
        <!-- 转换类型配置 -->
        <div v-if="isTransformType" class="transform-config">
          <h3>转换配置</h3>
          <el-form :model="localCheck" label-width="100px" size="small" @input="onFormChange" @change="onFormChange">
            <el-form-item label="转换类型" style="margin-bottom:8px;">
              <el-select v-model="localCheck!.condition.operationValue" @change="onFormChange" style="width: 100%;">
                <el-option v-for="type in transformTypes" :key="type.value" :label="type.label" :value="type.value" />
              </el-select>
            </el-form-item>
          </el-form>
        </div>
        
        <!-- 校验类型配置 -->
        <div v-else class="validation-config">
          <h3>校验配置</h3>
          <el-form :model="localCheck" label-width="100px" size="small" @input="onFormChange" @change="onFormChange">
            <el-form-item label="ID" style="margin-bottom:8px;">
              <el-input v-model="localCheck!.id" @input="onFormChange" />
            </el-form-item>
            <el-form-item label="错误码" style="margin-bottom:8px;">
              <el-select 
                v-model="localCheck!.errorCode" 
                filterable 
                placeholder="请选择错误码" 
                @change="onErrorCodeChange"
                style="width: 100%;"
              >
                <el-option v-for="code in errorCodes" :key="code.value" :label="code.label" :value="code.value" />
              </el-select>
            </el-form-item>
            <el-form-item label="错误消息" style="margin-bottom:8px;">
              <el-input 
                v-model="localCheck!.errorDescription" 
                type="textarea" 
                :rows="3"
                @input="onFormChange" 
              />
            </el-form-item>
            <el-form-item label="语言版本" style="margin-bottom:8px;">
              <el-select v-model="currentLanguage" @change="onLanguageChange" style="width: 100px;">
                <el-option label="中文" value="zh" />
                <el-option label="英文" value="en" />
              </el-select>
            </el-form-item>
            
            <!-- 属性值、操作方式、配置值在一行显示 -->
            <el-form-item style="margin-bottom:8px;">
              <div class="validation-row">
                <el-input 
                  v-model="localCheck!.condition.name" 
                  @input="onFormChange"
                  placeholder="点击左侧转换结果树添加属性"
                  readonly
                  style="flex: 4; margin-right: 8px;"
                />
                <el-select 
                  v-model="localCheck!.condition.type" 
                  @change="onFormChange" 
                  style="flex: 2; margin-right: 8px;"
                  placeholder="操作方式"
                >
                  <el-option v-for="op in operationTypes" :key="op.value" :label="op.label" :value="op.value" />
                </el-select>
                
                <!-- 根据操作类型显示不同的配置值输入 -->
                <div v-if="localCheck!.condition.type === 'between'" class="range-input" style="flex: 4;">
                  <el-input 
                    v-model="rangeValues.min" 
                    placeholder="最小值" 
                    @input="onRangeChange"
                    style="width: 45%;"
                  />
                  <span style="margin: 0 10px;">至</span>
                  <el-input 
                    v-model="rangeValues.max" 
                    placeholder="最大值" 
                    @input="onRangeChange"
                    style="width: 45%;"
                  />
                </div>
                <el-input 
                  v-else
                  v-model="localCheck!.condition.value" 
                  @input="onFormChange"
                  :placeholder="getValuePlaceholder()"
                  style="flex: 4;"
                />
              </div>
            </el-form-item>
          </el-form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Refresh, Check, Delete, Document } from '@element-plus/icons-vue';

interface CheckItem {
  id: string;
  errorCode: string;
  errorParams?: string;
  errorDescription?: string;
  errorStatus?: number;
  bizFatal?: boolean;
  severity?: number;
  condition?: any;
  desc?: string;
}

const props = defineProps<{ 
  modelValue: CheckItem[];
  fields?: any[];
  currentField?: any;
  isUnion?: boolean;
}>();
const emit = defineEmits(['update:modelValue']);

const selectedIndex = ref(-1);
const selectedCheck = computed(() => {
  if (selectedIndex.value >= 0 && selectedIndex.value < props.modelValue.length) {
    return props.modelValue[selectedIndex.value];
  }
  return null;
});
const localCheck = ref<CheckItem | null>(null);
const currentLanguage = ref('zh');
const rangeValues = ref({ min: '', max: '' });

// 转换类型列表
const transformTypes = [
  { value: 'Long', label: 'Long' },
  { value: 'String', label: 'String' },
  { value: 'Integer', label: 'Integer' },
  { value: 'Double', label: 'Double' },
  { value: 'Boolean', label: 'Boolean' },
  { value: 'Date', label: '日期' },
  { value: 'DateTime', label: '时间' },
  { value: 'Timestamp', label: '时间戳' },
  { value: 'Email', label: '邮箱' },
  { value: 'IdCard', label: '身份证' },
  { value: 'File', label: '文件' },
  { value: 'Enum', label: '枚举' }
];

// 操作类型列表
const operationTypes = [
  { value: 'eq', label: '等于' },
  { value: 'lt', label: '小于' },
  { value: 'le', label: '小于等于' },
  { value: 'gt', label: '大于' },
  { value: 'ge', label: '大于等于' },
  { value: 'ne', label: '不等于' },
  { value: 'in', label: '在集合' },
  { value: 'notIn', label: '不在集合' },
  { value: 'between', label: '区间' },
  { value: 'contains', label: '包含' },
  { value: 'startsWith', label: '前缀' },
  { value: 'endsWith', label: '后缀' },
  { value: 'regex', label: '正则' }
];

// 错误码列表
const errorCodes = [
  { value: 'VALIDATION_ERROR', label: '验证错误' },
  { value: 'REQUIRED_FIELD', label: '必填字段' },
  { value: 'INVALID_FORMAT', label: '格式错误' },
  { value: 'OUT_OF_RANGE', label: '超出范围' },
  { value: 'DUPLICATE_VALUE', label: '重复值' },
  { value: 'INVALID_TYPE', label: '类型错误' }
];

// 计算属性
const transformChecks = computed(() => {
  return props.modelValue.filter(check => 
    check.condition && check.condition.operationType === 'Z'
  );
});

const validationChecks = computed(() => {
  return props.modelValue.filter(check => 
    !check.condition || check.condition.operationType !== 'Z'
  );
});

const isTransformType = computed(() => {
  return selectedCheck.value && selectedCheck.value.condition && selectedCheck.value.condition.operationType === 'Z';
});

// 监听选中项变化
watch(selectedCheck, (val) => {
  if (!val) {
    localCheck.value = null;
    return;
  }
  
  // 保证condition结构完整
  if (!val.condition || typeof val.condition !== 'object') {
    val.condition = { type: 'eq', name: '', value: '', operationType: 'V' };
  } else {
    if (!('type' in val.condition)) val.condition.type = 'eq';
    if (!('name' in val.condition)) val.condition.name = '';
    if (!('value' in val.condition)) val.condition.value = '';
    if (!('operationType' in val.condition)) val.condition.operationType = 'V';
  }
  
  localCheck.value = JSON.parse(JSON.stringify(val));
  
  // 如果是区间操作，解析范围值
  if (val.condition.type === 'between' && val.condition.value) {
    try {
      const range = JSON.parse(val.condition.value);
      rangeValues.value = { min: range.min || '', max: range.max || '' };
    } catch {
      rangeValues.value = { min: '', max: '' };
    }
  }
}, { immediate: true });

// 方法
function toggleTransform() {
  if (transformChecks.value.length > 0) {
    // 如果已有转换，则删除
    removeCheck(0, 'transform');
  } else {
    // 如果没有转换，则添加
    addTransform();
  }
}

function addTransform() {
  const newList = props.modelValue.slice();
  const newNode: CheckItem = {
    id: '', // 转换类型不需要ID
    errorCode: '',
    errorParams: '',
    errorDescription: '',
    errorStatus: 0,
    bizFatal: false,
    severity: 0,
    condition: { 
      type: 'eq', 
      name: '', 
      value: '', 
      operationType: 'Z',
      operationValue: 'String'
    },
    desc: ''
  };
  
  const insertIdx = selectedIndex.value >= 0 ? selectedIndex.value + 1 : newList.length;
  newList.splice(insertIdx, 0, newNode);
  emit('update:modelValue', newList);
  selectedIndex.value = insertIdx;
  localCheck.value = JSON.parse(JSON.stringify(newNode));
}

function addValidation() {
  const newList = props.modelValue.slice();
  const newNode: CheckItem = {
    id: 'validation_' + Date.now(),
    errorCode: 'VALIDATION_ERROR',
    errorParams: '',
    errorDescription: '请输入错误描述',
    errorStatus: 0,
    bizFatal: false,
    severity: 0,
    condition: { 
      type: 'eq', 
      name: '', 
      value: '', 
      operationType: 'V'
    },
    desc: ''
  };
  
  const insertIdx = selectedIndex.value >= 0 ? selectedIndex.value + 1 : newList.length;
  newList.splice(insertIdx, 0, newNode);
  emit('update:modelValue', newList);
  selectedIndex.value = insertIdx;
  localCheck.value = JSON.parse(JSON.stringify(newNode));
}

function removeCheck(idx: number, type: 'transform' | 'validation') {
  const newList = props.modelValue.slice();
  let targetIndex = -1;
  
  if (type === 'transform') {
    targetIndex = newList.findIndex(item => 
      item.condition && item.condition.operationType === 'Z'
    );
  } else {
    const validationItems = newList.filter(item => 
      !item.condition || item.condition.operationType !== 'Z'
    );
    if (idx < validationItems.length) {
      const targetItem = validationItems[idx];
      targetIndex = newList.findIndex(item => item.id === targetItem.id);
    }
  }
  
  if (targetIndex >= 0) {
    newList.splice(targetIndex, 1);
    emit('update:modelValue', newList);
    
    if (selectedIndex.value >= newList.length) {
      selectedIndex.value = newList.length - 1;
    }
  }
}

function onSelectCheck(row) {
  if (!row) return;
  const idx = props.modelValue.findIndex(item => item.id === row.id);
  selectedIndex.value = idx;
  localCheck.value = row ? JSON.parse(JSON.stringify(row)) : null;
}

function isSelectedCheck(check: CheckItem) {
  return selectedCheck.value && selectedCheck.value.id === check.id;
}

function rowClassName({ row, rowIndex }: { row: CheckItem; rowIndex: number }) {
  const globalIndex = props.modelValue.findIndex(item => item.id === row.id);
  return globalIndex === selectedIndex.value ? 'current-row' : '';
}

function onFormChange() {
  if (!localCheck.value) return;
  if (!localCheck.value.condition) {
    localCheck.value.condition = { type: 'eq', name: '', value: '', operationType: 'V' };
  }
  const newList = props.modelValue.map((item, idx) =>
    idx === selectedIndex.value ? { ...localCheck.value } : item
  );
  emit('update:modelValue', newList);
}

function onErrorCodeChange() {
  // 根据错误码设置默认错误描述
  const errorCode = localCheck.value?.errorCode;
  if (errorCode) {
    const codeItem = errorCodes.find(code => code.value === errorCode);
    if (codeItem) {
      localCheck.value!.errorDescription = codeItem.label;
      onFormChange();
    }
  }
}

function onLanguageChange() {
  // 切换语言版本的逻辑
  onFormChange();
}

function onRangeChange() {
  if (localCheck.value) {
    localCheck.value.condition.value = JSON.stringify(rangeValues.value);
    onFormChange();
  }
}

function getValuePlaceholder() {
  const type = localCheck.value?.condition?.type;
  switch (type) {
    case 'eq': return '请输入比较值';
    case 'in': return '请输入多个值，用逗号分隔';
    case 'regex': return '请输入正则表达式';
    case 'contains': return '请输入包含的字符串';
    default: return '请输入配置值';
  }
}

function getTransformTypeLabel(type: string) {
  const typeItem = transformTypes.find(t => t.value === type);
  return typeItem ? typeItem.label : type || 'String';
}

function getTransformResultTree(check: CheckItem) {
  // 根据转换类型生成属性树
  const type = check.condition?.operationValue || 'String';
  return [
    {
      id: 'root',
      name: '转换结果',
      type: type,
      children: [
        {
          id: 'value',
          name: 'value',
          type: type
        }
      ]
    }
  ];
}

function getDefaultParameterTree() {
  // 根据当前字段和方法参数生成默认参数树
  const currentType = props.currentField?.type || 'String';
  return [
    {
      id: 'default',
      name: '方法参数',
      type: currentType,
      children: [
        {
          id: 'param',
          name: props.currentField?.name || 'parameter',
          type: currentType
        }
      ]
    }
  ];
}

function onTransformNodeClick(node: any, check: CheckItem | undefined) {
  // 点击转换结果树节点，添加到当前选中的校验Check的属性值中
  if (!isTransformType.value && localCheck.value) {
    localCheck.value.condition.name = node.name;
    onFormChange();
  }
}
</script>

<style scoped>
.check-editor {
  width: 100%;
  border-radius: 10px;
  padding: 18px 0 18px 0;
}

.current-row {
  background: #e6f7ff !important;
}

.list-panel {
  box-shadow: 0 1px 4px #0001;
}

.form-panel {
  box-shadow: 0 1px 4px #0001;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}

/* 转换按钮样式 */
.transform-btn {
  background: #f5f5f5 !important;
  border: 1px solid #d9d9d9 !important;
  color: #666 !important;
  transition: all 0.3s ease;
}

.transform-btn:hover {
  background: #e6f7ff !important;
  border-color: #409eff !important;
  color: #409eff !important;
}

.transform-btn.active {
  background: #409eff !important;
  border-color: #409eff !important;
  color: #fff !important;
}

.transform-icon {
  transition: transform 0.3s ease;
}

.transform-icon.rotating {
  animation: rotate 2s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 新增校验按钮样式 */
.add-validation-btn {
  margin-left: auto;
  font-size: 12px;
  padding: 4px 8px;
  height: 24px;
}

.transform-section {
  margin-bottom: 16px;
}

.validation-section {
  flex: 1;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
}

.no-selection {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
}

/* 转换卡片样式 */
.transform-content {
  margin-bottom: 10px;
}

.transform-card {
  background: #f8f9fa;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.transform-card:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.transform-card.selected {
  border-color: #409eff;
  background: #ecf5ff;
}

.transform-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.transform-icon {
  color: #67c23a;
  font-size: 16px;
}

.transform-type {
  font-weight: 600;
  color: #333;
  flex: 1;
}

.delete-btn {
  color: #f56c6c;
  padding: 2px;
}

.delete-btn:hover {
  background: #fef0f0;
}

.transform-tree {
  padding-left: 8px;
}

/* 默认转换样式 */
.default-transform {
  margin-bottom: 10px;
}

.default-transform-card {
  background: #f8f9fa;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 12px;
  opacity: 0.7;
}

.default-transform-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.default-icon {
  color: #909399;
  font-size: 16px;
}

.default-transform-tree {
  padding-left: 8px;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 4px;
}

.property-name {
  color: #409eff;
  font-weight: 500;
}

.property-type {
  color: #666;
  font-size: 12px;
}

/* 校验配置行样式 */
.validation-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.range-input {
  display: flex;
  align-items: center;
  gap: 8px;
}

.transform-config h3,
.validation-config h3 {
  margin: 0 0 16px 0;
  color: #333;
  font-size: 16px;
  font-weight: 600;
}

.el-form-item {
  margin-bottom: 14px;
}

.el-form-item__label {
  color: #555;
  font-weight: 500;
}

:deep(.el-tree-node__content) {
  height: auto;
  padding: 2px 0;
}

:deep(.el-tree-node__content:hover) {
  background-color: #f5f7fa;
}

:deep(.el-tree-node__content.is-current) {
  background-color: #e6f7ff;
}
</style>
