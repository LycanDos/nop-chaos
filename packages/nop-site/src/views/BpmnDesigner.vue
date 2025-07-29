<template>
  <!-- 调试信息 -->

  <!-- 流程设计器，负责绘制流程等  -->
  <div style="background-color: #fff;">
    <MyProcessDesigner
      ref="processDesigner"
      @init-finished="initModeler"
      :additionalModel="controlForm.additionalModel"
      :processId="modelKey"
      :processName="modelName"
    />
  </div>
  <!-- 流程属性器，负责编辑每个流程节点的属性 -->
</template>
<script setup lang="ts">
import { ref, shallowRef, provide, onMounted, onBeforeUnmount, nextTick } from 'vue'
import {  MyProcessDesigner, CustomContentPadProvider, CustomPaletteProvider,  ReplaceMenuProvider,  CustomRendererModule } from 'bpmn-process-designer';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-codes.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';

const ReplaceMenuModule = {
  __init__: ['replaceMenuProvider'],
  replaceMenuProvider: ['type', ReplaceMenuProvider]
}

// 静态任务数据常量
const STATIC_ACTIVITIES = [
  { name: '用户任务', type: 'bpmn:UserTask', icon: 'bpmn-icon-user-task', source: 'static', key: 'bpmn:UserTask' },
  { name: '服务任务', type: 'bpmn:ServiceTask', icon: 'bpmn-icon-service', source: 'static', key: 'bpmn:ServiceTask' },
  { name: '发送任务', type: 'bpmn:SendTask', icon: 'bpmn-icon-send', source: 'static', key: 'bpmn:SendTask' },
  { name: '接收任务', type: 'bpmn:ReceiveTask', icon: 'bpmn-icon-receive', source: 'static', key: 'bpmn:ReceiveTask' },
  { name: '手工任务', type: 'bpmn:ManualTask', icon: 'bpmn-icon-manual', source: 'static', key: 'bpmn:ManualTask' },
  { name: '业务规则任务', type: 'bpmn:BusinessRuleTask', icon: 'bpmn-icon-business-rule', source: 'static', key: 'bpmn:BusinessRuleTask' },
  { name: '脚本任务', type: 'bpmn:ScriptTask', icon: 'bpmn-icon-script', source: 'static', key: 'bpmn:ScriptTask' },
  { name: '调用活动', type: 'bpmn:CallActivity', icon: 'bpmn-icon-call-activity', source: 'static', key: 'bpmn:CallActivity' },
  { name: '子流程', type: 'bpmn:SubProcess', icon: 'bpmn-icon-subprocess-expanded', source: 'static', key: 'bpmn:SubProcess' }
];

// 静态样式数据常量
const STATIC_STYLES = {
  'bpmn:UserTask': { name: '用户任务', type: 'bpmn:UserTask', iconColor: '#1890ff', bgColor: '#f0f8ff', iconClass: 'bpmn-icon-user-task', source: 'static' },
  'bpmn:ServiceTask': { name: '服务任务', type: 'bpmn:ServiceTask', iconColor: '#52c41a', bgColor: '#f6ffed', iconClass: 'bpmn-icon-service', source: 'static' },
  'bpmn:SendTask': { name: '发送任务', type: 'bpmn:SendTask', iconColor: '#fa8c16', bgColor: '#fff7e6', iconClass: 'bpmn-icon-send', source: 'static' },
  'bpmn:ReceiveTask': { name: '接收任务', type: 'bpmn:ReceiveTask', iconColor: '#722ed1', bgColor: '#f9f0ff', iconClass: 'bpmn-icon-receive', source: 'static' },
  'bpmn:ManualTask': { name: '手工任务', type: 'bpmn:ManualTask', iconColor: '#eb2f96', bgColor: '#fff0f6', iconClass: 'bpmn-icon-manual', source: 'static' },
  'bpmn:BusinessRuleTask': { name: '业务规则任务', type: 'bpmn:BusinessRuleTask', iconColor: '#13c2c2', bgColor: '#e6fffb', iconClass: 'bpmn-icon-business-rule', source: 'static' },
  'bpmn:ScriptTask': { name: '脚本任务', type: 'bpmn:ScriptTask', iconColor: '#fa541c', bgColor: '#fff2e8', iconClass: 'bpmn-icon-script', source: 'static' },
  'bpmn:CallActivity': { name: '调用活动', type: 'bpmn:CallActivity', iconColor: '#2f54eb', bgColor: '#f0f5ff', iconClass: 'bpmn-icon-call-activity', source: 'static' },
  'bpmn:SubProcess': { name: '子流程', type: 'bpmn:SubProcess', iconColor: '#faad14', bgColor: '#fffbe6', iconClass: 'bpmn-icon-subprocess', source: 'static' }
};

// 创建默认缓存结构
const createDefaultCache = () => ({
  apiActivities: [],
  staticActivities: STATIC_ACTIVITIES,
  apiStyles: [],
  staticStyles: STATIC_STYLES,
  timestamp: Date.now()
});

console.log("[app] App.vue loaded");

defineProps<{
  modelId?: string;
  modelKey: string;
  modelName: string;
  value?: string;
}>();

const emit = defineEmits(["success", "init-finished"]);
// const message = useMessage() // 国际化

// 表单信息
const formFields = ref<string[]>([]);
// 表单类型，暂仅限流程表单
// const formType = ref(BpmModelFormType.NORMAL)
provide("formFields", formFields);
// provide('formType', formType)

// 注入流程数据
const xmlString = ref("");
// 注入模型数据
const modelData = ref({});

const modeler = shallowRef(); // BPMN Modeler
const processDesigner = ref();
const controlForm = ref({
  simulation: true,
  labelEditing: false,
  labelVisible: false,
  prefix: "flowable",
  headerButtonSize: "mini",
  additionalModel: [CustomContentPadProvider, CustomPaletteProvider, ReplaceMenuModule, CustomRendererModule],
});
// const model = ref<ModelApi.ModelVO>() // 流程模型的信息

/** 初始化 modeler */
const initModeler = (item: any) => {
  modeler.value = item;
  // 关键：主动注册自定义replace菜单
  const provider = modeler.value?.get?.('replaceMenuProvider');
  if (provider && typeof provider.register === 'function') {
    provider.register();
  }
  
  // 预加载菜单数据缓存
  preloadMenuDataCache();
  
  nextTick(() => {
    console.log("nextTick modeler.value:", modeler.value);
  });
};

// 预加载菜单数据缓存
const preloadMenuDataCache = async () => {
  try {
    console.log('[BpmnDesigner] 开始预加载菜单数据缓存...');
    
    // 获取API基础URL
    const getApiBase = () => {
      return (typeof window !== 'undefined' && (window as any).BPMN_API_BASE) || 
             (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_BPMN_API_BASE) || ''
    }
    
    const base = getApiBase();
    const activitiesUrl = base + '/api/bpmn/activities';
    
    console.log('[BpmnDesigner] 加载菜单数据:', activitiesUrl);
    
    // 只加载菜单数据
    const activitiesRes = await fetch(activitiesUrl);
    
    if (activitiesRes.ok) {
      const activitiesData = await activitiesRes.json();
      
      console.log('[BpmnDesigner] API返回的菜单数据:', activitiesData);
      
      // 创建菜单数据缓存，包含API任务的基本样式信息
      const menuCache = {
        // API数据：通过code获取
        apiActivities: Array.isArray(activitiesData) ? activitiesData.map(item => ({
          ...item,
          source: 'api',
          key: item.code // 使用code作为唯一标识
        })) : [],
        // 静态数据：通过type获取
        staticActivities: STATIC_ACTIVITIES,
        // 样式数据：从API菜单数据中提取基本样式信息（不包含htmlContent）
        apiStyles: Array.isArray(activitiesData) ? activitiesData.map(item => {
          const style = item.itemStyle || {};
          return {
            code: item.code,
            name: item.name,
            type: item.type,
            itemStyle: {
              name: style.name || item.name,
              type: style.type || item.type,
              iconColor: style.iconColor || '',
              bgColor: style.bgColor || '',
              iconClass: style.iconClass || '',
              icon: style.icon || '',
              // 不包含htmlContent，htmlContent只在选择任务时缓存
              htmlContent: ''
            },
            source: 'api',
            key: item.code
          };
        }) : [],
        staticStyles: STATIC_STYLES,
        timestamp: Date.now()
      };
      
      // 存储到全局缓存
      window._bpmnMenuCache = menuCache;
      
      console.log('[BpmnDesigner] 菜单数据缓存加载成功:', {
        apiActivitiesCount: menuCache.apiActivities.length,
        staticActivitiesCount: menuCache.staticActivities.length,
        apiStylesCount: menuCache.apiStyles.length,
        staticStylesCount: Object.keys(menuCache.staticStyles).length,
        timestamp: menuCache.timestamp
      });
      
      // 打印缓存数据详情
      console.log('[BpmnDesigner] 缓存数据详情:', {
        apiActivities: menuCache.apiActivities,
        staticActivities: menuCache.staticActivities,
        apiStyles: menuCache.apiStyles,
        staticStyles: menuCache.staticStyles
      });
      
      // 初始化HTML内容缓存
      if (!window._bpmnContentHtmlMap) {
        window._bpmnContentHtmlMap = {};
      }
      
    } else {
      console.warn('[BpmnDesigner] 菜单数据加载失败:', {
        activitiesStatus: activitiesRes.status,
        activitiesOk: activitiesRes.ok
      });
      
      // 如果API不可用，创建只包含静态数据的缓存结构
      window._bpmnMenuCache = createDefaultCache();
      
      console.log('[BpmnDesigner] 使用默认缓存数据:', window._bpmnMenuCache);
      
      if (!window._bpmnContentHtmlMap) {
        window._bpmnContentHtmlMap = {};
      }
    }
  } catch (error) {
    console.error('[BpmnDesigner] 预加载菜单数据缓存失败:', error);
    
    // 出错时也创建只包含静态数据的缓存结构
    window._bpmnMenuCache = createDefaultCache();
    
    console.log('[BpmnDesigner] 使用默认缓存数据:', window._bpmnMenuCache);
    
    if (!window._bpmnContentHtmlMap) {
      window._bpmnContentHtmlMap = {};
    }
  }
};
/** 添加/修改模型 */
const save = async (bpmnXml: string) => {
  try {
    xmlString.value = bpmnXml;
    emit("success", bpmnXml);
  } catch (error) {
    console.error("保存失败:", error);
    // message.error('保存失败')
  }
};

/** 监听表单 ID 变化，加载表单数据 */
// watch(
//   () => modelData.value.formId,
//   async (newFormId) => {
//     if (newFormId && modelData.value.formType === BpmModelFormType.NORMAL) {
//       const data = await FormApi.getForm(newFormId)
//       formFields.value = data.fields
//     } else {
//       formFields.value = []
//     }
//   },
//   { immediate: true }
// )

// 在组件卸载时清理
onBeforeUnmount(() => {
  // modeler.value = null;
  // 清理全局实例
  const w = window as any;
  if (w.bpmnInstances) {
    w.bpmnInstances = null;
  }
});

onMounted(() => {
  console.log("[app] App.vue onMounted");
});

// 解决 window._debugModeler linter 错误
declare global {
  interface Window {
    _debugModeler: any;
    _debugModelerRaw: any;
    _debugModelerRef: any;
    _bpmnMenuCache: any; // 新增：用于缓存菜单数据
    _bpmnContentHtmlMap: any; // 新增：用于缓存HTML内容
  }
}
</script>
<style lang="scss">
@import "../../../bpmn-process-designer/src/package/theme/process-designer.scss";

//@import "../../../bpmn-process-designer/src/package/theme/element-variables.scss";
//@import "../../../bpmn-process-designer/src/package/theme/index.scss";
//@import "../../../bpmn-process-designer/src/package/theme/process-panel.scss";
.process-panel__container {
  position: absolute;
  top: 172px;
  right: 70px;
}
#bpmnCanvas,
.my-process-designer__canvas,
.my-process-designer__container {
  min-height: 600px !important;
  height: 800px !important;
  /* background: #fff !important; */
  z-index: 10 !important;
  position: relative !important;
}
body, html, #app {
  height: 100% !important;
}
</style>
