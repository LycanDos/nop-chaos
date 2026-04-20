<template>
  <div class="app">
    <el-alert
      class="guide"
      type="info"
      show-icon
      :closable="false"
      title="支持 ?id=demo / ?id=campaign，也支持 ?resolver=/api/policy-bundle&id=xxx，或直接传 schema/document/rules/sampleData JSON 参数。加载弹窗里也提供示例 Bundle。"
    />

    <el-alert
      v-if="loadError"
      class="guide"
      type="error"
      show-icon
      :closable="false"
      :title="loadError"
    />

    <div v-loading="loading" class="studio-shell">
      <PolicyStudio
        v-model="document"
        :schema="schema"
        :sample-data="sampleData"
        :sample-bundles="sampleBundles"
        @update:sample-data="sampleData = $event"
        @export-xml="xml = $event"
        @export-json="json = $event"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PolicyStudio from '../src/components/PolicyStudio.vue'
import type { PolicyBundle, PolicyDocument, PolicyRule, PolicySchema } from '../src/types'

interface PolicyStudioViewPayload {
  schema: PolicySchema
  document: PolicyDocument
  sampleData?: Record<string, any>
}

const xml = ref('')
const json = ref('')
const loading = ref(false)
const loadError = ref('')

const defaultPayload = createDemoPayload()
const schema = ref<PolicySchema>(defaultPayload.schema)
const document = ref<PolicyDocument>(defaultPayload.document)
const sampleData = ref<Record<string, any>>(defaultPayload.sampleData || {})
const sampleBundles = ref([
  {
    id: 'demo',
    name: '订单审批 Bundle',
    bundle: toBundle('demo', '订单审批 Bundle', createDemoPayload())
  },
  {
    id: 'campaign',
    name: '营销活动 Bundle',
    bundle: toBundle('campaign', '营销活动 Bundle', createCampaignPayload())
  }
])

const mockViews: Record<string, PolicyStudioViewPayload> = {
  demo: createDemoPayload(),
  campaign: createCampaignPayload()
}

onMounted(async () => {
  loading.value = true
  loadError.value = ''
  try {
    const payload = await resolvePayloadFromUrl()
    schema.value = payload.schema
    document.value = payload.document
    sampleData.value = payload.sampleData || payload.schema.sampleData || {}
  }
  catch (error) {
    loadError.value = error instanceof Error ? error.message : '加载预览数据失败'
  }
  finally {
    loading.value = false
  }
})

async function resolvePayloadFromUrl(): Promise<PolicyStudioViewPayload> {
  const params = new URLSearchParams(window.location.search)
  const payloadParam = params.get('payload')
  if (payloadParam) {
    return JSON.parse(payloadParam)
  }

  const schemaParam = params.get('schema')
  const documentParam = params.get('document')
  const rulesParam = params.get('rules')
  const sampleDataParam = params.get('sampleData')

  if (schemaParam || documentParam || rulesParam || sampleDataParam) {
    const parsedSchema = schemaParam ? JSON.parse(schemaParam) as PolicySchema : schema.value
    const parsedDocument = documentParam
      ? JSON.parse(documentParam) as PolicyDocument
      : coerceDocument(rulesParam ? JSON.parse(rulesParam) as PolicyRule[] | PolicyDocument : document.value)

    return {
      schema: parsedSchema,
      document: parsedDocument,
      sampleData: sampleDataParam ? JSON.parse(sampleDataParam) : (parsedSchema.sampleData || sampleData.value)
    }
  }

  const id = params.get('id')
  if (!id)
    return defaultPayload

  return fetchViewPayload(id, params.get('resolver'))
}

async function fetchViewPayload(id: string, resolver: string | null): Promise<PolicyStudioViewPayload> {
  if (resolver) {
    const url = new URL(resolver, window.location.origin)
    url.searchParams.set('id', id)
    const response = await fetch(url.toString())
    if (!response.ok)
      throw new Error(`远程策略预览加载失败: ${response.status}`)
    return await response.json()
  }

  const localPayload = mockViews[id]
  if (localPayload)
    return localPayload

  throw new Error(`未找到 id=${id} 对应的预览数据，请提供 resolver 或使用内置 demo/campaign`)
}

function coerceDocument(value: PolicyRule[] | PolicyDocument): PolicyDocument {
  if (!Array.isArray(value))
    return value

  return {
    id: 'policy-preview-from-rules',
    name: '页面传入校验预览',
    description: '由 URL rules 参数生成',
    version: '1.0.0',
    layers: [
      {
        id: 'layer-preview',
        name: '预览校验',
        layerType: 'PREVIEW',
        orderNo: 100,
        editable: true,
        rules: value
      }
    ]
  }
}

function createDemoPayload(): PolicyStudioViewPayload {
  const demoSchema: PolicySchema = {
    id: 'order-policy-schema',
    name: '订单审批策略 Schema',
    description: '覆盖 string/number/integer/boolean/date/time/datetime，以及对象、数组和多级嵌套结构。',
    rootLabel: '订单审批示例数据',
    fields: [
      {
        name: 'order',
        label: '订单',
        path: 'order',
        type: 'object',
        fields: [
          { name: 'orderNo', label: '订单号', path: 'order.orderNo', type: 'string', required: true, aliases: ['单号'] },
          {
            name: 'status',
            label: '订单状态',
            path: 'order.status',
            type: 'string',
            options: [
              { label: '草稿', value: 'draft' },
              { label: '已提交', value: 'submitted' },
              { label: '已支付', value: 'paid' },
              { label: '已关闭', value: 'closed' }
            ]
          },
          { name: 'amount', label: '订单金额', path: 'order.amount', type: 'number' },
          { name: 'quantity', label: '商品数量', path: 'order.quantity', type: 'integer' },
          { name: 'needInvoice', label: '是否开票', path: 'order.needInvoice', type: 'boolean' },
          { name: 'submitDate', label: '提交日期', path: 'order.submitDate', type: 'string', format: 'date' },
          { name: 'submitTime', label: '提交时间', path: 'order.submitTime', type: 'string', format: 'time' },
          { name: 'submitAt', label: '提交时间戳', path: 'order.submitAt', type: 'string', format: 'datetime' },
          {
            name: 'tags',
            label: '订单标签',
            path: 'order.tags',
            type: 'array',
            item: {
              name: 'tag',
              label: '标签',
              path: 'order.tags[]',
              type: 'string',
              options: [
                { label: '加急', value: 'urgent' },
                { label: '风控', value: 'risk' },
                { label: 'VIP', value: 'vip' },
                { label: '阻断', value: 'blocked' }
              ]
            }
          },
          {
            name: 'items',
            label: '订单明细',
            path: 'order.items',
            type: 'array',
            item: {
              name: 'item',
              label: '明细',
              path: 'order.items[]',
              type: 'object',
              fields: [
                { name: 'sku', label: 'SKU', path: 'order.items[].sku', type: 'string' },
                { name: 'qty', label: '数量', path: 'order.items[].qty', type: 'integer' },
                { name: 'deliveryAt', label: '期望送达', path: 'order.items[].deliveryAt', type: 'string', format: 'datetime' }
              ]
            }
          }
        ]
      },
      {
        name: 'customer',
        label: '客户',
        path: 'customer',
        type: 'object',
        fields: [
          { name: 'name', label: '客户名称', path: 'customer.name', type: 'string', aliases: ['用户名', '客户名'] },
          { name: 'mobile', label: '手机号', path: 'customer.mobile', type: 'string' },
          {
            name: 'vipLevel',
            label: '会员等级',
            path: 'customer.vipLevel',
            type: 'string',
            options: [
              { label: '普通', value: 'normal' },
              { label: '银卡', value: 'silver' },
              { label: '金卡', value: 'gold' }
            ]
          },
          {
            name: 'profile',
            label: '客户画像',
            path: 'customer.profile',
            type: 'object',
            fields: [
              { name: 'score', label: '画像分', path: 'customer.profile.score', type: 'number' },
              { name: 'birthday', label: '生日', path: 'customer.profile.birthday', type: 'string', format: 'date' }
            ]
          }
        ]
      },
      {
        name: 'risk',
        label: '风控',
        path: 'risk',
        type: 'object',
        fields: [
          { name: 'channel', label: '渠道', path: 'risk.channel', type: 'string' },
          { name: 'reviewAt', label: '审核时间', path: 'risk.reviewAt', type: 'string', format: 'datetime' },
          { name: 'operatorNote', label: '审核备注', path: 'risk.operatorNote', type: 'string', format: 'textarea' }
        ]
      }
    ],
    sampleData: {
      order: {
        orderNo: 'SO-2026-0001',
        status: 'submitted',
        amount: 2888.5,
        quantity: 3,
        needInvoice: true,
        submitDate: '2026-04-15',
        submitTime: '10:15:00',
        submitAt: '2026-04-15 10:15:00',
        tags: ['urgent', 'vip'],
        items: [
          { sku: 'SKU-1001', qty: 1, deliveryAt: '2026-04-16 09:30:00' },
          { sku: 'SKU-1002', qty: 2, deliveryAt: '2026-04-16 11:00:00' }
        ]
      },
      customer: {
        name: '张三',
        mobile: '13812345678',
        vipLevel: 'gold',
        profile: {
          score: 91.5,
          birthday: '1990-08-18'
        }
      },
      risk: {
        channel: 'partner-a',
        reviewAt: '2026-04-15 10:20:00',
        operatorNote: '历史下单稳定'
      }
    }
  }

  const demoDocument: PolicyDocument = {
    id: 'policy-order-review',
    name: '订单审核节点策略',
    targetSchema: '/l/process/schema/order-review-policy.xdef',
    description: '演示多层校验叠加、日期时间编辑器以及开放预览入口。',
    version: '1.0.0',
    layers: [
      {
        id: 'layer-base',
        name: '基础校验',
        layerType: 'BASE',
        orderNo: 100,
        editable: false,
        rules: [
          { id: 'base-order-required', path: 'order.orderNo', operator: 'notNull', enabled: true, orderNo: 10, severity: 6 },
          { id: 'base-amount-range', path: 'order.amount', operator: 'between', enabled: true, orderNo: 20, min: 0, max: 100000, severity: 6 },
          { id: 'base-submit-date', path: 'order.submitDate', operator: 'between', enabled: true, orderNo: 30, min: '2026-01-01', max: '2026-12-31', severity: 5 },
          { id: 'base-submit-time', path: 'order.submitTime', operator: 'between', enabled: true, orderNo: 40, min: '09:00:00', max: '18:00:00', severity: 5 },
          { id: 'base-status-set', path: 'order.status', operator: 'in', enabled: true, orderNo: 50, values: ['submitted', 'paid'], severity: 6 }
        ]
      },
      {
        id: 'layer-partner',
        name: '合作方校验',
        layerType: 'PARTNER',
        orderNo: 200,
        editable: true,
        rules: [
          { id: 'partner-amount-tighten', path: 'order.amount', operator: 'ge', enabled: true, orderNo: 10, value: 100, severity: 7 },
          { id: 'partner-tags-block', path: 'order.tags[]', operator: 'notIn', enabled: true, orderNo: 20, values: ['blocked'], severity: 8 },
          { id: 'partner-mobile-regex', path: 'customer.mobile', operator: 'regex', enabled: true, orderNo: 30, pattern: '^1[3-9]\\d{9}$', severity: 8 },
          { id: 'partner-vip-default', path: 'customer.vipLevel', operator: 'default', enabled: true, orderNo: 40, defaultValue: 'silver', severity: 3 }
        ]
      },
      {
        id: 'layer-channel',
        name: '渠道校验',
        layerType: 'CHANNEL',
        orderNo: 300,
        editable: true,
        rules: [
          { id: 'channel-review-datetime', path: 'risk.reviewAt', operator: 'between', enabled: true, orderNo: 10, min: '2026-04-15 08:00:00', max: '2026-04-15 23:00:00', severity: 4 },
          { id: 'channel-name-blackword', path: 'customer.name', operator: 'notContains', enabled: true, orderNo: 20, value: '测试', severity: 7 },
          { id: 'channel-operator-note-prefix', path: 'risk.operatorNote', operator: 'startsWith', enabled: true, orderNo: 30, value: '历史', severity: 4 }
        ]
      },
      {
        id: 'layer-scene',
        name: '场景校验',
        layerType: 'SCENE',
        orderNo: 400,
        editable: true,
        rules: [
          { id: 'scene-amount-upper', path: 'order.amount', operator: 'le', enabled: true, orderNo: 10, value: 50000, severity: 6 },
          { id: 'scene-quantity-not-between', path: 'order.quantity', operator: 'notBetween', enabled: true, orderNo: 20, min: 99, max: 999, severity: 5 },
          { id: 'scene-note-locked', path: 'risk.operatorNote', operator: 'locked', enabled: true, orderNo: 30, lockedValue: '历史下单稳定', lockMode: 'LOCKED', severity: 6 }
        ]
      },
      {
        id: 'layer-runtime',
        name: '运行时校验',
        layerType: 'RUNTIME',
        orderNo: 500,
        editable: true,
        rules: [
          { id: 'runtime-clear-vip-default', path: 'customer.vipLevel', operator: 'clear', enabled: true, orderNo: 10, targetFamily: 'default', severity: 2 },
          { id: 'runtime-name-suffix', path: 'customer.name', operator: 'notEndsWith', enabled: true, orderNo: 20, value: '临时', severity: 6 }
        ]
      }
    ]
  }

  return {
    schema: demoSchema,
    document: demoDocument,
    sampleData: demoSchema.sampleData
  }
}

function createCampaignPayload(): PolicyStudioViewPayload {
  const payload = createDemoPayload()
  return {
    schema: payload.schema,
    document: {
      ...payload.document,
      id: 'policy-campaign-preview',
      name: '营销场景预览策略',
      layers: [
        {
          id: 'layer-campaign-base',
          name: '活动基线',
          layerType: 'BASE',
          orderNo: 100,
          editable: false,
          rules: [
            { id: 'campaign-base-score', path: 'customer.profile.score', operator: 'ge', enabled: true, orderNo: 10, value: 60, severity: 5 },
            { id: 'campaign-base-channel', path: 'risk.channel', operator: 'in', enabled: true, orderNo: 20, values: ['partner-a', 'partner-b'], severity: 5 }
          ]
        },
        {
          id: 'layer-campaign-custom',
          name: '活动动态层',
          layerType: 'CAMPAIGN',
          orderNo: 200,
          editable: true,
          rules: [
            { id: 'campaign-review-time', path: 'risk.reviewAt', operator: 'between', enabled: true, orderNo: 10, min: '2026-04-15 09:00:00', max: '2026-04-15 20:00:00', severity: 5 },
            { id: 'campaign-tag-filter', path: 'order.tags[]', operator: 'in', enabled: true, orderNo: 20, values: ['vip', 'urgent'], severity: 6 },
            { id: 'campaign-name-prefix', path: 'customer.name', operator: 'startsWith', enabled: true, orderNo: 30, value: '张', severity: 3 }
          ]
        }
      ]
    },
    sampleData: payload.sampleData
  }
}

function toBundle(id: string, name: string, payload: PolicyStudioViewPayload): PolicyBundle {
  return {
    meta: {
      format: 'policy-bundle/v1',
      bundleId: id,
      bundleName: name,
      version: payload.document.version || '1.0.0',
      schemaFormat: 'json'
    },
    schema: payload.schema,
    document: payload.document,
    sampleData: payload.sampleData,
    sourceType: 'sample'
  }
}

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
  box-sizing: border-box;
}

.guide {
  margin-bottom: 12px;
}

.studio-shell {
  height: calc(100% - 96px);
  min-height: 720px;
}
</style>
