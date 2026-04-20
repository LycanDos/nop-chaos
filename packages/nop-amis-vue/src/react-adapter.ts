import { PageOptions, createPage } from "@nop-chaos/nop-core";

import { PropType, defineComponent, onBeforeUnmount, ref, h, watch } from 'vue';
import type { PageObject, RegisterPage } from '@nop-chaos/nop-core';
import { Root, createRoot } from 'react-dom/client'
import { cloneDeep } from 'lodash-es'

export type ReactPageOptions = PageOptions & {
    onRenderPage(schema, data:any, page: PageObject): Promise<JSX.Element>|JSX.Element
    onDestroyPage?(page: PageObject): void
}

export function defineReactPageComponent(builder: (props: {actions?:Record<string,Function>})=> ReactPageOptions) {
    return defineComponent({
        props: {
            schema: Object,
            data: Object,
            registerPage: Function as PropType<RegisterPage>,
            actions: Object as PropType<Record<string, Function>>
        },

        setup(props) {
            const domRef = ref<HTMLElement>()
            let root: Root | undefined;
            let renderToken = 0;

            const options = builder({actions: props.actions})
            let page = createPage(options);

            props.registerPage?.(page)

            function scheduleDestroy(targetRoot: Root | undefined) {
                if (!targetRoot) {
                    return;
                }
                setTimeout(() => {
                    try {
                        targetRoot.unmount();
                    } finally {
                        options.onDestroyPage?.(page);
                    }
                }, 0);
            }

            function destroyPage() {
                const currentRoot = root;
                root = undefined;
                renderToken++;
                scheduleDestroy(currentRoot);
            }

            async function renderPage() {
                const currentToken = ++renderToken;
                const schema = cloneDeep(props.schema as any)
                const currentRoot = createRoot(domRef.value!);
                root = currentRoot;
                try {
                    const vdom = await Promise.resolve(options.onRenderPage(schema, props.data, page));
                    if (currentToken !== renderToken || root !== currentRoot) {
                        scheduleDestroy(currentRoot);
                        return;
                    }
                    currentRoot.render(vdom as any);
                } catch (err) {
                    if (currentToken === renderToken && root === currentRoot) {
                        root = undefined;
                    }
                    scheduleDestroy(currentRoot);
                    throw err;
                }
            }

            watch([() => props.schema, () => props.data, domRef], () => {
                destroyPage()
                if (props.schema && domRef.value) {
                    void renderPage();
                }
            }, { immediate: true, flush: 'post' });

            onBeforeUnmount(() => {
                destroyPage()
            })


            return ()=> h('div', {
                ref: domRef,
                style: {
                    width: '100%',
                    height: '100%'
                },
                class: 'nop-page'
            });
        }
    });
}
