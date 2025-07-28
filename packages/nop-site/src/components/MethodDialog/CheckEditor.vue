<template>
  <div class="check-editor" style="display: flex; gap: 20px; height: 520px; align-items: flex-start;">
    <div class="list-panel" style="flex: 1; min-width: 472px; max-width: 520px; background: #fff; box-shadow: none; border-radius: 0; padding: 16px 8px; overflow: hidden; height: 480px; display: flex; flex-direction: column;">
      <el-button type="primary" size="small" style="margin-bottom: 10px; width: 100%;" @click="addCheck">新增Check</el-button>
      <el-table :data="props.modelValue" size="small" border highlight-current-row :row-class-name="rowClassName" @current-change="onSelectCheck" :row-key="row => row.id" style="width:100%; border-radius: 0; box-shadow: none; border: none; flex: 1 1 auto; overflow: hidden; max-height: 400px; background: #fff;">
        <el-table-column prop="id" label="ID" width="120" />
        <el-table-column prop="errorCode" label="错误码" width="120" />
        <el-table-column label="操作" width="80">
          <template #default="scope">
            <el-button type="text" size="small" @click.stop="removeCheck(scope.$index)">删除</el-button>
          </template>
        </el-table-column>
        <el-table-column label="类型/值" width="120">
          <template #default="scope">
            <span v-if="scope.row.condition && scope.row.condition.operationType === 'Z'" style="color:#67c23a;font-weight:bold;">
              <el-icon style="vertical-align:middle;"><i class="el-icon-refresh"></i></el-icon>
              转换:{{ scope.row.condition.operationValue }}
            </span>
            <span v-else>
              {{ scope.row.condition && scope.row.condition.operationValue ? scope.row.condition.operationValue : '' }}
            </span>
          </template>
        </el-table-column>
      </el-table>
    </div>
    <div class="form-panel" style="flex: 2; min-width: 520px; background: #fff; box-shadow: none; border-radius: 0; padding: 18px 24px; min-height: 480px; display: flex; flex-direction: column; justify-content: flex-start;">
      <el-form :model="localCheck" label-width="100px" size="small" @input="onFormChange" @change="onFormChange">
        <el-form-item label="ID" style="margin-bottom:8px;">
          <el-input v-model="localCheck.id" @input="onFormChange" />
        </el-form-item>
        <el-form-item label="序号" style="margin-bottom:8px;">
          <el-input-number v-model="localCheck.severity" :min="0" style="width:100%" @change="onFormChange" />
        </el-form-item>
        <el-form-item label="错误码" style="margin-bottom:8px;">
          <el-input v-model="localCheck.errorCode" @input="onFormChange" />
        </el-form-item>
        <el-form-item label="错误参数" style="margin-bottom:8px;">
          <el-input v-model="localCheck.errorParams" @input="onFormChange" />
        </el-form-item>
        <el-form-item label="错误描述" style="margin-bottom:8px;">
          <el-input v-model="localCheck.errorDescription" @input="onFormChange" />
        </el-form-item>
        <el-form-item label="转换/校验" style="margin-bottom:8px;">
          <FilterConditionEditor
            v-if="localCheck && localCheck.condition"
            :model-value="localCheck!.condition"
            @update:modelValue="val => { localCheck!.condition = val; onFormChange(); }"
            :fields="props.fields"
            :current-field="props.currentField"
            :can-remove="false"
          />
        </el-form-item>
      </el-form>
      <div v-if="!props.isUnion" class="current-structure-box" style="margin-top:10px; border-radius:0; box-shadow:none; background: #fff; min-height:60px; max-height:120px; padding:8px 10px; overflow:auto;">
        <div style="font-weight:bold;margin-bottom:2px; color:#333;">当前校验节点数据结构：</div>
        <pre style="font-size:13px;line-height:1.5;white-space:pre-wrap; color:#444;word-break:break-all;">{{ currentStructureStr }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { QuillEditor } from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.snow.css'
import FilterConditionEditor from './FilterConditionEditor.vue';

interface CheckItem {
  id: string;
  errorCode: string;
  errorParams?: string;
  errorDescription?: string;
  errorStatus?: number;
  bizFatal?: boolean;
  severity?: number;
  condition?: any;
  desc?: string; // 新增说明属性
}

const props = defineProps<{ 
  modelValue: CheckItem[];
  fields?: any[];
  currentField?: any;
  isUnion?: boolean; // 是否为高级校验器
}>();
const emit = defineEmits(['update:modelValue']);

const selectedIndex = ref(0);
const selectedCheck = computed(() => props.modelValue[selectedIndex.value] || null);
const localCheck = ref<CheckItem | null>(null);

watch(selectedCheck, (val) => {
  if (!val) {
    localCheck.value = null;
    return;
  }
  // 保证condition结构完整
  if (!val.condition || typeof val.condition !== 'object') {
    val.condition = { type: 'eq', name: '', value: '' };
  } else {
    if (!('type' in val.condition)) val.condition.type = 'eq';
    if (!('name' in val.condition)) val.condition.name = '';
    if (!('value' in val.condition)) val.condition.value = '';
  }
  localCheck.value = JSON.parse(JSON.stringify(val));
}, { immediate: true });

function addCheck() {
  const newList = props.modelValue.slice();
  const newNode: CheckItem = {
    id: 'check_' + Date.now(),
    errorCode: '',
    errorParams: '',
    errorDescription: '',
    errorStatus: 0,
    bizFatal: false,
    severity: 0,
    condition: { type: 'eq', name: '', value: '' },
    desc: ''
  };
  const insertIdx = selectedIndex.value >= 0 ? selectedIndex.value + 1 : newList.length;
  newList.splice(insertIdx, 0, newNode);
  emit('update:modelValue', newList);
  selectedIndex.value = insertIdx;
  localCheck.value = JSON.parse(JSON.stringify(newNode));
}
function removeCheck(idx: number) {
  const newList = props.modelValue.slice();
  newList.splice(idx, 1);
  emit('update:modelValue', newList);
  if (selectedIndex.value >= newList.length) {
    selectedIndex.value = newList.length - 1;
  }
}
function onSelectCheck(row) {
  if (!row) return;
  const idx = props.modelValue.findIndex(item => item.id === row.id);
  selectedIndex.value = idx;
  localCheck.value = row ? JSON.parse(JSON.stringify(row)) : null;
}
function rowClassName({ row, rowIndex }: { row: CheckItem; rowIndex: number }) {
  return rowIndex === selectedIndex.value ? 'current-row' : '';
}
function onFormChange() {
  if (!localCheck.value) return;
  if (!localCheck.value.condition) {
    localCheck.value.condition = { type: 'eq', name: '', value: '' };
  }
  const newList = props.modelValue.map((item, idx) =>
    idx === selectedIndex.value ? { ...localCheck.value } : item
  );
  emit('update:modelValue', newList);
}

// 模拟原始结构
const originStructure = ref<{ type: string; example: any }>({ type: 'String', example: 'abc' });

// 计算当前结构
const currentStructure = computed(() => {
  let structure = originStructure.value;
  for (let i = 0; i <= selectedIndex.value; i++) {
    const check = props.modelValue[i];
    if (check && check.condition && check.condition.operationType === 'Z') {
      structure = getStructureByType(check.condition.operationValue);
    }
  }
  return structure;
});
const currentStructureStr = computed(() => JSON.stringify(currentStructure.value, null, 2));

function getStructureByType(type) {
  // 可根据type返回不同的结构
  if (type === 'Long') return { type: 'Long', example: 123 };
  if (type === 'String') return { type: 'String', example: 'abc' };
  if (type === 'Integer') return { type: 'Integer', example: 1 };
  if (type === 'Double') return { type: 'Double', example: 1.23 };
  if (type === 'Boolean') return { type: 'Boolean', example: true };
  if (type === 'Date') return { type: 'Date', example: '2023-01-01' };
  if (type === 'DateTime') return { type: 'DateTime', example: '2023-01-01 12:00:00' };
  if (type === 'Timestamp') return { type: 'Timestamp', example: 1680000000000 };
  if (type === 'Email') return { type: 'Email', example: 'a@b.com' };
  if (type === 'IdCard') return { type: 'IdCard', example: '123456789012345678' };
  if (type === 'File') return { type: 'File', example: 'file.txt' };
  if (type === 'Enum') return { type: 'Enum', example: 'A' };
  return { type: type || 'Unknown', example: '' };
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
.current-structure-box {
  background: #f8fafc;
}
.el-form-item {
  margin-bottom: 14px;
}
.el-form-item__label {
  color: #555;
  font-weight: 500;
}
</style>
