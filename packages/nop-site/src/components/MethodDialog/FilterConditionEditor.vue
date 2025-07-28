<template>
  <div class="filter-condition-editor">
    <div v-if="hasFields" class="validator-form">
      <div class="form-row">
        <label>操作类型：</label>
        <el-select v-model="operationType" placeholder="请选择操作类型" style="width: 150px;">
          <el-option v-for="op in operationTypeList" :key="op.value" :label="op.label" :value="op.value" />
        </el-select>
      </div>
      <div class="form-row">
        <label>操作值：</label>
        <el-select v-model="operationValue" placeholder="请选择操作值" style="width: 150px;">
          <el-option v-for="val in currentOperationValues" :key="val.value" :label="val.label" :value="val.value" />
        </el-select>
        <button v-if="canRemove" class="remove-btn" @click="$emit('remove')">删除</button>
      </div>
      <div class="form-row">
        <label>值：</label>
        <input v-model="localValue.value.value" style="width: 200px;" />
      </div>
    </div>
    <div v-else class="code-editor">
      <div class="code-area">
        <label>校验代码：</label>
        <textarea v-model="localValue.value.code" placeholder="请输入Java校验代码" rows="8" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, defineOptions } from 'vue';
defineOptions({ name: 'FilterConditionEditor' });
const props = defineProps({
  modelValue: { type: Object, required: true },
  canRemove: { type: Boolean, default: false },
  fields: { type: Array, default: () => [] },
  // 新增：当前选中的字段信息
  currentField: { type: Object, default: null }
});
const emit = defineEmits(['update:modelValue', 'remove']);

const localValue = ref(
  typeof props.modelValue === 'object' && props.modelValue !== null
    ? JSON.parse(JSON.stringify(props.modelValue))
    : { type: 'eq', name: '', value: '', code: '' }
);

// 操作类型相关
const operationType = ref('V');
const operationValue = ref('');

// 操作类型列表
const operationTypeList = ref([
  { value: 'V', label: '普通校验' },
  { value: 'Z', label: '转换' }
]);

// 操作值列表
const operationValues = {
  V: [
    { value: 'eq', label: '等于' },
    { value: 'lt', label: '小于' },
    { value: 'le', label: '小于等于' },
    { value: 'gt', label: '大于' },
    { value: 'ge', label: '大于等于' },
    { value: 'ne', label: '不等于' },
    { value: 'in', label: '在集合' },
    { value: 'notIn', label: '不在集合' },
    { value: 'between', label: '区间' },
    { value: 'isNull', label: '为null' },
    { value: 'notNull', label: '不为null' },
    { value: 'alwaysTrue', label: '恒为真' },
    { value: 'alwaysFalse', label: '恒为假' },
    { value: 'contains', label: '包含' },
    { value: 'startsWith', label: '前缀' },
    { value: 'endsWith', label: '后缀' },
    { value: 'regex', label: '正则' },
    { value: 'isTrue', label: '为真' },
    { value: 'isFalse', label: '为假' },
    { value: 'notTrue', label: '不为真' },
    { value: 'notFalse', label: '不为假' }
  ],
  Z: [
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
  ]
};

// 当前操作类型对应的值列表
const currentOperationValues = computed(() => {
  return operationValues[operationType.value];
});

// 判断是否有字段属性 - 移到watch之前
const hasFields = computed(() => {
  return props.fields && props.fields.length > 0;
});

// 判断字段是否可编辑（当有currentField时，字段名不可编辑）
const isFieldEditable = computed(() => {
  return !props.currentField;
});

watch(() => props.modelValue, v => {
  if (typeof v !== 'object' || v === null) {
    localValue.value = { type: 'eq', name: '', value: '', code: '' };
    operationType.value = 'V';
    operationValue.value = '';
  } else {
    localValue.value = { 
      type: v.type || 'eq', 
      name: v.name || '', 
      value: v.value || '', 
      code: v.code || ''
    };
    operationType.value = v.operationType || 'V';
    operationValue.value = v.operationValue || '';
  }
}, { immediate: true });

// 监听当前字段变化，自动填入字段名
watch(() => props.currentField, (field) => {
  if (field && field.name && hasFields.value) {
    localValue.value.name = field.name;
    saveCondition();
  }
}, { immediate: true });

// 监听操作类型变化
watch(operationType, (newType) => {
  operationValue.value = ''; // 操作类型变化时，重置操作值
  saveCondition();
});

// 监听操作值变化
watch(operationValue, (newVal) => {
  saveCondition();
});

function saveCondition() {
  const dataToEmit = {
    ...localValue.value,
    operationType: operationType.value,
    operationValue: operationValue.value
  };
  emit('update:modelValue', dataToEmit);
}
</script>

<style scoped>
.filter-condition-editor {
  margin-bottom: 8px;
  padding: 8px;
  background: #fafbfc;
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.03);
}
.validator-form, .code-editor {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.form-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.form-row label {
  width: 50px;
  text-align: right;
  color: #666;
  white-space: nowrap;
  font-size: 13px;
}
input {
  border: 1px solid #dcdfe6;
  border-radius: 3px;
  padding: 2px 6px;
  font-size: 13px;
  min-width: 80px;
}
input[readonly] {
  background-color: #f5f5f5;
  color: #666;
}
.remove-btn {
  background: #f56c6c;
  color: #fff;
  border: none;
  border-radius: 3px;
  padding: 2px 8px;
  cursor: pointer;
  font-size: 12px;
  align-self: flex-start;
}
.remove-btn:hover {
  background: #ff7875;
}
.path-display {
  display: flex;
  align-items: center;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  color: #333;
  background: #f8f9fa;
  border: 1px solid #dcdfe6;
  border-radius: 3px;
  padding: 2px 6px;
  min-width: 200px;
}
.path-prefix {
  color: #666;
}
.path-full {
  color: #409eff;
  font-weight: bold;
  background: #ecf5ff;
  padding: 1px 4px;
  border-radius: 2px;
  margin: 0 2px;
}
.path-info {
  margin-top: 8px;
  padding: 6px 8px;
  background: #f0f9ff;
  border: 1px solid #b3d8ff;
  border-radius: 4px;
  font-size: 12px;
}
.path-label {
  color: #666;
  margin-right: 8px;
}
.path-value {
  color: #409eff;
  font-weight: bold;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}
.code-area {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.code-area label {
  color: #666;
  font-weight: bold;
  font-size: 13px;
}
textarea {
  border: 1px solid #dcdfe6;
  border-radius: 3px;
  padding: 6px;
  font-size: 13px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  background-color: #f8f9fa;
  resize: vertical;
}
</style> 