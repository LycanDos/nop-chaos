<script setup lang="ts">
import { useFieldRef } from '@/designer/utils/ElementUtil.ts'

defineOptions({
  name: 'EmailTask',
})
const form = { labelPosition: 'right', size: 'small' }
const to = useFieldRef('to')
const cc = useFieldRef('cc')
const bcc = useFieldRef('bcc')
const subject = useFieldRef('subject')
const text = useFieldRef('text')
</script>

<template>
  <a-collapse-panel key="arg1" header="邮件">
    <a-form-item label="收件人">
      <a-select v-model:value="to" multiple showSearch allow-create allowClear placeholder="请选择收件人">
        <a-select-option value="zhangsan@qq.com">张三</a-select-option>
        <a-select-option value="lisi@qq.com">李四</a-select-option>
        <a-select-option value="wangwu@qq.com">王五</a-select-option>
        <a-select-option value="maoliu@qq.com">毛六</a-select-option>
        <a-select-option value="qianqi@qq.com">钱七</a-select-option>
      </a-select>
    </a-form-item>
    <a-form-item label="主题">
      <a-input v-model:value="subject" placeholder="请输入主题" />
    </a-form-item>
    <a-form-item label="内容">
      <a-input v-model:value="text" type="textarea" :rows="4" placeholder="请输入内容" />
    </a-form-item>
    <a-row :gutter="10">
      <a-col :span="form?.labelPosition === 'top' ? 12 : 24">
        <a-form-item label="抄送">
          <a-select
            v-model:value="cc"
            collapse-tags
            collapse-tags-tooltip
            multiple
            showSearch
            allow-create
            allowClear
            placeholder="请选择抄送人"
          >
            <a-select-option value="zhangsan@qq.com">张三</a-select-option>
            <a-select-option value="lisi@qq.com">李四</a-select-option>
            <a-select-option value="wangwu@qq.com">王五</a-select-option>
            <a-select-option value="maoliu@qq.com">毛六</a-select-option>
            <a-select-option value="qianqi@qq.com">钱七</a-select-option>
          </a-select>
        </a-form-item>
      </a-col>
      <a-col :span="form?.labelPosition === 'top' ? 12 : 24">
        <a-form-item label="密送">
          <a-select
            v-model:value="bcc"
            collapse-tags
            collapse-tags-tooltip
            multiple
            showSearch
            allow-create
            allowClear
            placeholder="请选择密送人"
          >
            <a-select-option value="zhangsan@qq.com">张三</a-select-option>
            <a-select-option value="lisi@qq.com">李四</a-select-option>
            <a-select-option value="wangwu@qq.com">王五</a-select-option>
            <a-select-option value="maoliu@qq.com">毛六</a-select-option>
            <a-select-option value="qianqi@qq.com">钱七</a-select-option>
          </a-select>
        </a-form-item>
      </a-col>
    </a-row>
  </a-collapse-panel>
</template>

<style scoped lang="scss"></style>
