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
          window.dispatchEvent(new CustomEvent('copilot:page-context', {
            detail: {
              pageType: pageType,
              route: path,
              getState: () => ({ entity: entityName, type: 'crud' }),
            },
            bubbles: false,
          }))
        } else if (isFormPage) {
          const fields = extractFormFields(schema)
          window.dispatchEvent(new CustomEvent('copilot:page-context', {
            detail: {
              pageType: pageType,
              route: path,
              getState: () => ({
                type: 'form',
                formSchema: { fields },
              }),
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
      if (path.includes('FlowNodeDef')) return 'FlowNodeDef'
      if (path.includes('NopSysClusterLeader')) return 'NopSysClusterLeader'
      if (path.includes('NopAi')) return 'NopAiChatRequest'
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
