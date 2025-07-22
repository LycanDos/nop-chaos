import { ActionObject } from 'amis-core';
import { ComponentOptionsMixin } from 'vue';
import { ComponentProvideOptions } from 'vue';
import { default as default_2 } from 'react';
import { DefineComponent } from 'vue';
import { ExtractPropTypes } from 'vue';
import { FormControlProps } from 'amis';
import { PageObject } from '@nop-chaos/nop-core';
import { PageOptions } from '@nop-chaos/nop-core';
import { PropType } from 'vue';
import { PublicProps } from 'vue';
import { Raw } from 'vue';
import { Ref } from 'vue';
import { RegisterPage } from '@nop-chaos/nop-core';
import { RendererData } from 'amis-core';
import { RendererElement } from 'vue';
import { RendererNode } from 'vue';
import { ShallowRef } from 'vue';
import { VNode } from 'vue';

export declare const AmisPageEditor: DefineComponent<ExtractPropTypes<    {
schema: ObjectConstructor;
rollbackPageSource: FunctionConstructor;
getPageSource: {
type: FunctionConstructor;
required: true;
};
savePageSource: {
type: FunctionConstructor;
required: true;
};
}>, {
editorRef: Ref<null, null>;
}, {}, {}, {}, ComponentOptionsMixin, ComponentOptionsMixin, "exit"[], "exit", PublicProps, Readonly<ExtractPropTypes<    {
schema: ObjectConstructor;
rollbackPageSource: FunctionConstructor;
getPageSource: {
type: FunctionConstructor;
required: true;
};
savePageSource: {
type: FunctionConstructor;
required: true;
};
}>> & Readonly<{
onExit?: ((...args: any[]) => any) | undefined;
}>, {}, {}, {}, {}, string, ComponentProvideOptions, true, {}, any>;

export declare const AmisSchemaPage: DefineComponent<ExtractPropTypes<    {
schema: ObjectConstructor;
data: ObjectConstructor;
registerPage: PropType<RegisterPage>;
actions: PropType<Record<string, Function>>;
}>, () => VNode<RendererNode, RendererElement, {
[key: string]: any;
}>, {}, {}, {}, ComponentOptionsMixin, ComponentOptionsMixin, {}, string, PublicProps, Readonly<ExtractPropTypes<    {
schema: ObjectConstructor;
data: ObjectConstructor;
registerPage: PropType<RegisterPage>;
actions: PropType<Record<string, Function>>;
}>> & Readonly<{}>, {}, {}, {}, {}, string, ComponentProvideOptions, true, {}, any>;

export declare const AmisToast: DefineComponent<    {}, {}, {}, {}, {}, ComponentOptionsMixin, ComponentOptionsMixin, {}, string, PublicProps, Readonly<{}> & Readonly<{}>, {}, {}, {}, {}, string, ComponentProvideOptions, true, {}, any>;

export declare class AmisVueComponent extends default_2.Component<VueControlProps, any> {
    vueComponent: any;
    constructor(props: any);
    doAction(action: ActionObject, data: RendererData, throwErrors?: boolean): void;
    dispatchChangeEvent(eventData?: any): Promise<void>;
    render(): default_2.DetailedReactHTMLElement<default_2.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>;
}

export declare function defineReactPageComponent(builder: (props: {
    actions?: Record<string, Function>;
}) => ReactPageOptions): DefineComponent<ExtractPropTypes<    {
schema: ObjectConstructor;
data: ObjectConstructor;
registerPage: PropType<RegisterPage>;
actions: PropType<Record<string, Function>>;
}>, () => VNode<RendererNode, RendererElement, {
[key: string]: any;
}>, {}, {}, {}, ComponentOptionsMixin, ComponentOptionsMixin, {}, string, PublicProps, Readonly<ExtractPropTypes<    {
schema: ObjectConstructor;
data: ObjectConstructor;
registerPage: PropType<RegisterPage>;
actions: PropType<Record<string, Function>>;
}>> & Readonly<{}>, {}, {}, {}, {}, string, ComponentProvideOptions, true, {}, any>;

export declare type ReactPageOptions = PageOptions & {
    onRenderPage(schema: any, data: any, page: PageObject): Promise<JSX.Element> | JSX.Element;
    onDestroyPage?(page: PageObject): void;
};

declare interface VueControlProps extends FormControlProps {
    componentName: string;
    props: Record<string, any>;
}

export declare const XuiLoading: DefineComponent<    {}, {}, {}, {}, {}, ComponentOptionsMixin, ComponentOptionsMixin, {}, string, PublicProps, Readonly<{}> & Readonly<{}>, {}, {}, {}, {}, string, ComponentProvideOptions, true, {}, any>;

/**
 * 在AmisSchemaPage的基础上增加AmisDebugger调试功能，以及根据path动态加载schema的功能
 */
export declare const XuiPage: DefineComponent<ExtractPropTypes<    {
path: {
type: StringConstructor;
required: true;
};
data: ObjectConstructor;
config: ObjectConstructor;
registerPage: PropType<RegisterPage>;
actions: PropType<Record<string, Function>>;
}>, {
pageSchema: ShallowRef<any, any>;
updateSchema: (value: any) => void;
rebuild: () => void;
registerPage: (p: PageObject) => void;
debug: Ref<boolean, boolean>;
actions: {
[x: string]: Function;
};
data: Record<string, any> | undefined;
}, {}, {}, {}, ComponentOptionsMixin, ComponentOptionsMixin, {}, string, PublicProps, Readonly<ExtractPropTypes<    {
path: {
type: StringConstructor;
required: true;
};
data: ObjectConstructor;
config: ObjectConstructor;
registerPage: PropType<RegisterPage>;
actions: PropType<Record<string, Function>>;
}>> & Readonly<{}>, {}, {}, {
XuiDebugger: DefineComponent<ExtractPropTypes<    {
path: {
type: StringConstructor;
required: true;
};
schema: ObjectConstructor;
}>, {}, {}, {}, {}, ComponentOptionsMixin, ComponentOptionsMixin, {
"update:schema": (...args: any[]) => void;
rebuild: (...args: any[]) => void;
}, string, PublicProps, Readonly<ExtractPropTypes<    {
path: {
type: StringConstructor;
required: true;
};
schema: ObjectConstructor;
}>> & Readonly<{
"onUpdate:schema"?: ((...args: any[]) => any) | undefined;
onRebuild?: ((...args: any[]) => any) | undefined;
}>, {}, {}, {}, {}, string, ComponentProvideOptions, true, {}, any>;
XuiSchemaPage: DefineComponent<ExtractPropTypes<    {
schema: ObjectConstructor;
data: ObjectConstructor;
registerPage: PropType<RegisterPage>;
actions: PropType<Record<string, Function>>;
}>, {
componentType: Ref<Raw<DefineComponent<ExtractPropTypes<    {
schema: ObjectConstructor;
data: ObjectConstructor;
registerPage: PropType<RegisterPage>;
actions: PropType<Record<string, Function>>;
}>, () => VNode<RendererNode, RendererElement, {
[key: string]: any;
}>, {}, {}, {}, ComponentOptionsMixin, ComponentOptionsMixin, {}, string, PublicProps, Readonly<ExtractPropTypes<    {
schema: ObjectConstructor;
data: ObjectConstructor;
registerPage: PropType<RegisterPage>;
actions: PropType<Record<string, Function>>;
}>> & Readonly<{}>, {}, {}, {}, {}, string, ComponentProvideOptions, true, {}, any>>, Raw<DefineComponent<ExtractPropTypes<    {
schema: ObjectConstructor;
data: ObjectConstructor;
registerPage: PropType<RegisterPage>;
actions: PropType<Record<string, Function>>;
}>, () => VNode<RendererNode, RendererElement, {
[key: string]: any;
}>, {}, {}, {}, ComponentOptionsMixin, ComponentOptionsMixin, {}, string, PublicProps, Readonly<ExtractPropTypes<    {
schema: ObjectConstructor;
data: ObjectConstructor;
registerPage: PropType<RegisterPage>;
actions: PropType<Record<string, Function>>;
}>> & Readonly<{}>, {}, {}, {}, {}, string, ComponentProvideOptions, true, {}, any>>>;
}, {}, {}, {}, ComponentOptionsMixin, ComponentOptionsMixin, {}, string, PublicProps, Readonly<ExtractPropTypes<    {
schema: ObjectConstructor;
data: ObjectConstructor;
registerPage: PropType<RegisterPage>;
actions: PropType<Record<string, Function>>;
}>> & Readonly<{}>, {}, {}, {}, {}, string, ComponentProvideOptions, true, {}, any>;
}, {}, string, ComponentProvideOptions, true, {}, any>;

export declare const XuiPageEditor: DefineComponent<ExtractPropTypes<    {
rollbackPageSource: FunctionConstructor;
getPageSource: {
type: FunctionConstructor;
required: true;
};
savePageSource: {
type: FunctionConstructor;
required: true;
};
}>, {}, {}, {}, {}, ComponentOptionsMixin, ComponentOptionsMixin, {
exit: (...args: any[]) => void;
}, string, PublicProps, Readonly<ExtractPropTypes<    {
rollbackPageSource: FunctionConstructor;
getPageSource: {
type: FunctionConstructor;
required: true;
};
savePageSource: {
type: FunctionConstructor;
required: true;
};
}>> & Readonly<{
onExit?: ((...args: any[]) => any) | undefined;
}>, {}, {}, {}, {}, string, ComponentProvideOptions, true, {}, any>;

/**
 * 嵌入到vue中的amis页面。每个AmisSchemaPage都对应一个ReactRooot。schema发生变化时会重新创建react组件
 */
export declare const XuiSchemaPage: DefineComponent<ExtractPropTypes<    {
schema: ObjectConstructor;
data: ObjectConstructor;
registerPage: PropType<RegisterPage>;
actions: PropType<Record<string, Function>>;
}>, {
componentType: Ref<Raw<DefineComponent<ExtractPropTypes<    {
schema: ObjectConstructor;
data: ObjectConstructor;
registerPage: PropType<RegisterPage>;
actions: PropType<Record<string, Function>>;
}>, () => VNode<RendererNode, RendererElement, {
[key: string]: any;
}>, {}, {}, {}, ComponentOptionsMixin, ComponentOptionsMixin, {}, string, PublicProps, Readonly<ExtractPropTypes<    {
schema: ObjectConstructor;
data: ObjectConstructor;
registerPage: PropType<RegisterPage>;
actions: PropType<Record<string, Function>>;
}>> & Readonly<{}>, {}, {}, {}, {}, string, ComponentProvideOptions, true, {}, any>>, Raw<DefineComponent<ExtractPropTypes<    {
schema: ObjectConstructor;
data: ObjectConstructor;
registerPage: PropType<RegisterPage>;
actions: PropType<Record<string, Function>>;
}>, () => VNode<RendererNode, RendererElement, {
[key: string]: any;
}>, {}, {}, {}, ComponentOptionsMixin, ComponentOptionsMixin, {}, string, PublicProps, Readonly<ExtractPropTypes<    {
schema: ObjectConstructor;
data: ObjectConstructor;
registerPage: PropType<RegisterPage>;
actions: PropType<Record<string, Function>>;
}>> & Readonly<{}>, {}, {}, {}, {}, string, ComponentProvideOptions, true, {}, any>>>;
}, {}, {}, {}, ComponentOptionsMixin, ComponentOptionsMixin, {}, string, PublicProps, Readonly<ExtractPropTypes<    {
schema: ObjectConstructor;
data: ObjectConstructor;
registerPage: PropType<RegisterPage>;
actions: PropType<Record<string, Function>>;
}>> & Readonly<{}>, {}, {}, {}, {}, string, ComponentProvideOptions, true, {}, any>;

export { }
