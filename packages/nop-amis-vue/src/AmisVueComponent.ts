import React from 'react';
import { FormItem, FormControlProps,Renderer,ScopedContext, IScopedContext } from 'amis';
import { createObject, resolveVariableAndFilter,ActionObject, RendererData} from 'amis-core';

import {useAdapter} from '@nop-chaos/nop-core'
import  {applyPureVueInReact} from 'veaury'

export interface VueControlProps extends FormControlProps {
    componentName: string;
    props: Record<string,any>;
}

export default class VueControl extends React.Component<VueControlProps, any> {
    vueComponent: any;

    constructor(props) {
        super(props)
        const {resolveVueComponent} = useAdapter()
        const vueComponent = resolveVueComponent(props.vueComponent)
        if (!vueComponent) {
            console.warn(`Vue component "${props.vueComponent}" not found by resolveVueComponent`)
        }
        this.vueComponent = vueComponent ? applyPureVueInReact(vueComponent) : null
    }

    doAction(action: ActionObject, data: RendererData, throwErrors?: boolean) {
        const {resetValue, onChange} = this.props;
        const actionType = action?.actionType as string;
    
        if (actionType === 'clear') {
          onChange(undefined);
        } else if (actionType === 'reset') {
          onChange(resetValue);
        }
      }

      normalizeEventData(eventData: any = {}) {
        if (Array.isArray(eventData)) {
          if (eventData.length === 1) {
            return this.normalizeEventData(eventData[0]);
          }
          return {value: eventData};
        }

        if (eventData && typeof eventData === 'object') {
          if ('detail' in eventData && (eventData as any).detail !== undefined) {
            return this.normalizeEventData((eventData as any).detail);
          }
          return {...eventData};
        }

        return {value: eventData};
      }
    
    
      async dispatchChangeEvent(eventData: any = {}) {
        if ((this.props as any).vueComponent === 'template-canvas') {
          console.log('[AmisVueComponent] dispatchChangeEvent, templateJson length:',
            typeof eventData === 'string' ? eventData.length : JSON.stringify(eventData).length);
        }
        const rendererEvent = await this.dispatchRendererEvent('change', {
          value: eventData
        });

        if (rendererEvent?.prevented) {
          return;
        }

        this.syncAmisValue(eventData);
      }

      syncAmisValue(nextValue: any) {
        const props = this.props as any;
        const {name, onChange, onBulkChange, formStore, store, formItem} = props;
        const values = name ? {[name]: nextValue} : undefined;

        if (values && typeof onBulkChange === 'function') {
          onBulkChange(values, false);
        }

        if (name && formStore) {
          if (typeof formStore.setValueByName === 'function') {
            formStore.setValueByName(name, nextValue);
          } else if (typeof formStore.setValues === 'function') {
            formStore.setValues(values);
          }
        }

        if (name && store) {
          if (typeof store.changeValue === 'function') {
            store.changeValue(name, nextValue);
          } else if (typeof store.updateData === 'function') {
            store.updateData(values);
          } else if (typeof store.setValues === 'function') {
            store.setValues(values);
          }
        }

        if (typeof onChange === 'function') {
          if (name && !formItem) {
            onChange(nextValue, name, false);
          } else {
            onChange(nextValue);
          }
        }
      }

      async dispatchRendererEvent(eventName: string, eventData: any = {}) {
        const {dispatchEvent, data} = this.props;
        return await dispatchEvent(
          eventName,
          createObject(data, eventData)
        );
      }

      async saveTemplateCanvas(templateJson: any) {
        const props = this.props as any;
        const {data, env} = props;
        const id = data?.id || data?.sid;
        const fetcher = env?.fetcher;

        console.log('[AmisVueComponent] saveTemplateCanvas called, templateJson length:',
          typeof templateJson === 'string' ? templateJson.length : JSON.stringify(templateJson).length,
          ', id:', id);

        if (props.vueComponent !== 'template-canvas' || typeof fetcher !== 'function') {
          return false;
        }

        const requestData = id
          ? { id, templateJson }
          : {
              templateId: data?.templateId || 'DEMO_TEMPLATE',
              templateName: data?.templateName || '新模板',
              templateVersion: data?.templateVersion || 1,
              status: data?.status || 0,
              templateJson
            };
        console.log('[AmisVueComponent] saveTemplateCanvas request data keys:', Object.keys(requestData), 'templateJson length:', typeof templateJson === 'string' ? templateJson.length : 0);

        await fetcher({
          url: id ? '@mutation:NopTemplateDefinition__update' : '@mutation:NopTemplateDefinition__save',
          method: 'post',
          data: requestData,
          'gql:selection': 'sid,templateId,templateName,templateVersion,templateJson'
        });
        return true;
      }

      async dispatchNamedEvent(eventName: string, eventData: any = {}) {
        const normalizedData = this.normalizeEventData(eventData);

        const {name} = this.props as any;
        const nextValue =
          name && normalizedData[name] !== undefined
            ? normalizedData[name]
            : normalizedData.templateJson ?? normalizedData.value;
        if (nextValue !== undefined) {
          console.log('[AmisVueComponent] dispatchNamedEvent', eventName, ', name:', name, ', nextValue length:',
            typeof nextValue === 'string' ? nextValue.length : JSON.stringify(nextValue).length);
          if (name && normalizedData[name] === undefined) {
            normalizedData[name] = nextValue;
          }
          if (normalizedData.value === undefined) {
            normalizedData.value = nextValue;
          }
          if (normalizedData.modelValue === undefined) {
            normalizedData.modelValue = nextValue;
          }
          if (normalizedData.templateJson === undefined) {
            normalizedData.templateJson = nextValue;
          }
          if (normalizedData.result === undefined) {
            normalizedData.result = nextValue;
          }
          this.syncAmisValue(nextValue);
        }

        if (eventName === 'saved' && nextValue !== undefined) {
          const savedByComponent = await this.saveTemplateCanvas(nextValue);
          if (savedByComponent) {
            return;
          }
        }

        return this.dispatchRendererEvent(eventName, normalizedData);
      }
    

    render() {
        let { props,value,env,store } = this.props;

        if(props){
          props = {...props}
          for (const key of Object.keys(props)) {
            if (typeof props[key] === 'string') {
              props[key] = resolveVariableAndFilter(
                props[key],
                this.props.data,
                '| raw'
              );
            }
          }
        }

        let mergedProps = {
            env, store,
            ...props,
            value,
            modelValue: value,
            'onUpdate:value': ((value: any) => this.dispatchChangeEvent(value)),
            'onUpdate:modelValue': ((value: any) => this.dispatchChangeEvent(value)),
            onUpdateTemplateJson: ((value: any) => this.dispatchChangeEvent(value)),
            onSaveTemplate: ((value: any) => this.saveTemplateCanvas(value)),
            onSaved: ((payload: any) => this.dispatchNamedEvent('saved', payload)),
            onPreview: ((payload: any) => this.dispatchNamedEvent('preview', payload))
        }
        if (!this.vueComponent) {
            return React.createElement('div', { style: { color: 'red', padding: '10px' } }, `Vue component "${this.props.vueComponent}" not found`)
        }
        return React.createElement(this.vueComponent, mergedProps)
    }
}

// @Renderer({
//     type: 'vue-renderer',
//     autoVar:true
// })
class VueRenderer extends VueControl { 
    static contextType = ScopedContext;

    constructor(props) {
      super(props)
      const scoped = this.context as IScopedContext;
      if(scoped) scoped.registerComponent(this);
    }
  
    componentWillUnmount() {
      const scoped = this.context as IScopedContext;
      if(scoped) scoped.unRegisterComponent(this);
    }
}

// autoVar只对最顶层的string字符串属性有效
Renderer({
    type: 'vue-renderer',
    autoVar:false
})(VueRenderer)

// @FormItem({
//     type: 'vue-form-item',
//     autoVar:true
// })
class VueFormItem extends VueControl { }

// Guard against FormItem being undefined (e.g., when amis module is not properly loaded)
if (typeof FormItem !== 'undefined') {
  FormItem({
    type: 'vue-form-item',
    autoVar:false
  })(VueFormItem)
}


// export default class WebComponent extends React.Component<RendererProps> {
//     renderBody(): JSX.Element | null {
//       const {body, render} = this.props;
//       return body ? (render('body', body) as JSX.Element) : null;
//     }
  
//     render() {
//       const {tag, props, data} = this.props;
  
//       const propsValues = mapValues(props, s => {
//         if (typeof s === 'string') {
//           return resolveVariableAndFilter(s, data, '| raw') || s;
//         } else {
//           return s;
//         }
//       });
//       const Component = (tag as keyof JSX.IntrinsicElements) || 'div';
//       return <Component {...propsValues}>{this.renderBody()}</Component>;
//     }
//   }
  
//   @Renderer({
//     type: 'web-component'
//   })
//   export class WebComponentRenderer extends WebComponent {}
