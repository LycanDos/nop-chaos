import * as Vue from "vue";
import { defineComponent, ref, onUnmounted, openBlock, createElementBlock, watch, onBeforeUnmount, h, onMounted, createElementVNode, createTextVNode, shallowRef, watchEffect, markRaw, Fragment as Fragment$1, createBlock, resolveDynamicComponent, mergeProps, createCommentVNode, unref, withCtx, createVNode, normalizeProps, guardReactiveProps, resolveComponent, createStaticVNode, normalizeStyle, renderList, toDisplayString } from "vue";
import { ajaxFetch, useDebug, useAdapter, providePage, default_jumpTo, isCancel, default_isCurrentUrl, default_updateLocation, createPage, transformPageJson, bindActions, getSchemaProcessorType, deletePageCache, PageApis, registerAdapter, registerModule } from "@nop-chaos/nop-core";
import { isString, cloneDeep } from "lodash-es";
import { toast, clearStoresCache, setDefaultLocale, render, ToastComponent, ScopedContext, Renderer, FormItem, dataMapping, alert, confirm } from "amis";
import copy from "copy-to-clipboard";
import { createRoot } from "react-dom/client";
import * as React from "react";
import React__default, { createElement, Fragment } from "react";
import { ElDialog, ElButton } from "element-plus";
import yaml from "js-yaml";
import { createObject, resolveVariableAndFilter } from "amis-core";
import { applyPureVueInReact, applyVueInReact } from "veaury";
import * as ReactDom from "react-dom";
const _sfc_main$8 = defineComponent({
  props: {
    schema: Object,
    rollbackPageSource: Function,
    getPageSource: {
      type: Function,
      required: true
    },
    savePageSource: {
      type: Function,
      required: true
    }
  },
  emits: ["exit"],
  setup(props, { emit }) {
    const editorRef = ref(null);
    let fetched = false;
    const { savePageSource, rollbackPageSource, getPageSource } = props;
    function handleEvent(event) {
      if (event.data == "amis-editor-inited") {
        if (fetched)
          return;
        var msg = {
          type: "setSchema",
          data: props.schema
        };
        postMsg(msg);
      } else if (event.data === "amis-editor-reload") {
        fetched = false;
        startFetch();
      } else if (event.data === "amis-editor-exit") {
        emit("exit");
      } else if (event.data === "amis-editor-rollback") {
        if (rollbackPageSource) {
          rollbackPageSource().then(() => {
            postMsg({
              type: "toast",
              level: "info",
              message: "回滚成功"
            });
          }).catch((e) => {
            postMsg({
              type: "toast",
              level: "error",
              message: e.message || e.toString()
            });
          }).then(() => {
            fetched = false;
            return startFetch();
          });
        }
      } else if (isString(event.data) && event.data.startsWith("{")) {
        var data = JSON.parse(event.data);
        if (data.type == "save") {
          savePageSource(data.data).then(() => {
            postMsg({
              type: "toast",
              message: "保存成功"
            });
          }).catch((e) => {
            postMsg({
              type: "toast",
              level: "error",
              message: e.message || e.toString()
            });
          });
        } else if (data.type == "ajaxFetch") {
          ajaxFetch(data.data).then((result) => {
            postMsg({
              type: "ajaxComplete",
              reqId: data.reqId,
              result
            });
          });
        }
      } else {
        console.log("unknown-message", event.data);
      }
    }
    function postMsg(msg) {
      const frame = editorRef.value;
      if (!frame)
        return;
      const str = isString(msg) ? msg : JSON.stringify(msg);
      frame.contentWindow.postMessage(str, "*");
    }
    function startFetch() {
      const frame = editorRef.value;
      if (!frame)
        return;
      fetched = true;
      return getPageSource(true).then((page) => {
        postMsg({
          type: "toast",
          level: "info",
          message: "页面加载成功"
        });
        var msg = {
          type: "setSchema",
          data: page
        };
        postMsg(msg);
      }).catch((e) => {
        postMsg({
          type: "toast",
          level: "error",
          message: e.message || e.toString()
        });
        throw e;
      });
    }
    window.addEventListener("message", handleEvent);
    onUnmounted(() => {
      console.log("editor unmounted");
      window.removeEventListener("message", handleEvent);
    });
    return {
      editorRef
    };
  }
});
const _export_sfc = (sfc, props) => {
  const target = sfc.__vccOpts || sfc;
  for (const [key, val] of props) {
    target[key] = val;
  }
  return target;
};
const _hoisted_1$3 = {
  style: { "width": "100%", "height": "100%", "border": "none" },
  ref: "editorRef",
  src: "/amis-editor/index.html"
};
function _sfc_render$4(_ctx, _cache, $props, $setup, $data, $options) {
  return openBlock(), createElementBlock("iframe", _hoisted_1$3, null, 512);
}
const AmisPageEditor = /* @__PURE__ */ _export_sfc(_sfc_main$8, [["render", _sfc_render$4]]);
function createEnv(page) {
  const { debug } = useDebug();
  const adapter = useAdapter();
  let env = {
    session: page.id,
    affixOffsetTop: 0,
    fetcher(options) {
      providePage(page);
      options._page = page;
      return ajaxFetch(options);
    },
    jumpTo(to, action, ctx) {
      const router = adapter.useRouter();
      return default_jumpTo(router, to);
    },
    isCancel,
    isCurrentUrl: default_isCurrentUrl,
    updateLocation(to, replace) {
      default_updateLocation(to, !!replace);
    },
    notify: adapter.notify,
    enableAMISDebug: debug.value,
    alert: adapter.alert,
    confirm: adapter.confirm,
    copy: (contents, options) => {
      if (options === void 0) {
        options = {};
      }
      const { t } = adapter.useI18n();
      const ret = copy(contents, options);
      ret && (!options || options.shutup !== true) && toast.info(t("Copy To Clipboard"));
      return ret;
    }
  };
  env._page = page;
  page.env = env;
  return env;
}
function defineReactPageComponent(builder) {
  return defineComponent({
    props: {
      schema: Object,
      data: Object,
      registerPage: Function,
      actions: Object
    },
    setup(props) {
      var _a;
      const domRef = ref();
      let root;
      let renderToken = 0;
      const options = builder({ actions: props.actions });
      let page = createPage(options);
      (_a = props.registerPage) == null ? void 0 : _a.call(props, page);
      function scheduleDestroy(targetRoot) {
        if (!targetRoot) {
          return;
        }
        setTimeout(() => {
          var _a2;
          try {
            targetRoot.unmount();
          } finally {
            (_a2 = options.onDestroyPage) == null ? void 0 : _a2.call(options, page);
          }
        }, 0);
      }
      function destroyPage() {
        const currentRoot = root;
        root = void 0;
        renderToken++;
        scheduleDestroy(currentRoot);
      }
      async function renderPage() {
        const currentToken = ++renderToken;
        const schema = cloneDeep(props.schema);
        const currentRoot = createRoot(domRef.value);
        root = currentRoot;
        try {
          const vdom = await Promise.resolve(options.onRenderPage(schema, props.data, page));
          if (currentToken !== renderToken || root !== currentRoot) {
            scheduleDestroy(currentRoot);
            return;
          }
          currentRoot.render(vdom);
        } catch (err) {
          if (currentToken === renderToken && root === currentRoot) {
            root = void 0;
          }
          scheduleDestroy(currentRoot);
          throw err;
        }
      }
      watch([() => props.schema, () => props.data, domRef], () => {
        destroyPage();
        if (props.schema && domRef.value) {
          void renderPage();
        }
      }, { immediate: true, flush: "post" });
      onBeforeUnmount(() => {
        destroyPage();
      });
      return () => h("div", {
        ref: domRef,
        style: {
          width: "100%",
          height: "100%"
        },
        class: "nop-page"
      });
    }
  });
}
const AmisSchemaPage = defineReactPageComponent((props) => {
  let amisScoped;
  return {
    actions: props.actions,
    getComponent(name) {
      return get_component(name);
    },
    getScopedStore(name) {
      var _a, _b;
      return (_b = (_a = get_component(name)) == null ? void 0 : _a.props) == null ? void 0 : _b.store;
    },
    getState(name) {
      return get_root_store().get(name);
    },
    setState(name, value) {
      get_root_store().set(name, value);
    },
    onDestroyPage(page) {
      clearStoresCache(page.id);
    },
    async onRenderPage(schema, data, page) {
      let env = createEnv(page);
      const locale = useAdapter().useLocale();
      let opts = {
        data,
        onConfirm: page.getAction("ok") || function() {
        },
        onClose: function(b) {
          var _a, _b;
          if (b) {
            (_a = page.getAction("ok")) == null ? void 0 : _a();
          } else {
            (_b = page.getAction("cancel")) == null ? void 0 : _b();
          }
        },
        scopeRef: (scoped) => {
          amisScoped = scoped;
          window.__amisScoped__ = scoped;
        },
        locale,
        // amis内部会自动替换zh_CN为zh-CN
        theme: "antd"
      };
      setDefaultLocale(locale);
      schema = await transformPageJson(schema.__baseUrl, schema);
      await bindActions(schema.__baseUrl, schema, page);
      return render(schema, opts, env);
    }
  };
  function get_root() {
    return amisScoped == null ? void 0 : amisScoped.getComponents()[0];
  }
  function get_root_store() {
    var _a;
    return (_a = get_root()) == null ? void 0 : _a.context.store;
  }
  function get_component(name) {
    var _a, _b, _c;
    if (name[0] == "#") {
      let pos = name.indexOf(".");
      if (pos < 0) {
        return (_a = get_root()) == null ? void 0 : _a.context.getComponentById(name.substring(1));
      } else {
        return (_b = get_root()) == null ? void 0 : _b.context.getComponentById(name.substring(1)).getComponentByName(name.substring(pos + 1));
      }
    } else {
      return (_c = get_root()) == null ? void 0 : _c.context.getComponentByName(name);
    }
  }
});
const _sfc_main$7 = /* @__PURE__ */ defineComponent({
  __name: "AmisToast",
  setup(__props) {
    const domRef = ref();
    let root;
    onMounted(() => {
      root = createRoot(domRef.value);
      root.render(createElement(Fragment, {}, createElement(ToastComponent, { position: "top-right" })));
    });
    onBeforeUnmount(() => {
      if (root) {
        root.unmount();
        root = void 0;
      }
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        ref_key: "domRef",
        ref: domRef
      }, null, 512);
    };
  }
});
const debuggerSchema = {
  "type": "page",
  "xui:schema": "amis",
  "body": {
    "type": "form",
    "title": null,
    "actions": [
      {
        "label": "Cancel",
        "type": "action",
        "actionType": "ajax",
        "level": "default",
        "api": {
          url: "action://cancel",
          messages: {
            success: "_"
          }
        }
      },
      {
        "label": "Apply",
        "type": "action",
        "actionType": "ajax",
        "level": "success",
        "api": "action://change"
      },
      {
        "label": "Yaml/JSON",
        "type": "action",
        "actionType": "ajax",
        "level": "primary",
        "api": "action://toggleYaml"
      },
      {
        "label": "Submit",
        "type": "action",
        "actionType": "ajax",
        "level": "primary",
        "api": "action://ok"
      }
    ],
    "body": [
      {
        "type": "editor",
        "name": "schema",
        "placeholder": "{}",
        "visibleOn": "this.lang !='yaml'"
      },
      {
        "type": "yaml-editor",
        "name": "schema",
        "placeholder": {},
        "visibleOn": "this.lang == 'yaml'"
      }
    ]
  }
};
const XuiLoading_vue_vue_type_style_index_0_scoped_b50685ed_lang = "";
const _sfc_main$6 = {};
const _hoisted_1$2 = { class: "app-loading" };
function _sfc_render$3(_ctx, _cache) {
  return openBlock(), createElementBlock("div", _hoisted_1$2, _cache[0] || (_cache[0] = [
    createElementVNode("div", { class: "app-loading-wrap" }, [
      createElementVNode("div", { class: "app-loading-dots" }, [
        createElementVNode("span", { class: "dot dot-spin" }, [
          createElementVNode("i"),
          createElementVNode("i"),
          createElementVNode("i"),
          createElementVNode("i")
        ])
      ]),
      createElementVNode("div", { class: "app-loading-title" }, [
        createElementVNode("b", null, "N"),
        createTextVNode("op is n"),
        createElementVNode("b", null, "o"),
        createTextVNode("t "),
        createElementVNode("b", null, "P"),
        createTextVNode("rogramming ")
      ])
    ], -1)
  ]));
}
const XuiLoading = /* @__PURE__ */ _export_sfc(_sfc_main$6, [["render", _sfc_render$3], ["__scopeId", "data-v-b50685ed"]]);
const _sfc_main$5 = /* @__PURE__ */ defineComponent({
  __name: "XuiPageEditor",
  props: {
    rollbackPageSource: Function,
    getPageSource: {
      type: Function,
      required: true
    },
    savePageSource: {
      type: Function,
      required: true
    }
  },
  emits: ["exit"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    console.log("[XuiPageEditor] props:", props);
    const { getPageSource } = props;
    const { useI18n } = useAdapter();
    const emit = __emit;
    function handleExit() {
      emit("exit");
    }
    const componentType = shallowRef();
    const schemaRef = shallowRef();
    watchEffect(() => {
      getPageSource(false).then((schema) => {
        console.log("[XuiPageEditor] getPageSource result:", schema);
        if (!schema)
          schema = {};
        schemaRef.value = markRaw(schema);
        const schemaTypeName = schema["xui:schema-type"];
        if (!schemaTypeName) {
          componentType.value = markRaw(AmisPageEditor);
          console.log("[XuiPageEditor] use default AmisPageEditor");
        } else {
          const schemaType = getSchemaProcessorType(schemaTypeName);
          if (!schemaType) {
            const { t } = useI18n();
            useAdapter().notify("error", t("nop.err.unknown-schema-type"));
            throw new Error("nop.err.unknown-schema-type");
          }
          componentType.value = markRaw(schemaType.editorComponentType);
          console.log("[XuiPageEditor] use schemaType:", schemaTypeName, schemaType);
        }
      });
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock(Fragment$1, null, [
        componentType.value ? (openBlock(), createBlock(resolveDynamicComponent(componentType.value), mergeProps({ key: 0 }, props, {
          schema: schemaRef.value,
          onExit: handleExit
        }), null, 16, ["schema"])) : createCommentVNode("", true),
        !componentType.value ? (openBlock(), createBlock(XuiLoading, { key: 1 })) : createCommentVNode("", true)
      ], 64);
    };
  }
});
const _sfc_main$4 = /* @__PURE__ */ defineComponent({
  __name: "XuiPageEditorDialog",
  props: {
    modelValue: Boolean,
    rollbackPageSource: Function,
    getPageSource: {
      type: Function,
      required: true
    },
    savePageSource: {
      type: Function,
      required: true
    }
  },
  emits: ["update:modelValue", "exit"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    console.log("[XuiPageEditorDialog] props:", props);
    function handleEditorExit() {
      console.log("[XuiPageEditorDialog] handleEditorExit called");
      emit("update:modelValue", false);
    }
    function handleChange(value) {
      console.log("[XuiPageEditorDialog] handleChange called", value);
      emit("update:modelValue", value);
    }
    return (_ctx, _cache) => {
      return openBlock(), createBlock(unref(ElDialog), {
        destroyOnClose: true,
        class: "page-full-screen",
        modelValue: __props.modelValue,
        maskClosable: false,
        "append-to-body": true,
        width: "100%",
        height: "100%",
        "align-center": true,
        fullscreen: true,
        footer: null,
        closable: false,
        keyboard: false,
        "onUpdate:modelValue": handleChange
      }, {
        default: withCtx(() => [
          _cache[0] || (_cache[0] = createElementVNode("header", null, null, -1)),
          createVNode(_sfc_main$5, {
            onExit: handleEditorExit,
            savePageSource: __props.savePageSource,
            rollbackPageSource: __props.rollbackPageSource,
            getPageSource: __props.getPageSource
          }, null, 8, ["savePageSource", "rollbackPageSource", "getPageSource"])
        ]),
        _: 1,
        __: [0]
      }, 8, ["modelValue"]);
    };
  }
});
const XuiPageEditorDialog_vue_vue_type_style_index_0_lang = "";
const _hoisted_1$1 = { class: "page-debugger" };
const _sfc_main$3 = /* @__PURE__ */ defineComponent({
  __name: "XuiDebugger",
  props: {
    path: {
      type: String,
      required: true
    },
    schema: Object
  },
  emits: ["update:schema", "rebuild"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const schemaVisible = ref(false);
    const schemaData = shallowRef({
      schema: "",
      lang: "json"
    });
    const { PageProvider__getPageSource, PageProvider__rollbackPageSource, PageProvider__savePageSource } = PageApis;
    function getPageSource(silent) {
      return PageProvider__getPageSource(props.path, silent);
    }
    function savePageSource(data) {
      deletePageCache(props.path);
      PageProvider__savePageSource(props.path, data, true);
    }
    function rollbackPageSource() {
      PageProvider__rollbackPageSource(props.path, true);
    }
    function openSchemaEditor() {
      schemaData.value = { schema: yaml.dump(props.schema), lang: "yaml" };
      schemaVisible.value = true;
    }
    const schemaActions = {
      "ok": handleOk,
      "cancel": handleCancel,
      "change": handleChange,
      "rebuild": handleRebuild,
      "toggleYaml": handleToggleYaml
    };
    function handleChange(options) {
      const data = options.data;
      let json = schemaData.value.lang == "yaml" ? yaml.load(data.schema) : JSON.parse(data.schema);
      emit("update:schema", json);
    }
    function handleOk(data) {
      handleChange(data);
      schemaVisible.value = false;
    }
    function handleCancel() {
      schemaVisible.value = false;
    }
    function handleRebuild() {
      emit("rebuild");
    }
    function handleToggleYaml(options) {
      let schema = options.data.schema;
      if (options.data.lang == "yaml") {
        schemaData.value = { lang: "json", schema: JSON.stringify(yaml.load(schema), null, "  ") };
      } else {
        schemaData.value = { lang: "yaml", schema: yaml.dump(JSON.parse(schema)) };
      }
    }
    const designerVisible = ref(false);
    function openXuiPageEditor() {
      designerVisible.value = true;
    }
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock(Fragment$1, null, [
        createElementVNode("span", _hoisted_1$1, [
          createVNode(unref(ElButton), {
            type: "primary",
            circle: true,
            title: "Schema Json Editor",
            onClick: openSchemaEditor
          }, {
            default: withCtx(() => _cache[2] || (_cache[2] = [
              createTextVNode("S", -1)
            ])),
            _: 1,
            __: [2]
          }),
          __props.path ? (openBlock(), createBlock(unref(ElButton), {
            key: 0,
            type: "danger",
            circle: true,
            title: "Page Visual Designer",
            danger: "",
            onClick: openXuiPageEditor
          }, {
            default: withCtx(() => _cache[3] || (_cache[3] = [
              createTextVNode("V", -1)
            ])),
            _: 1,
            __: [3]
          })) : createCommentVNode("", true)
        ]),
        createVNode(unref(ElDialog), {
          modelValue: schemaVisible.value,
          "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => schemaVisible.value = $event),
          title: "Page Schema",
          width: "600px",
          height: 500,
          center: true,
          class: "debug-modal",
          mask: false,
          maskClosable: false,
          draggable: true,
          footer: null,
          "append-to-body": true,
          destroyOnClose: ""
        }, {
          default: withCtx(() => [
            createVNode(unref(AmisSchemaPage), {
              schema: unref(debuggerSchema),
              actions: schemaActions,
              data: schemaData.value
            }, null, 8, ["schema", "data"])
          ]),
          _: 1
        }, 8, ["modelValue"]),
        createVNode(_sfc_main$4, {
          modelValue: designerVisible.value,
          "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => designerVisible.value = $event),
          savePageSource,
          rollbackPageSource,
          getPageSource
        }, null, 8, ["modelValue"])
      ], 64);
    };
  }
});
const XuiDebugger_vue_vue_type_style_index_0_lang = "";
const _sfc_main$2 = defineComponent({
  props: {
    schema: Object,
    data: Object,
    registerPage: Function,
    actions: Object
  },
  setup(props) {
    const { useI18n } = useAdapter();
    let componentType = ref(markRaw(AmisSchemaPage));
    watchEffect(() => {
      var _a;
      const schemaTypeName = (_a = props.schema) == null ? void 0 : _a["xui:schema-type"];
      if (!schemaTypeName) {
        componentType.value = markRaw(AmisSchemaPage);
      } else {
        const schemaType = getSchemaProcessorType(schemaTypeName);
        if (!schemaType) {
          const { t } = useI18n();
          useAdapter().notify("error", t("nop.err.unknown-schema-type"));
          throw new Error("nop.err.unknown-schema-type");
        }
        componentType.value = markRaw(schemaType.componentType);
      }
    });
    return {
      componentType
    };
  }
});
function _sfc_render$2(_ctx, _cache, $props, $setup, $data, $options) {
  return openBlock(), createBlock(resolveDynamicComponent(_ctx.componentType), normalizeProps(guardReactiveProps(_ctx.$props)), null, 16);
}
const XuiSchemaPage = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["render", _sfc_render$2]]);
const _sfc_main$1 = defineComponent({
  name: "amis-page",
  props: {
    path: {
      type: String,
      required: true
    },
    data: Object,
    config: Object,
    registerPage: Function,
    actions: Object
  },
  components: { XuiDebugger: _sfc_main$3, XuiSchemaPage },
  setup(props) {
    const { getPage } = useAdapter();
    let pageSchema = shallowRef();
    function registerPage(p) {
      var _a;
      (_a = props.registerPage) == null ? void 0 : _a.call(props, p);
      registerCopilotContext(props.path, p);
    }
    watchEffect(() => {
      getPage(props.path).then((res) => {
        res.__baseUrl = props.path;
        updateSchema(res);
        registerCopilotFromSchema(props.path, res);
      });
    });
    const preliminaryPageType = extractPageType(props.path);
    window.dispatchEvent(new CustomEvent("copilot:page-context", {
      detail: {
        pageType: preliminaryPageType,
        route: props.path,
        pageKind: "pending",
        state: {},
        actions: {}
      },
      bubbles: false
    }));
    function registerCopilotFromSchema(path, schema) {
      try {
        const pageType = extractPageType(path);
        const isCrudPage = hasPageType(schema, "crud") || hasPageType(schema, "page") && findComponentInSchema(schema, "crud");
        const isFormPage = hasPageType(schema, "form");
        if (isCrudPage) {
          const entityName = extractEntityName(schema, path);
          const crudContext = extractCrudContext(schema, entityName);
          const actions2 = buildCrudPageActions(crudContext, schema);
          window.dispatchEvent(new CustomEvent("copilot:page-context", {
            detail: {
              pageType,
              route: path,
              pageKind: "crud",
              entityName,
              crudContext,
              state: { entity: entityName },
              actions: actions2
            },
            bubbles: false
          }));
        } else if (isFormPage) {
          const fields = extractFormFields(schema);
          const actions2 = buildFormPageActions();
          window.dispatchEvent(new CustomEvent("copilot:page-context", {
            detail: {
              pageType,
              route: path,
              pageKind: "form",
              state: {},
              formSchema: { fields },
              actions: actions2
            },
            bubbles: false
          }));
        } else {
          const entityName = extractEntityName(schema, path);
          window.dispatchEvent(new CustomEvent("copilot:page-context", {
            detail: {
              pageType,
              route: path,
              pageKind: "page",
              entityName,
              state: { entity: entityName }
            },
            bubbles: false
          }));
        }
      } catch (e) {
      }
    }
    function registerCopilotContext(path, pageObj) {
      try {
        const pageType = extractPageType(path);
        const entityName = extractEntityName(pageObj, path);
        window.__copilotPageType__ = pageType;
        window.__copilotPageEntity__ = entityName;
      } catch (e) {
      }
    }
    function extractPageType(path) {
      if (path.includes("FlowNodeDef"))
        return "FlowNodeDef";
      if (path.includes("NopSysClusterLeader"))
        return "NopSysClusterLeader";
      if (path.includes("NopAi"))
        return "NopAiChatRequest";
      const entityMatch = path.match(/Nop[A-Z][a-zA-Z]+/);
      if (entityMatch)
        return entityMatch[0];
      return path.replace(/^.*\/([^/]+)$/, "$1");
    }
    function extractEntityName(schema, path) {
      var _a;
      if ((_a = schema == null ? void 0 : schema.api) == null ? void 0 : _a.url) {
        const m = schema.api.url.match(/Nop[A-Za-z]+/);
        if (m)
          return m[0];
      }
      return extractPageType(path);
    }
    function hasPageType(schema, type) {
      if (!schema)
        return false;
      if (schema.type === type)
        return true;
      if (schema.body) {
        return hasPageType(schema.body, type);
      }
      return false;
    }
    function findComponentInSchema(schema, type) {
      if (!schema)
        return false;
      if (schema.type === type)
        return true;
      if (Array.isArray(schema)) {
        return schema.some((s) => findComponentInSchema(s, type));
      }
      if (typeof schema === "object") {
        return Object.values(schema).some((v) => findComponentInSchema(v, type));
      }
      return false;
    }
    function extractFormFields(schema) {
      const fields = [];
      function walk(node) {
        var _a, _b;
        if (!node || typeof node !== "object")
          return;
        if (Array.isArray(node)) {
          node.forEach(walk);
          return;
        }
        if (node.type && (node.name || node.label)) {
          const controlTypes = ["input-text", "input-number", "input-email", "input-password", "select", "textarea", "input-date", "switch", "checkbox", "radio", "input-file", "input-image"];
          if (controlTypes.includes(node.type) || ((_a = node.type) == null ? void 0 : _a.startsWith("input-"))) {
            fields.push({
              name: node.name || "",
              label: node.label || node.name || "",
              type: mapAmisType(node.type),
              required: node.required || ((_b = node.validations) == null ? void 0 : _b.required) || false
            });
          }
        }
        for (const key of ["body", "controls", "columns", "tabs", "fields", "form"]) {
          if (node[key])
            walk(node[key]);
        }
      }
      walk(schema);
      return fields;
    }
    function extractCrudContext(schema, entityName) {
      const context = {
        entityName,
        canCreate: false,
        canEdit: false,
        canDelete: false
      };
      function findCrudConfig(node) {
        if (!node || typeof node !== "object")
          return null;
        if (node.type === "crud")
          return node;
        if (Array.isArray(node)) {
          for (const item of node) {
            const found = findCrudConfig(item);
            if (found)
              return found;
          }
        }
        if (typeof node === "object") {
          for (const key of ["body", "controls", "columns", "tabs", "panel"]) {
            const found = findCrudConfig(node[key]);
            if (found)
              return found;
          }
        }
        return null;
      }
      const crudConfig = findCrudConfig(schema);
      if (crudConfig) {
        if (crudConfig.api)
          ;
        if (crudConfig.columns) {
          context.visibleColumns = (Array.isArray(crudConfig.columns) ? crudConfig.columns : []).filter((col) => col && col.name).map((col) => col.name);
        }
        const listActions = Array.isArray(crudConfig.listActions) ? crudConfig.listActions : [];
        const rowActions = Array.isArray(crudConfig.rowActions) ? crudConfig.rowActions : [];
        const hasActionId = (actions2, ids) => actions2.some((action) => action && ids.includes(action.id));
        const hasCreate = findComponentInSchema(crudConfig, "create") || crudConfig.createAction || hasActionId(listActions, ["add-button", "add", "create-button"]);
        const hasEdit = findComponentInSchema(crudConfig, "edit") || crudConfig.editAction || hasActionId(rowActions, ["row-update-button", "edit", "update-button"]);
        const hasDelete = findComponentInSchema(crudConfig, "delete") || crudConfig.deleteAction || hasActionId(listActions, ["batch-delete-button", "delete-button"]) || hasActionId(rowActions, ["row-delete-button", "delete"]);
        context.canCreate = !!hasCreate;
        context.canEdit = !!hasEdit;
        context.canDelete = !!hasDelete;
      }
      return context;
    }
    function mapAmisType(amisType) {
      switch (amisType) {
        case "input-text":
          return "text";
        case "input-number":
          return "number";
        case "input-email":
          return "email";
        case "input-password":
          return "password";
        case "input-date":
        case "input-datetime":
          return "date";
        case "input-tel":
          return "phone";
        case "select":
          return "select";
        case "textarea":
          return "textarea";
        case "switch":
          return "boolean";
        default:
          return (amisType == null ? void 0 : amisType.replace("input-", "")) || "text";
      }
    }
    function findAndClickAmisButton(labels) {
      var _a;
      for (const label of labels) {
        const btn = document.querySelector(`[data-tooltip="${label}"]`);
        if (btn) {
          btn.click();
          return { found: true };
        }
      }
      const buttons = document.querySelectorAll('button, .btn, [role="button"], .cxd-Button, .ant-btn');
      for (const btn of buttons) {
        const text = ((_a = btn.textContent) == null ? void 0 : _a.trim()) || "";
        if (labels.some((l) => text === l)) {
          btn.click();
          return { found: true };
        }
      }
      return { found: false, error: `找不到按钮: ${labels.join(", ")}` };
    }
    function findAndFillAmisField(fieldName, label, value) {
      var _a;
      const modal = document.querySelector(".ant-modal-wrap, .ant-modal, .cxd-Modal--open");
      const container = modal || document;
      let input = null;
      if (fieldName) {
        input = container.querySelector(
          `input[name="${fieldName}"], textarea[name="${fieldName}"], select[name="${fieldName}"]`
        );
      }
      if (!input && fieldName) {
        const wrapper = container.querySelector(`[data-name="${fieldName}"]`);
        if (wrapper) {
          input = wrapper.querySelector("input, textarea, select");
        }
      }
      if (!input && label) {
        const items = container.querySelectorAll(".ant-form-item, .cxd-FormItem");
        for (const item of items) {
          const labelEl = item.querySelector(".ant-form-item-label > label, .cxd-FormItem-label, label");
          if (labelEl) {
            const text = ((_a = labelEl.textContent) == null ? void 0 : _a.trim()) || "";
            if (text.includes(label) || label.includes(text) && text.length >= 3) {
              input = item.querySelector("input, textarea, select");
              if (input)
                break;
            }
          }
        }
      }
      if (!input)
        return { found: false, error: `未找到表单字段: ${label || fieldName}` };
      const strValue = String(value);
      if (input instanceof HTMLInputElement) {
        const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
        nativeSetter.call(input, strValue);
      } else if (input instanceof HTMLTextAreaElement) {
        const nativeSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
        nativeSetter.call(input, strValue);
      } else if (input instanceof HTMLSelectElement) {
        const nativeSetter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set;
        nativeSetter.call(input, strValue);
      } else {
        input.value = strValue;
      }
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      return { found: true };
    }
    function findAmisCrudComponent() {
      var _a, _b, _c, _d;
      const scoped = window.__amisScoped__;
      if (!scoped)
        return null;
      try {
        const comps = scoped.getComponents();
        for (const comp of comps) {
          if (((_a = comp == null ? void 0 : comp.props) == null ? void 0 : _a.type) === "crud")
            return comp;
        }
        for (const comp of comps) {
          const body = (_b = comp.props) == null ? void 0 : _b.body;
          if ((body == null ? void 0 : body.type) === "crud") {
            const bc = (_d = (_c = comp.context) == null ? void 0 : _c.getComponentByName) == null ? void 0 : _d.call(_c, body.name);
            if (bc)
              return bc;
          }
        }
      } catch {
      }
      return null;
    }
    function dispatchAmisCrudAction(actionId) {
      var _a, _b, _c, _d, _e;
      const crud = findAmisCrudComponent();
      if (!crud)
        return { found: false, error: "找不到 CRUD 组件" };
      const listActions = ((_a = crud.props) == null ? void 0 : _a.listActions) || [];
      const rowActions = ((_b = crud.props) == null ? void 0 : _b.rowActions) || [];
      const allActions = [...listActions, ...rowActions];
      const actionDef = allActions.find(
        (a) => {
          var _a2, _b2, _c2;
          return a.id === actionId || actionId === "add" && (((_a2 = a.id) == null ? void 0 : _a2.includes("add")) || a.actionType === "dialog") || actionId === "edit" && ((_b2 = a.id) == null ? void 0 : _b2.includes("update")) || actionId === "delete" && ((_c2 = a.id) == null ? void 0 : _c2.includes("delete"));
        }
      );
      if (!actionDef)
        return { found: false, error: `找不到 action: ${actionId}` };
      try {
        const storeData = ((_d = (_c = crud.props) == null ? void 0 : _c.store) == null ? void 0 : _d.data) ?? {};
        (_e = crud.doAction) == null ? void 0 : _e.call(crud, actionDef, storeData, false);
        return { found: true };
      } catch (e) {
        return { found: false, error: e.message };
      }
    }
    function reloadCrud() {
      const crud = findAmisCrudComponent();
      if (!crud)
        return { found: false, error: "找不到 CRUD 组件" };
      try {
        if (typeof crud.reload === "function") {
          crud.reload();
          return { found: true };
        }
        return { found: false, error: "CRUD 组件没有 reload 方法" };
      } catch (e) {
        return { found: false, error: e.message };
      }
    }
    function buildCrudPageActions(_crudCtx, _schema) {
      const actions2 = {};
      async function ensureDialogOpened(timeoutMs = 3e3) {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
          const modal = document.querySelector(".ant-modal-wrap, .ant-modal, .cxd-Modal--open");
          if (modal)
            return;
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        throw new Error("新增对话框未打开");
      }
      async function openAddDialog() {
        const r = dispatchAmisCrudAction("add");
        if (r.found) {
          await ensureDialogOpened();
          return;
        }
        const domR = findAndClickAmisButton(["新增", "新建", "添加", "创建"]);
        if (!domR.found)
          throw new Error(domR.error);
        await ensureDialogOpened();
      }
      actions2.add = async () => {
        await openAddDialog();
        return { actionType: "add" };
      };
      actions2.edit = async () => {
        const r = dispatchAmisCrudAction("edit");
        if (!r.found) {
          const domR = findAndClickAmisButton(["编辑", "修改"]);
          if (!domR.found)
            throw new Error(domR.error);
        }
        await new Promise((resolve) => setTimeout(resolve, 400));
        return { actionType: "edit" };
      };
      actions2.delete = async () => {
        const r = dispatchAmisCrudAction("delete");
        if (!r.found) {
          const domR = findAndClickAmisButton(["删除"]);
          if (!domR.found)
            throw new Error(domR.error);
        }
        return { actionType: "delete" };
      };
      actions2.query = async () => {
        const r = findAndClickAmisButton(["查询", "搜索"]);
        if (!r.found) {
          const rr = reloadCrud();
          if (!rr.found)
            throw new Error(rr.error);
          return rr;
        }
        return r;
      };
      actions2.reload = async () => {
        const r = reloadCrud();
        if (!r.found)
          throw new Error(r.error);
        return r;
      };
      actions2.submitForm = async () => {
        await ensureDialogOpened();
        const r = findAndClickAmisButton(["提交", "保存", "确定"]);
        if (!r.found)
          throw new Error(r.error);
        return r;
      };
      actions2.fillForm = async (params) => {
        const fieldName = (params == null ? void 0 : params.__fieldName) || (params == null ? void 0 : params.fieldName);
        const label = (params == null ? void 0 : params.__label) || (params == null ? void 0 : params.label);
        const value = params == null ? void 0 : params.value;
        if (value === void 0)
          throw new Error("缺少填充值");
        let modal = document.querySelector(".ant-modal-wrap, .ant-modal, .cxd-Modal--open");
        if (!modal) {
          await openAddDialog();
        }
        for (let attempt = 0; attempt < 5; attempt++) {
          if (attempt > 0)
            await new Promise((r2) => setTimeout(r2, 300));
          const r = findAndFillAmisField(fieldName, label, value);
          if (r.found)
            return r;
        }
        throw new Error(`未找到表单字段: ${label || fieldName}`);
      };
      return actions2;
    }
    function buildFormPageActions() {
      const actions2 = {};
      actions2.submitForm = async () => {
        const r = findAndClickAmisButton(["提交", "保存", "确定"]);
        if (!r.found)
          throw new Error(r.error);
        return r;
      };
      actions2.fillForm = async (params) => {
        const fieldName = (params == null ? void 0 : params.__fieldName) || (params == null ? void 0 : params.fieldName);
        const label = (params == null ? void 0 : params.__label) || (params == null ? void 0 : params.label);
        const value = params == null ? void 0 : params.value;
        if (value === void 0)
          throw new Error("缺少填充值");
        for (let attempt = 0; attempt < 5; attempt++) {
          if (attempt > 0)
            await new Promise((r2) => setTimeout(r2, 300));
          const r = findAndFillAmisField(fieldName, label, value);
          if (r.found)
            return r;
        }
        throw new Error(`未找到表单字段: ${label || fieldName}`);
      };
      return actions2;
    }
    function updateSchema(value) {
      pageSchema.value = value;
    }
    function rebuild() {
      pageSchema.value = cloneDeep(pageSchema.value);
    }
    const { debug } = useDebug();
    const actions = { ...props.actions };
    return {
      pageSchema,
      updateSchema,
      rebuild,
      registerPage,
      debug,
      actions,
      data: props.data
    };
  }
});
function _sfc_render$1(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_xui_debugger = resolveComponent("xui-debugger");
  const _component_XuiSchemaPage = resolveComponent("XuiSchemaPage");
  return openBlock(), createElementBlock(Fragment$1, null, [
    _ctx.debug ? (openBlock(), createBlock(_component_xui_debugger, {
      key: 0,
      path: _ctx.path,
      schema: _ctx.pageSchema,
      "onUpdate:schema": _ctx.updateSchema,
      onRebuild: _ctx.rebuild
    }, null, 8, ["path", "schema", "onUpdate:schema", "onRebuild"])) : createCommentVNode("", true),
    createVNode(_component_XuiSchemaPage, {
      schema: _ctx.pageSchema,
      registerPage: _ctx.registerPage,
      action: _ctx.actions,
      data: _ctx.data
    }, null, 8, ["schema", "registerPage", "action", "data"])
  ], 64);
}
const XuiPage = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["render", _sfc_render$1]]);
const taglines = [
  { icon: "✦", text: "Nop is not Programming" },
  { icon: "◆", text: "重构软件生产力" },
  { icon: "◈", text: "声明式 · 差量式 · 可逆式" },
  { icon: "◇", text: "Reimagining Productivity" },
  { icon: "▣", text: "面向模型 · 面向复用" }
];
const _sfc_main = {
  name: "XuiLoadingNext",
  setup() {
    const carouselIndex = ref(0);
    let timer = null;
    onMounted(() => {
      timer = setInterval(() => {
        carouselIndex.value = (carouselIndex.value + 1) % taglines.length;
      }, 3500);
    });
    onUnmounted(() => {
      if (timer)
        clearInterval(timer);
    });
    return { taglines, carouselIndex };
  }
};
const _imports_0 = "/resource/img/logo.png";
const XuiLoadingNext_vue_vue_type_style_index_0_scoped_8e98475a_lang = "";
const _hoisted_1 = { class: "app-loading-next" };
const _hoisted_2 = { class: "loading-center" };
const _hoisted_3 = { class: "loading-carousel" };
const _hoisted_4 = { class: "carousel-viewport" };
const _hoisted_5 = { class: "carousel-icon" };
const _hoisted_6 = { class: "carousel-text" };
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return openBlock(), createElementBlock("div", _hoisted_1, [
    _cache[2] || (_cache[2] = createStaticVNode('<div class="loading-ambient" data-v-8e98475a><div class="ambient-orb ambient-orb-1" data-v-8e98475a></div><div class="ambient-orb ambient-orb-2" data-v-8e98475a></div><div class="ambient-orb ambient-orb-3" data-v-8e98475a></div><div class="ambient-orb ambient-orb-4" data-v-8e98475a></div></div><div class="loading-grid" data-v-8e98475a></div>', 2)),
    createElementVNode("div", _hoisted_2, [
      _cache[0] || (_cache[0] = createElementVNode("div", { class: "loading-brand" }, [
        createElementVNode("div", { class: "loading-logo-ring" }, [
          createElementVNode("img", {
            src: _imports_0,
            class: "loading-logo",
            alt: "Logo"
          })
        ]),
        createElementVNode("div", { class: "loading-brand-name" }, "Nop Platform")
      ], -1)),
      createElementVNode("div", _hoisted_3, [
        createElementVNode("div", _hoisted_4, [
          createElementVNode("div", {
            class: "carousel-track",
            style: normalizeStyle({ transform: `translateY(-${$setup.carouselIndex * 20}%)` })
          }, [
            (openBlock(true), createElementBlock(Fragment$1, null, renderList($setup.taglines, (item, idx) => {
              return openBlock(), createElementBlock("div", {
                key: idx,
                class: "carousel-item"
              }, [
                createElementVNode("span", _hoisted_5, toDisplayString(item.icon), 1),
                createElementVNode("span", _hoisted_6, toDisplayString(item.text), 1)
              ]);
            }), 128))
          ], 4)
        ])
      ]),
      _cache[1] || (_cache[1] = createElementVNode("div", { class: "loading-progress" }, [
        createElementVNode("div", { class: "progress-bar" }, [
          createElementVNode("div", { class: "progress-fill" })
        ]),
        createElementVNode("div", { class: "progress-label" }, "Initializing")
      ], -1))
    ]),
    _cache[3] || (_cache[3] = createElementVNode("div", { class: "loading-footer" }, [
      createElementVNode("span", null, "© 2026 Nop Platform"),
      createElementVNode("span", { class: "footer-dot" }, "·"),
      createElementVNode("span", null, "v2.0")
    ], -1))
  ]);
}
const XuiLoadingNext = /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-8e98475a"]]);
class VueControl extends React__default.Component {
  constructor(props) {
    super(props);
    const { resolveVueComponent } = useAdapter();
    const vueComponent = resolveVueComponent(props.vueComponent);
    if (!vueComponent) {
      console.warn(`Vue component "${props.vueComponent}" not found by resolveVueComponent`);
    }
    this.vueComponent = vueComponent ? applyPureVueInReact(vueComponent) : null;
  }
  doAction(action, data, throwErrors) {
    const { resetValue, onChange } = this.props;
    const actionType = action == null ? void 0 : action.actionType;
    if (actionType === "clear") {
      onChange(void 0);
    } else if (actionType === "reset") {
      onChange(resetValue);
    }
  }
  normalizeEventData(eventData = {}) {
    if (Array.isArray(eventData)) {
      if (eventData.length === 1) {
        return this.normalizeEventData(eventData[0]);
      }
      return { value: eventData };
    }
    if (eventData && typeof eventData === "object") {
      if ("detail" in eventData && eventData.detail !== void 0) {
        return this.normalizeEventData(eventData.detail);
      }
      return { ...eventData };
    }
    return { value: eventData };
  }
  async dispatchChangeEvent(eventData = {}) {
    if (this.props.vueComponent === "template-canvas") {
      console.log(
        "[AmisVueComponent] dispatchChangeEvent, templateJson length:",
        typeof eventData === "string" ? eventData.length : JSON.stringify(eventData).length
      );
    }
    const rendererEvent = await this.dispatchRendererEvent("change", {
      value: eventData
    });
    if (rendererEvent == null ? void 0 : rendererEvent.prevented) {
      return;
    }
    this.syncAmisValue(eventData);
  }
  syncAmisValue(nextValue) {
    const props = this.props;
    const { name, onChange, onBulkChange, formStore, store, formItem } = props;
    const values = name ? { [name]: nextValue } : void 0;
    if (values && typeof onBulkChange === "function") {
      onBulkChange(values, false);
    }
    if (name && formStore) {
      if (typeof formStore.setValueByName === "function") {
        formStore.setValueByName(name, nextValue);
      } else if (typeof formStore.setValues === "function") {
        formStore.setValues(values);
      }
    }
    if (name && store) {
      if (typeof store.changeValue === "function") {
        store.changeValue(name, nextValue);
      } else if (typeof store.updateData === "function") {
        store.updateData(values);
      } else if (typeof store.setValues === "function") {
        store.setValues(values);
      }
    }
    if (typeof onChange === "function") {
      if (name && !formItem) {
        onChange(nextValue, name, false);
      } else {
        onChange(nextValue);
      }
    }
  }
  async dispatchRendererEvent(eventName, eventData = {}) {
    const { dispatchEvent, data } = this.props;
    return await dispatchEvent(
      eventName,
      createObject(data, eventData)
    );
  }
  async saveTemplateCanvas(templateJson) {
    const props = this.props;
    const { data, env } = props;
    const id = (data == null ? void 0 : data.id) || (data == null ? void 0 : data.sid);
    const fetcher = env == null ? void 0 : env.fetcher;
    console.log(
      "[AmisVueComponent] saveTemplateCanvas called, templateJson length:",
      typeof templateJson === "string" ? templateJson.length : JSON.stringify(templateJson).length,
      ", id:",
      id
    );
    if (props.vueComponent !== "template-canvas" || typeof fetcher !== "function") {
      return false;
    }
    const requestData = id ? { id, templateJson } : {
      templateId: (data == null ? void 0 : data.templateId) || "DEMO_TEMPLATE",
      templateName: (data == null ? void 0 : data.templateName) || "新模板",
      templateVersion: (data == null ? void 0 : data.templateVersion) || 1,
      status: (data == null ? void 0 : data.status) || 0,
      templateJson
    };
    console.log("[AmisVueComponent] saveTemplateCanvas request data keys:", Object.keys(requestData), "templateJson length:", typeof templateJson === "string" ? templateJson.length : 0);
    await fetcher({
      url: id ? "@mutation:NopTemplateDefinition__update" : "@mutation:NopTemplateDefinition__save",
      method: "post",
      data: requestData,
      "gql:selection": "sid,templateId,templateName,templateVersion,templateJson"
    });
    return true;
  }
  async dispatchNamedEvent(eventName, eventData = {}) {
    const normalizedData = this.normalizeEventData(eventData);
    const { name } = this.props;
    const nextValue = name && normalizedData[name] !== void 0 ? normalizedData[name] : normalizedData.templateJson ?? normalizedData.value;
    if (nextValue !== void 0) {
      console.log(
        "[AmisVueComponent] dispatchNamedEvent",
        eventName,
        ", name:",
        name,
        ", nextValue length:",
        typeof nextValue === "string" ? nextValue.length : JSON.stringify(nextValue).length
      );
      if (name && normalizedData[name] === void 0) {
        normalizedData[name] = nextValue;
      }
      if (normalizedData.value === void 0) {
        normalizedData.value = nextValue;
      }
      if (normalizedData.modelValue === void 0) {
        normalizedData.modelValue = nextValue;
      }
      if (normalizedData.templateJson === void 0) {
        normalizedData.templateJson = nextValue;
      }
      if (normalizedData.result === void 0) {
        normalizedData.result = nextValue;
      }
      this.syncAmisValue(nextValue);
    }
    if (eventName === "saved" && nextValue !== void 0) {
      const savedByComponent = await this.saveTemplateCanvas(nextValue);
      if (savedByComponent) {
        return;
      }
    }
    return this.dispatchRendererEvent(eventName, normalizedData);
  }
  render() {
    let { props, value, env, store } = this.props;
    if (props) {
      props = { ...props };
      for (const key of Object.keys(props)) {
        if (typeof props[key] === "string") {
          props[key] = resolveVariableAndFilter(
            props[key],
            this.props.data,
            "| raw"
          );
        }
      }
    }
    let mergedProps = {
      env,
      store,
      ...props,
      value,
      modelValue: value,
      "onUpdate:value": (value2) => this.dispatchChangeEvent(value2),
      "onUpdate:modelValue": (value2) => this.dispatchChangeEvent(value2),
      onUpdateTemplateJson: (value2) => this.dispatchChangeEvent(value2),
      onSaveTemplate: (value2) => this.saveTemplateCanvas(value2),
      onSaved: (payload) => this.dispatchNamedEvent("saved", payload),
      onPreview: (payload) => this.dispatchNamedEvent("preview", payload)
    };
    if (!this.vueComponent) {
      return React__default.createElement("div", { style: { color: "red", padding: "10px" } }, `Vue component "${this.props.vueComponent}" not found`);
    }
    return React__default.createElement(this.vueComponent, mergedProps);
  }
}
class VueRenderer extends VueControl {
  constructor(props) {
    super(props);
    const scoped = this.context;
    if (scoped)
      scoped.registerComponent(this);
  }
  componentWillUnmount() {
    const scoped = this.context;
    if (scoped)
      scoped.unRegisterComponent(this);
  }
}
VueRenderer.contextType = ScopedContext;
Renderer({
  type: "vue-renderer",
  autoVar: false
})(VueRenderer);
class VueFormItem extends VueControl {
}
if (typeof FormItem !== "undefined") {
  FormItem({
    type: "vue-form-item",
    autoVar: false
  })(VueFormItem);
}
function getPageStore(store) {
  if (!store)
    return;
  if (store.fetchData)
    return store;
  return getPageStore(store.parentStore);
}
class XuiPageEditorButton extends React__default.Component {
  constructor(props) {
    super(props);
    this.state = {
      dialogVisible: false
    };
    this.dialogComponent = applyVueInReact(_sfc_main$4);
    this.handleAction = this.handleAction.bind(this);
    const store = getPageStore(this.props.store);
    this.getPageSource = () => {
      if (!this.props.initApi) {
        console.error("[XuiPageEditorButton] initApi prop is required but not provided");
        return Promise.reject(new Error("initApi prop is required"));
      }
      return store.fetchData(this.props.initApi, this.props.data).then((res) => res.data);
    };
    this.savePageSource = (data) => {
      if (!this.props.api) {
        console.error("[XuiPageEditorButton] api prop is required but not provided");
        return Promise.reject(new Error("api prop is required"));
      }
      return store.fetchData(this.props.api, { ...this.props.data, data }).then((res) => res.data);
    };
    this.rollbackPageSource = () => {
      if (!this.props.rollbackApi)
        return Promise.resolve(null);
      return store.fetchData(this.props.rollbackApi, this.props.data).then((res) => res.data);
    };
  }
  handleAction(e, action) {
    const actionType = action.actionType;
    if (actionType == "popEditor") {
      this.setState({ dialogVisible: true });
    } else {
      return this.props.onAction(e, action);
    }
  }
  render() {
    const props = this.props;
    const actionSchema = {
      ...props,
      type: "action",
      actionType: "popEditor"
    };
    const body = [
      props.render(
        "button",
        actionSchema,
        { onAction: this.handleAction }
      ),
      React__default.createElement(this.dialogComponent, {
        modelValue: this.state.dialogVisible,
        savePageSource: this.savePageSource,
        getPageSource: this.getPageSource,
        rollbackPageSource: this.rollbackPageSource,
        "onUpdate:modelValue": (value) => this.setState(
          { dialogVisible: value }
        )
      })
    ];
    return React__default.createElement(Fragment, null, body);
  }
}
Renderer({
  type: "xui-page-editor-button",
  autoVar: false
})(XuiPageEditorButton);
registerAdapter({
  dataMapping,
  alert,
  confirm,
  notify(type, msg, conf) {
    if (msg.startsWith("_"))
      return;
    conf = { closeButton: true, ...conf };
    toast[type] ? toast[type](msg, conf) : console.warn("[notify]", type, msg);
    console.log("[notify]", type, msg);
  },
  resolveVueComponent(name) {
    const componentMap = {
      // Add more components as needed
      // Applications should override this method with their own component registry
    };
    return componentMap[name];
  }
});
registerModule("vue", Vue);
registerModule("react", React);
registerModule("react-dom", ReactDom);
export {
  AmisPageEditor,
  AmisSchemaPage,
  _sfc_main$7 as AmisToast,
  VueControl as AmisVueComponent,
  XuiLoading,
  XuiLoadingNext,
  XuiPage,
  _sfc_main$5 as XuiPageEditor,
  XuiSchemaPage,
  defineReactPageComponent
};
