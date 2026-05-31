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
        const hasCreate = findComponentInSchema(crudConfig, 'create') || crudConfig.createAction
        const hasEdit = findComponentInSchema(crudConfig, 'edit') || crudConfig.editAction
        const hasDelete = findComponentInSchema(crudConfig, 'delete') || crudConfig.deleteAction
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
      const buttons = document.querySelectorAll('button, .btn, [role="button"], .cxd-Button')
      for (const btn of buttons) {
        const text = btn.textContent?.trim() || ''
        if (labels.some(l => text === l)) {
          (btn as HTMLElement).click()
          return { found: true }
        }
      }
      return { found: false, error: `找不到按钮: ${labels.join(', ')}` }
    }

    /** CRUD 页面 handler：调用 AMIS CRUD 组件的 reload */
    function reloadCrud(): { found: boolean; error?: string } {
      const scoped = (window as any).__amisScoped__
      if (!scoped) return { found: false, error: 'AMIS scoped 不可用' }
      try {
        const comps = scoped.getComponents()
        for (const comp of comps) {
          if (comp?.props?.type === 'crud') {
            if (typeof comp.reload === 'function') {
              comp.reload()
              return { found: true }
            }
          }
          if (comp?.props?.body?.type === 'crud') {
            const bodyComp = comp.context?.getComponentByName?.(comp.props.body.name)
            if (bodyComp && typeof bodyComp.reload === 'function') {
              bodyComp.reload()
              return { found: true }
            }
          }
        }
        return { found: false, error: '找不到 CRUD 组件' }
      } catch (e: any) {
        return { found: false, error: e.message }
      }
    }

    /** 构建 CRUD 页面的 action handlers */
    function buildCrudPageActions(crudCtx: any, _schema: any): Record<string, (params?: any) => Promise<any>> {
      const actions: Record<string, (params?: any) => Promise<any>> = {}

      if (crudCtx.canCreate) {
        actions.add = async () => {
          const r = findAndClickAmisButton(['新增', '新建', '添加', '创建'])
          if (!r.found) throw new Error(r.error)
          // 等弹窗渲染
          await new Promise(resolve => setTimeout(resolve, 400))
          return r
        }
      }

      if (crudCtx.canEdit) {
        actions.edit = async () => {
          const r = findAndClickAmisButton(['编辑', '修改'])
          if (!r.found) throw new Error(r.error)
          await new Promise(resolve => setTimeout(resolve, 400))
          return r
        }
      }

      if (crudCtx.canDelete) {
        actions.delete = async () => {
          const r = findAndClickAmisButton(['删除'])
          if (!r.found) throw new Error(r.error)
          return r
        }
      }

      actions.query = async () => {
        const r = findAndClickAmisButton(['查询', '搜索'])
        if (!r.found) {
          // 按钮查不到则直接 reload CRUD
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
        const r = findAndClickAmisButton(['提交', '保存', '确定'])
        if (!r.found) throw new Error(r.error)
        return r
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
