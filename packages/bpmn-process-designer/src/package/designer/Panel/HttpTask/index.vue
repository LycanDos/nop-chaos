<script setup lang="ts">
import { useFieldRef } from '@/designer/utils/ElementUtil.ts'
import Codemirror from '@/components/CodemirrorEditor/index.vue'
import jsonSupport from '@/components/CodemirrorEditor/language/json'

defineOptions({
  name: 'HttpTask',
})
const form = { labelPosition: 'right', size: 'small' }
const requestMethod = useFieldRef('requestMethod')
const requestUrl = useFieldRef('requestUrl')
const requestHeaders = useFieldRef('requestHeaders')
const requestBody = useFieldRef('requestBody')
const ignoreException = useFieldRef('ignoreException')
const disallowRedirects = useFieldRef('disallowRedirects')
const saveResponseVariableAsJson = useFieldRef('saveResponseVariableAsJson')
const saveResponseParametersTransient = useFieldRef('saveResponseParametersTransient')
</script>

<template>
  <a-collapse-panel key="arg1" header="请求">
    <a-form-item label="请求地址">
      <a-input v-model:value="requestUrl" placeholder="请输入请求地址">
        <template #prepend>
          <a-select
            v-model:value="requestMethod"
            placeholder="请求方法"
            :style="{ width: form?.size === 'small' ? '77px' : '95px' }"
          >
            <a-select-option value="GET">GET</a-select-option>
            <a-select-option value="POST">POST</a-select-option>
            <a-select-option value="PUT">PUT</a-select-option>
            <a-select-option value="DELETE">DELETE</a-select-option>
          </a-select>
        </template>
      </a-input>
    </a-form-item>
    <a-form-item label="请求头">
      <Codemirror
        :rows="4"
        :max-rows="6"
        autosize
        popup
        placeholder="请输入请求头"
        :extensions="[jsonSupport]"
        v-model="requestHeaders"
      />
      <!--      <a-input v-model:value="requestHeaders" type="textarea" :rows="3" placeholder="请输入请求头" />-->
    </a-form-item>
    <a-form-item label="请求体">
      <Codemirror
        :rows="4"
        :max-rows="6"
        autosize
        popup
        placeholder="请输入请求体"
        :extensions="[jsonSupport]"
        v-model="requestBody"
      />
      <!--      <a-input v-model:value="requestBody" type="textarea" :rows="3" placeholder="请输入请求体" />-->
    </a-form-item>
    <a-row :gutter="10">
      <a-col :span="form?.labelPosition === 'top' ? 12 : 24">
        <a-form-item label="忽略异常">
          <a-switch v-model:checked="ignoreException" active-value="true" inactive-value="false" />
        </a-form-item>
      </a-col>
      <a-col :span="form?.labelPosition === 'top' ? 12 : 24">
        <a-form-item label="禁止重定向">
          <a-switch v-model:checked="disallowRedirects" active-value="true" inactive-value="false" />
        </a-form-item>
      </a-col>
      <a-col :span="form?.labelPosition === 'top' ? 12 : 24">
        <a-form-item label="保存响应变量为JSON">
          <a-switch
            v-model:checked="saveResponseVariableAsJson"
            active-value="true"
            inactive-value="false"
          />
        </a-form-item>
      </a-col>
      <a-col :span="form?.labelPosition === 'top' ? 12 : 24">
        <a-form-item label="保存响应参数为瞬时">
          <a-switch
            v-model:checked="saveResponseParametersTransient"
            active-value="true"
            inactive-value="false"
          />
        </a-form-item>
      </a-col>
    </a-row>
  </a-collapse-panel>
</template>

<style scoped lang="scss"></style>
