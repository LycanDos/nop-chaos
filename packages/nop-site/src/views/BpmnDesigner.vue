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
import { ref, shallowRef, provide, onMounted, onBeforeUnmount, nextTick, createApp } from 'vue'
import {  MyProcessDesigner, CustomContentPadProvider, CustomPaletteProvider,  ReplaceMenuProvider,  CustomRendererModule } from 'bpmn-process-designer';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-codes.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';
// 导入 BpmnRenderer 用于自定义渲染器
import BpmnRenderer from 'bpmn-js/lib/draw/BpmnRenderer';
// 导入 SimpleAmisRender 组件
import SimpleAmisRender from '../components/ContentDisplay/SimpleAmisRender.vue';

// 自定义AMIS渲染器
function BpmnAmisRenderer(
  config,
  eventBus,
  styles,
  pathMap,
  canvas,
  textRenderer
) {
  // 调用父类构造函数 - 注意第一个参数是 config
  BpmnRenderer.call(this, config, eventBus, styles, pathMap, canvas, textRenderer, 2000);

  // 使用局部变量存储实例引用
  const self = this;

  // 注册渲染器
  eventBus.on('render.shape', 1500, function(e) {
    const element = e.element;
    const gfx = e.gfx;

    // 检查元素是否是自定义AMIS元素
    if (isAmisElement(element)) {
      return self.drawAmisTask(gfx, element);
    }
  });

  // 监听鼠标事件来实现交互功能
  eventBus.on('element.click', function(e) {
    if (isAmisElement(e.element)) {
      // 检查是否按下了Ctrl键（Windows）或Cmd键（Mac）
      const isCtrlPressed = e.originalEvent.ctrlKey || e.originalEvent.metaKey;
      if (isCtrlPressed) {
        handleAmisElementClickInternal(e.element, e.originalEvent);
      } else {
        // 显示提示
        console.log('Hold Ctrl/Cmd key to interact with AMIS element');
      }
    }
  });

  eventBus.on('element.mouseenter', function(e) {
    if (isAmisElement(e.element)) {
      showInteractionHint(e.gfx);
    }
  });

  eventBus.on('element.mouseleave', function(e) {
    if (isAmisElement(e.element)) {
      hideInteractionHint(e.gfx);
    }
  });
}

// 设置依赖注入 - 注意第一个参数是 config
BpmnAmisRenderer.$inject = [
  'config',
  'eventBus',
  'styles',
  'pathMap',
  'canvas',
  'textRenderer'
];

// 使用 F 函数技巧设置原型继承（与 CustomRenderer 相同的方式）
const F = function () {};
F.prototype = BpmnRenderer.prototype;
BpmnAmisRenderer.prototype = new F();
BpmnAmisRenderer.prototype.constructor = BpmnAmisRenderer;

/**
 * 绘制AMIS任务
 */
BpmnAmisRenderer.prototype.drawAmisTask = function(parentGfx, element) {
  // 首先使用基础BPMN渲染器绘制任务
  const task = BpmnRenderer.prototype.drawShape.call(this, parentGfx, element);

  // 添加特殊样式标识这是一个AMIS任务
  const existingClass = task.getAttribute('class') || '';
  task.setAttribute('class', existingClass + ' djs-amis-element');

  // 获取AMIS代码并渲染内容
  const amisCode = getAmisCode(element);

  if (amisCode) {
    // 从全局缓存获取内容，如果没有则去API获取
    const cachedHtml = window._bpmnContentHtmlMap?.[amisCode];
    if (cachedHtml) {
      renderAmisVisibleContent(parentGfx, element, cachedHtml);
    } else {
      // 如果没有缓存，先显示加载中，然后异步获取
      renderAmisVisibleContent(parentGfx, element, '<div style="color:#999;font-size:10px;text-align:center;padding:10px;">加载中...</div>');
      // 异步获取API数据
      fetchAmisContentHtml(amisCode, element.id).then(htmlContent => {
        // 获取到内容后，重新渲染该元素
        if (window._currentModeler) {
          // 直接更新HTML内容缓存
          window._bpmnContentHtmlMap = window._bpmnContentHtmlMap || {};
          window._bpmnContentHtmlMap[amisCode] = htmlContent;
          // 重新渲染
          setTimeout(() => {
            renderAmisVisibleContent(parentGfx, element, htmlContent);
          }, 50);
        }
      }).catch(err => {
        console.error('Failed to fetch AMIS content:', err);
        renderAmisVisibleContent(parentGfx, element, '<div style="color:#999;font-size:10px;text-align:center;padding:10px;">加载失败</div>');
      });
    }
  } else {
    // 如果没有AMIS代码，添加默认的AMIS内容提示
    addDefaultAmisContent(parentGfx, element);
  }

  return task;
};

/**
 * 从API获取AMIS内容
 */
async function fetchAmisContentHtml(code, elementId) {
  console.log('fetchAmisContentHtml - 开始获取AMIS内容，code:', code, 'elementId:', elementId);
  try {
    const getApiBase = () => {
      return (typeof window !== 'undefined' && (window as any).BPMN_API_BASE) ||
             (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_BPMN_API_BASE) || ''
    }

    const base = getApiBase();
    const url = base + '/api/bpmn/activitiesStyle?id=' + encodeURIComponent(code) + '&_t=' + Date.now();
    console.log('fetchAmisContentHtml - 请求URL:', url);

    const response = await fetch(url);
    console.log('fetchAmisContentHtml - 响应状态:', response.status, '响应OK:', response.ok);

    if (response.ok) {
      const data = await response.json();
      console.log('[JSON解析成功] API响应JSON解析成功', data);
      console.log('fetchAmisContentHtml - API返回数据:', data);

      // API返回的结构是 { contentHtml: "JSON字符串" }
      // 所以我们要使用 data.contentHtml 作为要渲染的内容
      // 它可能是一个AMIS的schema JSON字符串，也可能就是HTML字符串
      const contentHtml = data.contentHtml || '<div>无内容</div>';
      console.log('fetchAmisContentHtml - 从API获取的contentHtml:', contentHtml);

      // 将内容存储到缓存
      window._bpmnContentHtmlMap = window._bpmnContentHtmlMap || {};
      window._bpmnContentHtmlMap[code] = contentHtml;
      console.log('fetchAmisContentHtml - 缓存已更新，当前缓存:', window._bpmnContentHtmlMap);

      // 触发元素图形更新
      if (elementId && window._currentModeler) {
        console.log('fetchAmisContentHtml - 准备触发图形更新，elementId:', elementId);
        setTimeout(() => {
          // 延迟执行以确保缓存已更新
          const elementRegistry = window._currentModeler.get('elementRegistry');
          const element = elementRegistry.get(elementId);
          if (element) {
            console.log('fetchAmisContentHtml - 找到元素，触发更新:', element);
            // 触发图形更新 - 使用 element.changed 事件来强制重绘
            window._currentModeler.get('eventBus').fire('element.changed', { element });
          } else {
            console.log('fetchAmisContentHtml - 未找到元素:', elementId);
          }
        }, 100);
      }

      return contentHtml;
    } else {
      console.error('fetchAmisContentHtml - API响应失败，状态码:', response.status);
      return '<div>加载失败</div>';
    }
  } catch (error) {
    console.error('[JSON解析失败] API响应JSON解析失败', error);
    console.error('fetchAmisContentHtml - 获取AMIS内容时发生错误:', error);
    return '<div>加载失败</div>';
  }
}

/**
 * 获取AMIS代码
 */
function getAmisCode(element) {
  const businessObject = element.businessObject;
  if (businessObject && businessObject.extensionElements) {
    const extensions = businessObject.extensionElements.values;

    // 查找AMIS配置 - 寻找包含apiActivityId的文档元素
    const doc = extensions.find(ext =>
      ext.$type === 'bpmn:Documentation' && ext.text && ext.text.startsWith('apiActivityId:')
    );

    if (doc) {
      return doc.text.replace('apiActivityId:', '').trim(); // 使用trim()去除空白字符
    }
  }
  return null;
}

/**
 * 判断元素是否为AMIS元素
 */
function isAmisElement(element) {
  // 检查元素是否包含AMIS配置
  const businessObject = element.businessObject;
  if (!businessObject) return false;

  // 检查是否为服务任务且名称包含HTTP或API
  if (element.type === 'bpmn:ServiceTask' &&
      businessObject.name &&
      (businessObject.name.toLowerCase().includes('http') ||
       businessObject.name.toLowerCase().includes('api') ||
       businessObject.name.toLowerCase().includes('request'))) {
    return true;
  }

  // 检查是否包含自定义扩展属性
  if (businessObject.extensionElements &&
      businessObject.extensionElements.values) {
    return businessObject.extensionElements.values.some(ext =>
      ext.$type === 'custom:AmisConfig' ||
      ext.get('amisSchema') ||
      ext.get('customType') === 'amis-task' ||
      (ext.$type === 'bpmn:Documentation' && ext.text && ext.text.startsWith('apiActivityId:'))
    );
  }

  return false;
}

/**
 * 在SVG中渲染可见的AMIS内容
 */
function renderAmisVisibleContent(parentGfx, element, htmlContent) {
  console.log('renderAmisVisibleContent - 开始渲染，htmlContent:', htmlContent);
  console.log('renderAmisVisibleContent - 元素信息:', element);

  // 创建 foreignObject 来显示 HTML 内容
  const fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
  fo.setAttribute('x', 0);
  fo.setAttribute('y', 0);
  fo.setAttribute('width', element.width);
  fo.setAttribute('height', element.height);
  fo.style.pointerEvents = 'none'; // 不影响节点交互

  // 创建内容容器
  const htmlDiv = document.createElement('div');
  htmlDiv.style.width = '100%';
  htmlDiv.style.height = '100%';
  htmlDiv.style.overflow = 'hidden';
  htmlDiv.style.fontSize = '10px';
  htmlDiv.style.pointerEvents = 'none';
  htmlDiv.style.padding = '4px';

  try {
    // 首先尝试解析JSON字符串
    let parsedContent = null;
    let parseError = null;

    // 检查输入的是否为有效的非空字符串
    if (typeof htmlContent === 'string' && htmlContent.trim() !== '') {
      try {
        console.log('renderAmisVisibleContent - 尝试解析JSON，原始内容:', htmlContent);
        console.log('renderAmisVisibleContent - 内容类型:', typeof htmlContent);

        // 检查是否是有效的JSON字符串（可能需要去除首尾空白）
        const trimmedContent = htmlContent.trim();
        if (trimmedContent.startsWith('{') || trimmedContent.startsWith('[')) {
          parsedContent = JSON.parse(trimmedContent);
          console.log('renderAmisVisibleContent - JSON解析成功，解析结果:', parsedContent);
          console.log('renderAmisVisibleContent - 解析结果类型:', typeof parsedContent);
          // 添加明确的JSON解析成功日志
          console.log('[JSON解析成功] JSON内容解析完成');
        } else {
          // 如果不是JSON格式，可能是HTML字符串
          htmlDiv.innerHTML = trimmedContent;
          console.log('renderAmisVisibleContent - 识别为HTML字符串，直接设置到div:', htmlDiv.innerHTML);
          console.log('renderAmisVisibleContent - foreignObject内容添加前:', fo.innerHTML);
          fo.appendChild(htmlDiv);
          parentGfx.appendChild(fo);
          console.log('renderAmisVisibleContent - foreignObject内容添加后:', fo.innerHTML);
          return;
        }
      } catch (e) {
        parseError = e;
        console.log('renderAmisVisibleContent - JSON解析失败，错误:', e);
        console.log('renderAmisVisibleContent - 失败的内容:', htmlContent);
        // 添加明确的JSON解析失败日志
        console.log('[JSON解析失败] JSON内容解析出错', e.message);
        // 解析失败时，直接显示原始内容
        htmlDiv.textContent = String(htmlContent);
        console.log('renderAmisVisibleContent - JSON字符串作为纯文本显示:', htmlDiv.textContent);
      }
    } else if (htmlContent && typeof htmlContent === 'object') {
      // 如果已经是对象，直接使用
      parsedContent = htmlContent;
      console.log('renderAmisVisibleContent - 内容已经是对象，直接使用:', parsedContent);
      // 添加明确的日志
      console.log('[JSON使用对象] 已有对象内容使用完成');
    } else {
      // 处理空值或非预期类型
      htmlDiv.innerHTML = '<div style="color:#999;text-align:center;font-size:10px;">[空内容]</div>';
      console.log('renderAmisVisibleContent - 识别为空内容，设置默认提示');
    }

    // 检查解析结果是否是有效的AMIS schema
    if (parsedContent && typeof parsedContent === 'object' && parsedContent.type) {
      console.log('renderAmisVisibleContent - 检测到有效的AMIS schema，类型:', parsedContent.type);
      console.log('renderAmisVisibleContent - AMIS schema内容:', parsedContent);

      // 使用 SimpleAmisRender 组件渲染 AMIS 内容
      const vueApp = createApp(SimpleAmisRender, {
        schema: parsedContent
      });

      // 挂载到容器
      vueApp.mount(htmlDiv);

      console.log('renderAmisVisibleContent - 使用 SimpleAmisRender 组件渲染完成');
    } else if (parsedContent && typeof parsedContent === 'object') {
      // 解析成功但不是AMIS schema，可能是其他格式
      console.log('renderAmisVisibleContent - 解析成功但不是AMIS schema，对象内容:', parsedContent);
      // 尝试将对象转换为可读的HTML
      htmlDiv.innerHTML = `<div style="color:#666;font-size:10px;padding:4px;">${JSON.stringify(parsedContent, null, 2)}</div>`;
      console.log('renderAmisVisibleContent - 非AMIS对象已设置为HTML:', htmlDiv.innerHTML);
    } else if (!parseError) {
      // 解析失败或不是对象，但之前没有解析错误，作为HTML直接显示
      console.log('renderAmisVisibleContent - 无法解析为AMIS schema，作为HTML显示');
      // 如果是字符串且看起来像HTML，直接显示
      if (typeof htmlContent === 'string' && (htmlContent.includes('<') || htmlContent.includes('>'))) {
        htmlDiv.innerHTML = htmlContent;
        console.log('renderAmisVisibleContent - HTML字符串直接设置:', htmlDiv.innerHTML);
      }
    }

    console.log('renderAmisVisibleContent - foreignObject内容添加前:', fo.innerHTML);
    fo.appendChild(htmlDiv);
    parentGfx.appendChild(fo);
    console.log('renderAmisVisibleContent - foreignObject内容添加后:', fo.innerHTML);
  } catch (e) {
    console.error('renderAmisVisibleContent - 渲染过程中发生错误:', e);
    console.error('renderAmisVisibleContent - 错误堆栈:', e.stack);
    htmlDiv.innerHTML = "<div style='color:#aaa;text-align:center;font-size:10px;'>[AMIS Content Error]</div>";
    fo.appendChild(htmlDiv);
    parentGfx.appendChild(fo);
    console.error('renderAmisVisibleContent - 错误处理完成，已添加错误提示');
  }

  console.log('renderAmisVisibleContent - 最终innerHTML:', htmlDiv.innerHTML);
}

/**
 * 添加默认AMIS内容
 */
function addDefaultAmisContent(parentGfx, element) {
  // 添加一个标识，表示这是AMIS内容
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.setAttribute('x', element.x + 10);
  text.setAttribute('y', element.y + element.height / 2);
  text.setAttribute('font-size', '10');
  text.setAttribute('fill', '#52c41a');
  text.setAttribute('pointer-events', 'none');
  text.textContent = '[AMIS Content]';

  parentGfx.appendChild(text);
}

/**
 * 添加交互提示
 */
function addInteractionHint(element) {
  // 在渲染阶段无法直接添加DOM元素，但可以设置CSS类
  // 实际的提示会在SVG中以文本形式显示
}

/**
 * 显示交互提示
 */
function showInteractionHint(gfx) {
  const elements = gfx.querySelectorAll('text');
  elements.forEach(el => {
    if (el.textContent && el.textContent.includes('AMIS')) {
      // 可以临时改变颜色或其他视觉属性
      el.setAttribute('fill', '#fa8c16');
    }
  });
}

/**
 * 隐藏交互提示
 */
function hideInteractionHint(gfx) {
  const elements = gfx.querySelectorAll('text');
  elements.forEach(el => {
    if (el.textContent && (el.textContent.includes('AMIS') || el.textContent.includes('Ctrl'))) {
      el.setAttribute('fill', '#52c41a');
    }
  });
}

/**
 * 处理AMIS元素点击
 */
function handleAmisElementClickInternal(element, event) {
  console.log('AMIS element clicked:', element);

  // 调用全局处理程序
  if (window.BpmnAmisHandler) {
    window.BpmnAmisHandler.onAmisElementClick(element, event);
  } else {
    // 调用全局处理函数
    handleAmisElementClickGlobal(element, event);
  }
}

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
// 自定义AMIS渲染器模块
const AmisRendererModule = {
  __init__: ['bpmnAmisRenderer'],
  bpmnAmisRenderer: ['type', BpmnAmisRenderer]
};

const controlForm = ref({
  simulation: true,
  labelEditing: false,
  labelVisible: false,
  prefix: "flowable",
  headerButtonSize: "mini",
  additionalModel: [CustomContentPadProvider, CustomPaletteProvider, ReplaceMenuModule, CustomRendererModule, AmisRendererModule],
});
// const model = ref<ModelApi.ModelVO>() // 流程模型的信息

/** 初始化 modeler */
const initModeler = (item: any) => {
  modeler.value = item;
  // 将 modeler 存储到全局变量以便其他函数使用
  window._currentModeler = item;

  // 关键：主动注册自定义replace菜单
  const provider = modeler.value?.get?.('replaceMenuProvider');
  if (provider && typeof provider.register === 'function') {
    provider.register();
  }

  // 注册AMIS处理程序到全局
  window.BpmnAmisHandler = {
    onAmisElementClick: handleAmisElementClickGlobal
  };

  // 监听自定义事件
  window.addEventListener('openAmisConfigDialog', handleOpenAmisConfigDialog);

  // 预加载菜单数据缓存
  preloadMenuDataCache();

  nextTick(() => {
    console.log("nextTick modeler.value:", modeler.value);
  });
};

// 处理AMIS元素点击
const handleAmisElementClickGlobal = (element: any, event: Event) => {
  console.log('Handling AMIS element click:', element);

  // 检查元素是否包含HTTP请求配置
  if (element.businessObject && element.businessObject.name &&
      element.businessObject.name.includes('HTTP')) {
    // 打开Hoppscotch编辑器
    openHoppscotchEditor(element);
  } else {
    // 其他AMIS元素处理
    alert(`AMIS Element Clicked: ${element.id}\nType: ${element.type}`);
  }
};

// 打开Hoppscotch编辑器
const openHoppscotchEditor = async (element: any) => {
  try {
    // 从后端获取HTTP配置
    const config = await getHoppscotchConfig(element.id);
    console.log('Retrieved Hoppscotch config:', config);

    // 这里可以打开一个对话框或在新窗口中打开Hoppscotch
    alert(`Opening Hoppscotch Editor for: ${element.id}\nConfig: ${JSON.stringify(config, null, 2)}`);
  } catch (error) {
    console.error('Failed to get Hoppscotch config:', error);
    alert(`Failed to load Hoppscotch config: ${error.message}`);
  }
};

// 从后端获取Hoppscotch配置
const getHoppscotchConfig = async (elementId: string) => {
  // 模拟API调用，实际应替换为真实的后端API
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        id: elementId,
        name: `HTTP Request for ${elementId}`,
        request: {
          url: 'http://localhost:8080/api/test',
          method: 'POST',
          headers: [
            { key: 'Content-Type', value: 'application/json' }
          ],
          body: JSON.stringify({ test: 'data' }, null, 2)
        }
      });
    }, 300);
  });
};

// 处理打开AMIS配置对话框事件
const handleOpenAmisConfigDialog = (event: any) => {
  const { element } = event.detail;
  console.log('Opening AMIS config dialog for:', element);
  alert(`Opening AMIS Config Dialog for: ${element.id}`);
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

  // 清理AMIS处理程序
  if (w.BpmnAmisHandler) {
    w.BpmnAmisHandler = null;
  }

  // 移除事件监听器
  window.removeEventListener('openAmisConfigDialog', handleOpenAmisConfigDialog);
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
    _currentModeler: any; // 存储当前modeler实例以便更新图形
  }
}
</script>
<style lang="scss">
@use "../../../bpmn-process-designer/src/package/theme/process-designer.scss";

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

/* AMIS元素的特殊样式 */
.djs-amis-element {
  stroke: #1890ff !important;
  stroke-width: 2px !important;
  transition: all 0.2s ease;
}

.djs-amis-element:hover {
  stroke: #52c41a !important;
  filter: drop-shadow(0 0 4px rgba(24, 144, 255, 0.5));
}

/* 当按住Ctrl键时，AMIS元素的样式 */
.ctrl-pressed .djs-amis-element {
  stroke: #fa8c16 !important;
  stroke-dasharray: 5, 5 !important;
  cursor: pointer !important;
}

/* 提示文本样式 */
.amis-hint-text {
  font-size: 10px !important;
  fill: #aaa !important;
}

.amis-hint-text.highlight {
  fill: #fa8c16 !important;
  font-weight: bold !important;
}
</style>
