import { ComponentOptionsMixin } from 'vue';
import { ComponentProvideOptions } from 'vue';
import { DefineComponent } from 'vue';
import { PublicProps } from 'vue';

export declare const ProcessDesigner: DefineComponent<    {}, {}, {}, {}, {}, ComponentOptionsMixin, ComponentOptionsMixin, {}, string, PublicProps, Readonly<{}> & Readonly<{}>, {}, {}, {}, {}, string, ComponentProvideOptions, true, {}, any>;

export declare const ProcessViewer: DefineComponent<    {}, {}, {}, {}, {}, ComponentOptionsMixin, ComponentOptionsMixin, {}, string, PublicProps, Readonly<{}> & Readonly<{}>, {}, {}, {}, {}, string, ComponentProvideOptions, true, {}, any>;

export { }


declare namespace ContextPadProvider {
    const $inject: string[];
}

declare namespace _default {
    const __init__: string[];
    const contextPadProvider: (string | typeof CustomContextPadProvider)[];
}


declare namespace ActivitiModdleExtension {
    const $inject: string[];
}

declare namespace _default {
    const __init__: string[];
    const ActivitiModdleExtension: (string | typeof activitiExtension)[];
}


declare namespace CamundaModdleExtension {
    const $inject: string[];
}

declare namespace _default {
    const __init__: string[];
    const camundaModdleExtension: (string | typeof extension)[];
}


declare namespace FlowableModdleExtension {
    const $inject: string[];
}

declare namespace _default {
    const __init__: string[];
    const FlowableModdleExtension: (string | typeof flowableExtension)[];
}


declare namespace CustomPalette {
    const $inject: string[];
}

declare namespace _default {
    const __init__: string[];
    const paletteProvider: (string | typeof CustomPalette)[];
}


declare namespace PaletteProvider {
    const $inject: string[];
}

declare namespace _default {
    const __init__: string[];
    const customRenderer: (string | typeof CustomRenderer)[];
}

declare namespace _default {
    const __init__: string[];
    const customRules: (string | typeof CustomRules)[];
}

declare namespace _default {
    function bind(el: any, binding: any, vnode: any): void;
    function update(el: any, binding: any): void;
    function unbind(el: any): void;
}

