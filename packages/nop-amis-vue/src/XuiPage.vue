<!--
/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
-->
<template>
  <xui-debugger v-if="debug" :path="path" :schema="pageSchema" @update:schema="updateSchema" @rebuild="rebuild" />
  <XuiSchemaPage :schema="pageSchema" :registerPage="registerPage" :action="actions" :data="data"/>
</template>

<script lang="ts">
import { PropType, defineComponent, shallowRef, watchEffect } from 'vue';
import type { PageObject, RegisterPage } from '@nop-chaos/nop-core';
import XuiDebugger from './XuiDebugger.vue';
import XuiSchemaPage from './XuiSchemaPage.vue';

import { useDebug,useAdapter } from '@nop-chaos/nop-core'
import { cloneDeep } from 'lodash-es';

/**
 * 在AmisSchemaPage的基础上增加AmisDebugger调试功能，以及根据path动态加载schema的功能
 */
export default defineComponent({
  name: 'amis-page',
  props: {
    path: {
      type:String,
      required:true,
    },
    data: Object,
    config: Object,
    registerPage: Function as PropType<RegisterPage>,
    actions: Object as PropType<Record<string, Function>>
  },

  components: { XuiDebugger, XuiSchemaPage },

  setup(props) {
    const { getPage} = useAdapter()

    let pageSchema = shallowRef<any>();

    function registerPage(p: PageObject) {
      props.registerPage?.(p)
      // AI Copilot: AMIS 页面自动注册
      registerCopilotContext(props.path, p)
    }

    watchEffect(() => {
      getPage(props.path).then(res=>{
        res.__baseUrl = props.path
        updateSchema(res)
        // AI Copilot: 页面加载后根据 schema 注册上下文
        registerCopilotFromSchema(props.path, res)
      })
    });

    // AI Copilot 预注册：pageType/route 已知，不等 schema 异步加载
    // 确保 ActionExecutor 能立即识别当前页面，handler 在 schema 加载完成后补充
    const preliminaryPageType = extractPageType(props.path)
    window.dispatchEvent(new CustomEvent('copilot:page-context', {
      detail: {
        pageType: preliminaryPageType,
        route: props.path,
        pageKind: 'pending',
        state: {},
        actions: {},
      },
      bubbles: false,
    }))

    // AI Copilot 自动注册
    function registerCopilotFromSchema(path: string, schema: any) {
      try {
        const pageType = extractPageType(path)
        const isCrudPage = hasPageType(schema, 'crud') || hasPageType(schema, 'page') && findComponentInSchema(schema, 'crud')
        const isFormPage = hasPageType(schema, 'form')

        if (isCrudPage) {
          const entityName = extractEntityName(schema, path)
          const crudContext = extractCrudContext(schema, entityName)
          const actions = buildCrudPageActions(crudContext, schema)
          window.dispatchEvent(new CustomEvent('copilot:page-context', {
            detail: {
              pageType: pageType,
              route: path,
              pageKind: 'crud',
              entityName,
              crudContext,
              state: { entity: entityName },
              actions,
            },
            bubbles: false,
          }))
        } else if (isFormPage) {
          const fields = extractFormFields(schema)
          const actions = buildFormPageActions()
          window.dispatchEvent(new CustomEvent('copilot:page-context', {
            detail: {
              pageType: pageType,
              route: path,
              pageKind: 'form',
              state: {},
              formSchema: { fields },
              actions,
            },
            bubbles: false,
          }))
        } else {
          // 非 CRUD/Form 页面的基础上下文注册（图表、仪表盘、自定义页面等）
          const entityName = extractEntityName(schema, path)
          window.dispatchEvent(new CustomEvent('copilot:page-context', {
            detail: {
              pageType: pageType,
              route: path,
              pageKind: 'page',
              entityName,
              state: { entity: entityName },
            },
            bubbles: false,
          }))
        }
      } catch (e) { /* silent */ }
    }

    function registerCopilotContext(path: string, pageObj: PageObject) {
      try {
        const pageType = extractPageType(path)
        const entityName = extractEntityName(pageObj, path);
        (window as any).__copilotPageType__ = pageType
        ;(window as any).__copilotPageEntity__ = entityName
      } catch (e) { /* silent */ }
    }

    function extractPageType(path: string): string {
      // 从路径中提取有意义的 pageType
      if (path.includes('FlowNodeDef')) return 'FlowNodeDef'
      if (path.includes('NopSysClusterLeader')) return 'NopSysClusterLeader'
      if (path.includes('NopAi')) return 'NopAiChatRequest'
      // 匹配 NopXxx 形式的实体名作为 pageType
      const entityMatch = path.match(/Nop[A-Z][a-zA-Z]+/)
      if (entityMatch) return entityMatch[0]
      // fallback: 取路径最后一段
      return path.replace(/^.*\/([^/]+)$/, '$1')
    }

    function extractEntityName(schema: any, path: string): string {
      if (schema?.api?.url) {
        const m = schema.api.url.match(/Nop[A-Za-z]+/)
        if (m) return m[0]
      }
      return extractPageType(path)
    }

    function hasPageType(schema: any, type: string): boolean {
      if (!schema) return false
      if (schema.type === type) return true
      if (schema.body) {
        return hasPageType(schema.body, type)
      }
      return false
    }

    function findComponentInSchema(schema: any, type: string): boolean {
      if (!schema) return false
      if (schema.type === type) return true
      if (Array.isArray(schema)) {
        return schema.some(s => findComponentInSchema(s, type))
      }
      if (typeof schema === 'object') {
        return Object.values(schema).some(v => findComponentInSchema(v, type))
      }
      return false
    }

    function extractFormFields(schema: any): Array<{name:string;label:string;type:string;required:boolean}> {
      const fields: Array<{name:string;label:string;type:string;required:boolean}> = []
      function walk(node: any) {
        if (!node || typeof node !== 'object') return
        if (Array.isArray(node)) {
          node.forEach(walk)
          return
        }
        if (node.type && (node.name || node.label)) {
          // 表单控件
          const controlTypes = ['input-text','input-number','input-email','input-password','select','textarea','input-date','switch','checkbox','radio','input-file','input-image']
          if (controlTypes.includes(node.type) || node.type?.startsWith('input-')) {
            fields.push({
              name: node.name || '',
              label: node.label || node.name || '',
              type: mapAmisType(node.type),
              required: node.required || node.validations?.required || false,
            })
          }
        }
        // 递归
        for (const key of ['body','controls','columns','tabs','fields','form']) {
          if (node[key]) walk(node[key])
        }
      }
      walk(schema)
      return fields
    }

    function extractCrudContext(schema: any, entityName: string) {
      const context: any = {
        entityName,
        canCreate: false,
        canEdit: false,
        canDelete: false,
      }

      // 查找 CRUD 组件配置
      function findCrudConfig(node: any): any {
        if (!node || typeof node !== 'object') return null
        if (node.type === 'crud') return node
        if (Array.isArray(node)) {
          for (const item of node) {
            const found = findCrudConfig(item)
            if (found) return found
          }
        }
        if (typeof node === 'object') {
          for (const key of ['body', 'controls', 'columns', 'tabs', 'panel']) {
            const found = findCrudConfig(node[key])
            if (found) return found
          }
        }
        return null
      }

      const crudConfig = findCrudConfig(schema)
      if (crudConfig) {
        // 检测 CRUD 操作按钮权限
        if (crudConfig.api) {
          // 有 API 则默认可以查询
        }
        if (crudConfig.columns) {
          context.visibleColumns = (Array.isArray(crudConfig.columns) ? crudConfig.columns : [])
            .filter((col: any) => col && col.name)
            .map((col: any) => col.name)
        }
        // 检查是否配置了新增/编辑/删除按钮
        const listActions = Array.isArray(crudConfig.listActions) ? crudConfig.listActions : []
        const rowActions = Array.isArray(crudConfig.rowActions) ? crudConfig.rowActions : []
        const hasActionId = (actions: any[], ids: string[]) =>
          actions.some((action: any) => action && ids.includes(action.id))

        const hasCreate =
          findComponentInSchema(crudConfig, 'create') ||
          crudConfig.createAction ||
          hasActionId(listActions, ['add-button', 'add', 'create-button'])
        const hasEdit =
          findComponentInSchema(crudConfig, 'edit') ||
          crudConfig.editAction ||
          hasActionId(rowActions, ['row-update-button', 'edit', 'update-button'])
        const hasDelete =
          findComponentInSchema(crudConfig, 'delete') ||
          crudConfig.deleteAction ||
          hasActionId(listActions, ['batch-delete-button', 'delete-button']) ||
          hasActionId(rowActions, ['row-delete-button', 'delete'])
        context.canCreate = !!hasCreate
        context.canEdit = !!hasEdit
        context.canDelete = !!hasDelete
      }

      return context
    }

    function mapAmisType(amisType: string): string {
      switch (amisType) {
        case 'input-text': return 'text'
        case 'input-number': return 'number'
        case 'input-email': return 'email'
        case 'input-password': return 'password'
        case 'input-date': case 'input-datetime': return 'date'
        case 'input-tel': return 'phone'
        case 'select': return 'select'
        case 'textarea': return 'textarea'
        case 'switch': return 'boolean'
        default: return amisType?.replace('input-','') || 'text'
      }
    }

    // ---- AMIS Action Handler Builders ----

    /** 通用的 AMIS 按钮查找与点击 */
    function findAndClickAmisButton(labels: string[]): { found: boolean; error?: string } {
      // 通过 data-tooltip 匹配
      for (const label of labels) {
        const btn = document.querySelector(`[data-tooltip="${label}"]`) as HTMLElement
        if (btn) { btn.click(); return { found: true } }
      }
      // 通过按钮文本匹配
      const buttons = document.querySelectorAll('button, .btn, [role="button"], .cxd-Button, .ant-btn')
      for (const btn of buttons) {
        const text = btn.textContent?.trim() || ''
        if (labels.some(l => text === l)) {
          (btn as HTMLElement).click()
          return { found: true }
        }
      }
      return { found: false, error: `找不到按钮: ${labels.join(', ')}` }
    }

    /** 查找并填充 AMIS 表单字段（弹窗优先）。使用 native setter 绕过 React value 属性拦截 */
    function findAndFillAmisField(fieldName: string, label: string, value: any): { found: boolean; error?: string } {
      const modal = document.querySelector('.ant-modal-wrap, .ant-modal, .cxd-Modal--open')
      const container = (modal || document) as HTMLElement

      let input: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null = null

      // 1. 按 name 属性直接在 input/textarea/select 上查找
      if (fieldName) {
        input = container.querySelector(
          `input[name="${fieldName}"], textarea[name="${fieldName}"], select[name="${fieldName}"]`,
        )
      }

      // 2. 按 AMIS data-name 包装元素查找
      if (!input && fieldName) {
        const wrapper = container.querySelector(`[data-name="${fieldName}"]`)
        if (wrapper) {
          input = wrapper.querySelector('input, textarea, select')
        }
      }

      // 3. 按 label 文本查找（AMIS/antd FormItem）
      if (!input && label) {
        const items = container.querySelectorAll('.ant-form-item, .cxd-FormItem')
        for (const item of items) {
          const labelEl = item.querySelector('.ant-form-item-label > label, .cxd-FormItem-label, label')
          if (labelEl) {
            const text = labelEl.textContent?.trim() || ''
            if (text.includes(label) || (label.includes(text) && text.length >= 3)) {
              input = item.querySelector('input, textarea, select')
              if (input) break
            }
          }
        }
      }

      if (!input) return { found: false, error: `未找到表单字段: ${label || fieldName}` }

      // 使用 native setter 绕过 React/AMIS 的 value 属性拦截
      const strValue = String(value)
      if (input instanceof HTMLInputElement) {
        const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
        nativeSetter.call(input, strValue)
      } else if (input instanceof HTMLTextAreaElement) {
        const nativeSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
        nativeSetter.call(input, strValue)
      } else if (input instanceof HTMLSelectElement) {
        const nativeSetter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!
        nativeSetter.call(input, strValue)
      } else {
        input.value = strValue
      }

      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
      return { found: true }
    }

    /** 从 __amisScoped__ 查找 CRUD 组件实例 */
    function findAmisCrudComponent(): any {
      const scoped = (window as any).__amisScoped__
      if (!scoped) return null
      try {
        const comps = scoped.getComponents()
        // 直接匹配 type === 'crud'
        for (const comp of comps) {
          if (comp?.props?.type === 'crud') return comp
        }
        // 嵌套 body（page body → crud）
        for (const comp of comps) {
          const body = comp.props?.body
          if (body?.type === 'crud') {
            const bc = comp.context?.getComponentByName?.(body.name)
            if (bc) return bc
          }
        }
      } catch { /* scoped 不可用 */ }
      return null
    }

    /** 通过 AMIS CRUD 的 doAction API 分发 action，完全绕过 DOM */
    function dispatchAmisCrudAction(actionId: string): { found: boolean; error?: string } {
      const crud = findAmisCrudComponent()
      if (!crud) return { found: false, error: '找不到 CRUD 组件' }

      const listActions = crud.props?.listActions || []
      const rowActions = crud.props?.rowActions || []
      const allActions = [...listActions, ...rowActions]

      const actionDef = allActions.find((a: any) =>
        a.id === actionId ||
        (actionId === 'add' && (a.id?.includes('add') || a.actionType === 'dialog')) ||
        (actionId === 'edit' && a.id?.includes('update')) ||
        (actionId === 'delete' && a.id?.includes('delete'))
      )
      if (!actionDef) return { found: false, error: `找不到 action: ${actionId}` }

      try {
        const storeData = crud.props?.store?.data ?? {}
        crud.doAction?.(actionDef, storeData, false)
        return { found: true }
      } catch (e: any) {
        return { found: false, error: e.message }
      }
    }

    /** CRUD 页面 handler：调用 AMIS CRUD 组件的 reload */
    function reloadCrud(): { found: boolean; error?: string } {
      const crud = findAmisCrudComponent()
      if (!crud) return { found: false, error: '找不到 CRUD 组件' }
      try {
        if (typeof crud.reload === 'function') {
          crud.reload()
          return { found: true }
        }
        return { found: false, error: 'CRUD 组件没有 reload 方法' }
      } catch (e: any) {
        return { found: false, error: e.message }
      }
    }

    /** 构建 CRUD 页面的 action handlers */
    function buildCrudPageActions(_crudCtx: any, _schema: any): Record<string, (params?: any) => Promise<any>> {
      const actions: Record<string, (params?: any) => Promise<any>> = {}

      async function ensureDialogOpened(timeoutMs = 3000): Promise<void> {
        const start = Date.now()
        while (Date.now() - start < timeoutMs) {
          const modal = document.querySelector('.ant-modal-wrap, .ant-modal, .cxd-Modal--open')
          if (modal) return
          await new Promise(resolve => setTimeout(resolve, 100))
        }
        throw new Error('新增对话框未打开')
      }

      /** 打开新增弹窗：优先 AMIS API，降级 DOM */
      async function openAddDialog(): Promise<void> {
        // 1. 优先通过 AMIS API dispatch
        const r = dispatchAmisCrudAction('add')
        if (r.found) {
          await ensureDialogOpened()
          return
        }
        // 2. 降级到 DOM 查找按钮
        const domR = findAndClickAmisButton(['新增', '新建', '添加', '创建'])
        if (!domR.found) throw new Error(domR.error)
        await ensureDialogOpened()
      }

      // add: 始终注册（不再依赖 canCreate）
      actions.add = async () => {
        await openAddDialog()
        return { actionType: 'add' }
      }

      // edit: 优先 AMIS API
      actions.edit = async () => {
        const r = dispatchAmisCrudAction('edit')
        if (!r.found) {
          const domR = findAndClickAmisButton(['编辑', '修改'])
          if (!domR.found) throw new Error(domR.error)
        }
        await new Promise(resolve => setTimeout(resolve, 400))
        return { actionType: 'edit' }
      }

      // delete
      actions.delete = async () => {
        const r = dispatchAmisCrudAction('delete')
        if (!r.found) {
          const domR = findAndClickAmisButton(['删除'])
          if (!domR.found) throw new Error(domR.error)
        }
        return { actionType: 'delete' }
      }

      actions.query = async () => {
        const r = findAndClickAmisButton(['查询', '搜索'])
        if (!r.found) {
          const rr = reloadCrud()
          if (!rr.found) throw new Error(rr.error)
          return rr
        }
        return r
      }

      actions.reload = async () => {
        const r = reloadCrud()
        if (!r.found) throw new Error(r.error)
        return r
      }

      // submitForm: 在弹窗中查找提交按钮并点击
      actions.submitForm = async () => {
        await ensureDialogOpened()
        const r = findAndClickAmisButton(['提交', '保存', '确定'])
        if (!r.found) throw new Error(r.error)
        return r
      }

      // fillForm: 在弹窗中查找字段并填写（自动打开弹窗）
      actions.fillForm = async (params?: any) => {
        const fieldName = params?.__fieldName || params?.fieldName
        const label = params?.__label || params?.label
        const value = params?.value
        if (value === undefined) throw new Error('缺少填充值')

        // 检查弹窗是否已打开
        let modal = document.querySelector('.ant-modal-wrap, .ant-modal, .cxd-Modal--open')
        if (!modal) {
          await openAddDialog()
        }

        // 查找并填充字段（带重试）
        for (let attempt = 0; attempt < 5; attempt++) {
          if (attempt > 0) await new Promise(r => setTimeout(r, 300))
          const r = findAndFillAmisField(fieldName, label, value)
          if (r.found) return r
        }

        throw new Error(`未找到表单字段: ${label || fieldName}`)
      }

      return actions
    }

    /** 构建 Form 页面的 action handlers */
    function buildFormPageActions(): Record<string, (params?: any) => Promise<any>> {
      const actions: Record<string, (params?: any) => Promise<any>> = {}

      actions.submitForm = async () => {
        const r = findAndClickAmisButton(['提交', '保存', '确定'])
        if (!r.found) throw new Error(r.error)
        return r
      }

      // fillForm: 在表单中查找字段并填写
      actions.fillForm = async (params?: any) => {
        const fieldName = params?.__fieldName || params?.fieldName
        const label = params?.__label || params?.label
        const value = params?.value
        if (value === undefined) throw new Error('缺少填充值')

        // 查找并填充字段（带重试）
        for (let attempt = 0; attempt < 5; attempt++) {
          if (attempt > 0) await new Promise(r => setTimeout(r, 300))
          const r = findAndFillAmisField(fieldName, label, value)
          if (r.found) return r
        }

        throw new Error(`未找到表单字段: ${label || fieldName}`)
      }

      return actions
    }

    function updateSchema(value: any) {
      pageSchema.value = value;
    }

    function rebuild() {
      pageSchema.value = cloneDeep(pageSchema.value)
    }

    const { debug } = useDebug()

    const actions = {...props.actions}

    return {
      pageSchema,
      updateSchema,
      rebuild,
      registerPage,
      debug,
      actions,
      data: props.data
    };
  },
});
</script>
