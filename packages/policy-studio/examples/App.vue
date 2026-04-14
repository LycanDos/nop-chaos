<template>
  <div class="app">
    <PolicyStudio
      v-model="document"
      :field-mapping="fieldMapping"
      @export-xml="xml = $event"
      @export-json="json = $event"
    />
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import PolicyStudio from '../src/components/PolicyStudio.vue'
import type { FieldMapping, PolicyDocument } from '../src/types'

const fieldMapping: FieldMapping = {
  entities: new Map([
    ['order', {
      entityName: 'order',
      displayName: '订单',
      fields: new Map([
        ['customerName', { name: 'customerName', displayName: '客户名称', type: 'string', path: 'order.customerName', aliases: ['用户名', '客户名'], searchable: true }],
        ['mobile', { name: 'mobile', displayName: '手机号', type: 'string', path: 'order.mobile', aliases: ['手机'], searchable: true }],
        ['age', { name: 'age', displayName: '年龄', type: 'integer', path: 'order.age', aliases: ['客户年龄'], searchable: true }],
        ['needInvoice', { name: 'needInvoice', displayName: '需要发票', type: 'boolean', path: 'order.needInvoice', aliases: ['开票'], searchable: true }]
      ]),
      relations: new Map()
    }],
    ['invoice', {
      entityName: 'invoice',
      displayName: '发票',
      fields: new Map([
        ['title', { name: 'title', displayName: '发票抬头', type: 'string', path: 'invoice.title', aliases: ['抬头'], searchable: true }],
        ['taxNo', { name: 'taxNo', displayName: '税号', type: 'string', path: 'invoice.taxNo', aliases: ['纳税人识别号'], searchable: true }]
      ]),
      relations: new Map()
    }]
  ]),
  globalFields: new Map([
    ['order.customerName', { name: 'customerName', displayName: '客户名称', type: 'string', path: 'order.customerName', aliases: ['用户名', '客户名'], searchable: true }],
    ['order.mobile', { name: 'mobile', displayName: '手机号', type: 'string', path: 'order.mobile', aliases: ['手机'], searchable: true }],
    ['order.age', { name: 'age', displayName: '年龄', type: 'integer', path: 'order.age', aliases: ['客户年龄'], searchable: true }],
    ['order.needInvoice', { name: 'needInvoice', displayName: '需要发票', type: 'boolean', path: 'order.needInvoice', aliases: ['开票'], searchable: true }],
    ['invoice.title', { name: 'title', displayName: '发票抬头', type: 'string', path: 'invoice.title', aliases: ['抬头'], searchable: true }],
    ['invoice.taxNo', { name: 'taxNo', displayName: '税号', type: 'string', path: 'invoice.taxNo', aliases: ['纳税人识别号'], searchable: true }]
  ]),
  pathAliases: new Map()
}

const document = reactive<PolicyDocument>({
  id: 'policy-order-review',
  name: '订单审核节点策略',
  targetSchema: '/l/process/schema/order-review-policy.xdef',
  description: '演示 BASE/PARTNER/NODE/INSTANCE 四层规则叠加',
  layers: [
    {
      id: 'layer-base',
      name: '基础规则',
      layerType: 'BASE',
      orderNo: 100,
      editable: false,
      rules: [
        { id: 'base-age-range', path: 'order.age', operator: 'between', enabled: true, orderNo: 10, min: 0, max: 100, severity: 5 },
        { id: 'base-mobile-regex', path: 'order.mobile', operator: 'regex', enabled: true, orderNo: 20, pattern: '^1[3-9]\\d{9}$', severity: 8 },
        { id: 'base-name-required', path: 'order.customerName', operator: 'required', enabled: true, orderNo: 30, severity: 6 }
      ]
    },
    {
      id: 'layer-partner',
      name: '三方规则',
      layerType: 'PARTNER',
      orderNo: 200,
      editable: true,
      rules: [
        { id: 'partner-age-tighten', path: 'order.age', operator: 'between', enabled: true, orderNo: 10, min: 18, max: 60, severity: 7 },
        { id: 'partner-mobile-lock', path: 'order.mobile', operator: 'locked', enabled: true, orderNo: 20, lockedValue: '13800000000', lockMode: 'MUST_EQUAL_PREFILL', severity: 9 }
      ]
    },
    {
      id: 'layer-node',
      name: '节点规则',
      layerType: 'NODE',
      orderNo: 300,
      editable: true,
      rules: [
        { id: 'node-invoice-title-required', path: 'invoice.title', operator: 'required', enabled: true, orderNo: 10, severity: 6, applyWhen: { id: 'if-1', type: 'simple', operator: 'eq', field: 'order.needInvoice', value: 'true' } }
      ]
    },
    {
      id: 'layer-instance',
      name: '实例规则',
      layerType: 'INSTANCE',
      orderNo: 400,
      editable: true,
      rules: [
        { id: 'instance-default-name', path: 'order.customerName', operator: 'default', enabled: true, orderNo: 10, defaultValue: '三方预填客户', severity: 3 }
      ]
    }
  ]
})

const xml = ref('')
const json = ref('')

defineExpose({
  getXml: () => xml.value,
  getJson: () => json.value
})
</script>

<style>
html, body, #app {
  margin: 0;
  height: 100%;
}

.app {
  height: 100%;
  padding: 16px;
  background: #f5f7fa;
}
</style>
