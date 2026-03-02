<template>
  <!-- 调试信息 -->

  <!-- 交互提示 -->
<!--  <div class="interaction-hint" :class="{ active: isCtrlPressed }">-->
<!--    <span v-if="!isCtrlPressed">按住 Ctrl/⌘ 键可与 AMIS 元素交互</span>-->
<!--    <span v-else>✓ 交互模式已启用</span>-->
<!--  </div>-->

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
import { useRouter } from 'vue-router'
import {  MyProcessDesigner, CustomContentPadProvider, CustomPaletteProvider,  ReplaceMenuProvider,  CustomRendererModule } from 'bpmn-process-designer';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-codes.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';
// 导入 BpmnRenderer 用于自定义渲染器
import BpmnRenderer from 'bpmn-js/lib/draw/BpmnRenderer';
// 导入 SimpleAmisRender 组件
import SimpleAmisRender from '../components/ContentDisplay/SimpleAmisRender.vue';

// 获取router实例并暴露到window
const router = useRouter();
if (typeof window !== 'undefined') {
  (window as any).__APP_ROUTER__ = router;
  console.log('[BpmnDesigner] Router实例已暴露到window');
}

// 跟踪 Ctrl/Cmd 键状态
const isCtrlPressed = ref(false);

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
        // 阻止BPMN的默认点击行为
        e.preventDefault();
        e.stopPropagation();
        handleAmisElementClickInternal(e.element, e.originalEvent);
        return false;
      } else {
        // 显示提示
        console.log('Hold Ctrl/Cmd key to interact with AMIS element');
      }
    }
  });

  // 添加高优先级的点击拦截器
  eventBus.on('element.click', 2000, function(e) {
    if (isAmisElement(e.element)) {
      const isCtrlPressed = e.originalEvent.ctrlKey || e.originalEvent.metaKey;
      if (isCtrlPressed) {
        // 在交互模式下，阻止BPMN处理点击事件
        console.log('[BpmnAmisRenderer] 拦截BPMN点击事件，启用AMIS交互');
        return false; // 返回false阻止事件继续传播
      }
    }
  });

  eventBus.on('element.mouseenter', function(e) {
    if (isAmisElement(e.element)) {
      showInteractionHint(e.gfx);
      // 如果按下了Ctrl键，启用交互模式
      updateAmisInteractiveMode(e.element, isCtrlPressed.value);
    }
  });

  eventBus.on('element.mouseleave', function(e) {
    if (isAmisElement(e.element)) {
      hideInteractionHint(e.gfx);
      // 离开元素时禁用交互模式
      updateAmisInteractiveMode(e.element, false);
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
 * 更新AMIS元素的交互模式
 */
function updateAmisInteractiveMode(element, isInteractive) {
  console.log('[updateAmisInteractiveMode] 调用，element:', element?.id, 'isInteractive:', isInteractive);

  if (!element || !element.id) {
    console.log('[updateAmisInteractiveMode] 元素无效，返回');
    return;
  }

  // 查找该元素的所有foreignObject
  const canvas = document.querySelector('.djs-container');
  if (!canvas) {
    console.log('[updateAmisInteractiveMode] 找不到canvas容器');
    return;
  }

  const foreignObjects = canvas.querySelectorAll(`foreignObject[data-element-id="${element.id}"]`);
  console.log('[updateAmisInteractiveMode] 找到foreignObject数量:', foreignObjects.length);

  foreignObjects.forEach((fo, index) => {
    const contentDiv = fo.querySelector('.amis-content-div');
    console.log(`[updateAmisInteractiveMode] foreignObject[${index}]:`, fo);
    console.log(`[updateAmisInteractiveMode] contentDiv[${index}]:`, contentDiv);

    if (isInteractive) {
      // 启用交互模式
      fo.style.pointerEvents = 'auto';
      fo.style.zIndex = '10000'; // 确保在最上层
      console.log(`[updateAmisInteractiveMode] 设置 fo.style.pointerEvents = 'auto'`);
      console.log(`[updateAmisInteractiveMode] fo.style.pointerEvents 实际值:`, fo.style.pointerEvents);

      if (contentDiv) {
        contentDiv.style.pointerEvents = 'auto';
        contentDiv.classList.add('amis-interactive');

        // 确保所有子元素也可以交互
        const allChildren = contentDiv.querySelectorAll('*');
        allChildren.forEach(child => {
          child.style.pointerEvents = 'auto';
        });

        // 添加点击事件监听器来阻止事件冒泡到BPMN
        const clickHandler = (e) => {
          console.log('[AMIS交互] 点击事件被捕获:', e.target);
          e.stopPropagation(); // 阻止事件冒泡到BPMN
          // 让事件正常处理
        };

        // 移除旧的监听器（如果存在）
        if (contentDiv._amisClickHandler) {
          contentDiv.removeEventListener('click', contentDiv._amisClickHandler, true);
        }

        // 添加新的监听器（使用捕获阶段）
        contentDiv.addEventListener('click', clickHandler, true);
        contentDiv._amisClickHandler = clickHandler;

        console.log(`[updateAmisInteractiveMode] 添加 amis-interactive 类，当前类列表:`, contentDiv.className);
        console.log(`[updateAmisInteractiveMode] contentDiv.style.pointerEvents 实际值:`, contentDiv.style.pointerEvents);
        console.log(`[updateAmisInteractiveMode] 设置了 ${allChildren.length} 个子元素的 pointer-events`);
      }

      // 将foreignObject移到父元素的最后，确保在最上层
      if (fo.parentNode) {
        fo.parentNode.appendChild(fo);
        console.log(`[updateAmisInteractiveMode] 将foreignObject移到最上层`);
      }
    } else {
      // 禁用交互模式
      fo.style.pointerEvents = 'none';
      fo.style.zIndex = '';
      if (contentDiv) {
        contentDiv.style.pointerEvents = 'none';
        contentDiv.classList.remove('amis-interactive');

        // 移除点击事件监听器
        if (contentDiv._amisClickHandler) {
          contentDiv.removeEventListener('click', contentDiv._amisClickHandler, true);
          contentDiv._amisClickHandler = null;
        }

        // 恢复所有子元素的pointer-events
        const allChildren = contentDiv.querySelectorAll('*');
        allChildren.forEach(child => {
          child.style.pointerEvents = '';
        });

        console.log(`[updateAmisInteractiveMode] 移除 amis-interactive 类`);
      }
    }
  });
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

  // 清理旧的foreignObject（如果存在）
  const oldForeignObjects = parentGfx.querySelectorAll(`foreignObject[data-element-id="${element.id}"]`);
  oldForeignObjects.forEach(old => old.remove());
  console.log('renderAmisVisibleContent - 清理了', oldForeignObjects.length, '个旧的foreignObject');

  // 创建 foreignObject 来显示 HTML 内容
  const fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
  fo.setAttribute('x', 0);
  fo.setAttribute('y', 0);
  fo.setAttribute('width', element.width);
  fo.setAttribute('height', element.height);
  fo.setAttribute('data-element-id', element.id); // 添加元素ID用于后续查找
  fo.style.pointerEvents = 'none'; // 默认不影响节点交互
  fo.classList.add('amis-foreign-object'); // 添加类名用于查找

  // 创建内容容器
  const htmlDiv = document.createElement('div');
  htmlDiv.style.width = '100%';
  htmlDiv.style.height = '100%';
  htmlDiv.style.overflow = 'hidden';
  htmlDiv.style.fontSize = '10px';
  htmlDiv.style.pointerEvents = 'none'; // 默认不影响节点交互
  htmlDiv.style.padding = '4px';
  htmlDiv.classList.add('amis-content-div'); // 添加类名用于查找

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
    // 尝试获取AMIS代码并获取对应的schema
    const amisCode = getAmisCode(element);
    if (amisCode) {
      // 获取缓存的AMIS内容
      const amisContent = window._bpmnContentHtmlMap?.[amisCode];
      if (amisContent) {
        console.log('Found cached AMIS content, trying to render as dialog:', amisContent);
        // 如果内容是对象（可能是解析过的AMIS schema），尝试直接作为schema打开
        try {
          const parsedContent = typeof amisContent === 'string' && amisContent.trim().startsWith('{')
            ? JSON.parse(amisContent)
            : amisContent;

          if (parsedContent && typeof parsedContent === 'object' && parsedContent.type === 'page') {
            // 这是一个AMIS schema，我们需要在全局上下文中渲染它
            console.log('Rendering AMIS schema as dialog:', parsedContent);

            // 尝试使用全局AMIS功能创建弹窗
            const amisDialog = window.amisRequire?.('amis/lib/components/Dialog') ||
                              window.amisRequire?.('amis/lib/components/Modal') ||
                              window.amis?.dialog;

            if (amisDialog) {
              amisDialog.alert({
                title: 'AMIS元素预览',
                body: parsedContent,
                size: 'lg'
              });
            } else {
              // 如果AMIS dialog不可用，使用alert作为后备
              alert(`AMIS Element Content:\n${JSON.stringify(parsedContent, null, 2)}`);
            }
          } else {
            alert(`AMIS Element Clicked: ${element.id}\nContent: ${amisContent}`);
          }
        } catch (e) {
          console.error('Error parsing AMIS content:', e);
          alert(`AMIS Element Clicked: ${element.id}\nContent: ${amisContent}`);
        }
      } else {
        // 如果没有缓存，尝试从API获取内容
        fetchAmisContentHtml(amisCode, element.id).then(content => {
          try {
            const parsedContent = typeof content === 'string' && content.trim().startsWith('{')
              ? JSON.parse(content)
              : content;

            if (parsedContent && typeof parsedContent === 'object' && parsedContent.type === 'page') {
              // 这是一个AMIS schema，尝试渲染为弹窗
              const amisDialog = window.amisRequire?.('amis/lib/components/Dialog') ||
                                window.amisRequire?.('amis/lib/components/Modal') ||
                                window.amis?.dialog;

              if (amisDialog) {
                amisDialog.alert({
                  title: 'AMIS元素预览',
                  body: parsedContent,
                  size: 'lg'
                });
              } else {
                alert(`AMIS Element Content:\n${JSON.stringify(parsedContent, null, 2)}`);
              }
            } else {
              alert(`AMIS Element Clicked: ${element.id}\nContent: ${content}`);
            }
          } catch (e) {
            console.error('Error parsing AMIS content:', e);
            alert(`AMIS Element Clicked: ${element.id}\nContent: ${content}`);
          }
        }).catch(err => {
          console.error('Failed to fetch AMIS content:', err);
          alert(`AMIS Element Clicked: ${element.id}\nError fetching content: ${err.message}`);
        });
      }
    } else {
      // 其他AMIS元素处理
      alert(`AMIS Element Clicked: ${element.id}\nType: ${element.type}`);
    }
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

  // 清理键盘事件监听器
  if (w._bpmnKeyHandlers) {
    window.removeEventListener('keydown', w._bpmnKeyHandlers.handleKeyDown);
    window.removeEventListener('keyup', w._bpmnKeyHandlers.handleKeyUp);
    w._bpmnKeyHandlers = null;
  }
});

onMounted(() => {
  console.log("[app] App.vue onMounted");

  // 添加全局点击监听器用于调试
  document.addEventListener('click', (e) => {
    if (isCtrlPressed.value) {
      console.log('[全局点击] 目标:', e.target);
      console.log('[全局点击] 标签:', e.target.tagName);
      console.log('[全局点击] 类名:', e.target.className);
      console.log('[全局点击] pointer-events:', window.getComputedStyle(e.target).pointerEvents);
    }
  }, true);

  // 监听键盘事件来更新 Ctrl/Cmd 键状态
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      isCtrlPressed.value = true;
      // 更新所有AMIS元素的交互模式
      updateAllAmisElementsInteractiveMode(true);
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    if (!e.ctrlKey && !e.metaKey) {
      isCtrlPressed.value = false;
      // 更新所有AMIS元素的交互模式
      updateAllAmisElementsInteractiveMode(false);
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);

  // 存储事件处理器以便清理
  (window as any)._bpmnKeyHandlers = { handleKeyDown, handleKeyUp };
});

/**
 * 更新所有AMIS元素的交互模式
 */
function updateAllAmisElementsInteractiveMode(isInteractive: boolean) {
  console.log('[updateAllAmisElementsInteractiveMode] 调用，isInteractive:', isInteractive);

  // 尝试多种方式查找canvas容器
  let canvas = document.querySelector('.djs-container');
  console.log('[updateAllAmisElementsInteractiveMode] .djs-container:', canvas);

  if (!canvas) {
    canvas = document.querySelector('.bjs-container');
    console.log('[updateAllAmisElementsInteractiveMode] .bjs-container:', canvas);
  }

  if (!canvas) {
    canvas = document.querySelector('#bpmnCanvas');
    console.log('[updateAllAmisElementsInteractiveMode] #bpmnCanvas:', canvas);
  }

  if (!canvas) {
    canvas = document.body;
    console.log('[updateAllAmisElementsInteractiveMode] 使用 document.body');
  }

  // 查找所有foreignObject（不限定容器）
  const allForeignObjects = document.querySelectorAll('foreignObject');
  console.log('[updateAllAmisElementsInteractiveMode] 所有foreignObject数量:', allForeignObjects.length);

  // 查找带有data-element-id的foreignObject
  const foreignObjects = document.querySelectorAll('foreignObject[data-element-id]');
  console.log('[updateAllAmisElementsInteractiveMode] 带data-element-id的foreignObject数量:', foreignObjects.length);

  // 查找带有amis-foreign-object类的foreignObject
  const amisForeignObjects = document.querySelectorAll('foreignObject.amis-foreign-object');
  console.log('[updateAllAmisElementsInteractiveMode] 带amis-foreign-object类的foreignObject数量:', amisForeignObjects.length);

  // 如果找不到带data-element-id的，尝试使用带类名的
  const targetForeignObjects = foreignObjects.length > 0 ? foreignObjects : amisForeignObjects;
  console.log('[updateAllAmisElementsInteractiveMode] 最终使用的foreignObject数量:', targetForeignObjects.length);

  targetForeignObjects.forEach((fo, index) => {
    const contentDiv = fo.querySelector('.amis-content-div');
    const elementId = fo.getAttribute('data-element-id') || `unknown-${index}`;
    console.log(`[updateAllAmisElementsInteractiveMode] 处理foreignObject[${index}]:`, elementId);
    console.log(`[updateAllAmisElementsInteractiveMode] foreignObject[${index}] contentDiv:`, contentDiv);
    console.log(`[updateAllAmisElementsInteractiveMode] foreignObject[${index}] innerHTML:`, fo.innerHTML.substring(0, 200));

    if (isInteractive) {
      // 启用交互模式
      fo.style.pointerEvents = 'auto';
      fo.style.zIndex = '10000';
      console.log(`[updateAllAmisElementsInteractiveMode] foreignObject[${index}] 设置 pointer-events:`, fo.style.pointerEvents);

      // 找到并禁用BPMN的hit区域
      // hit区域通常在foreignObject的父元素（g标签）中
      let hitArea = null;
      const parentGroup = fo.parentElement;

      if (parentGroup) {
        // 先在父元素中查找
        hitArea = parentGroup.querySelector('.djs-hit');
        console.log(`[updateAllAmisElementsInteractiveMode] 在父元素中查找hit区域:`, hitArea);

        // 如果没找到，在父元素的父元素中查找
        if (!hitArea && parentGroup.parentElement) {
          hitArea = parentGroup.parentElement.querySelector('.djs-hit');
          console.log(`[updateAllAmisElementsInteractiveMode] 在祖父元素中查找hit区域:`, hitArea);
        }

        if (hitArea) {
          // 只在第一次时保存原始值
          if (hitArea._originalPointerEvents === undefined) {
            hitArea._originalPointerEvents = hitArea.style.pointerEvents || window.getComputedStyle(hitArea).pointerEvents;
            console.log(`[updateAllAmisElementsInteractiveMode] 首次保存hit区域原始值:`, hitArea._originalPointerEvents);
          } else {
            console.log(`[updateAllAmisElementsInteractiveMode] 使用已保存的hit区域原始值:`, hitArea._originalPointerEvents);
          }
          hitArea.style.pointerEvents = 'none';
          console.log(`[updateAllAmisElementsInteractiveMode] hit区域当前pointer-events:`, window.getComputedStyle(hitArea).pointerEvents);
        } else {
          console.warn(`[updateAllAmisElementsInteractiveMode] 未找到hit区域`);
        }
      }

      if (contentDiv) {
        contentDiv.style.pointerEvents = 'auto';
        contentDiv.classList.add('amis-interactive');

        // 使用border代替outline（outline在SVG中可能不显示）
        contentDiv.style.border = '3px dashed #fa8c16';
        contentDiv.style.cursor = 'pointer';
        contentDiv.style.backgroundColor = 'rgba(255, 140, 22, 0.15)';
        contentDiv.style.boxShadow = '0 0 10px rgba(255, 140, 22, 0.5)';
        contentDiv.style.animation = 'pulse-border 1s ease-in-out infinite';
        contentDiv.style.position = 'relative';
        contentDiv.style.zIndex = '9999';
        // 调整padding以补偿border
        contentDiv.style.padding = '1px';
        contentDiv.style.boxSizing = 'border-box';

        console.log(`[updateAllAmisElementsInteractiveMode] contentDiv[${index}] 类列表:`, contentDiv.className);
        console.log(`[updateAllAmisElementsInteractiveMode] contentDiv[${index}] pointer-events:`, contentDiv.style.pointerEvents);
        console.log(`[updateAllAmisElementsInteractiveMode] contentDiv[${index}] border:`, contentDiv.style.border);

        // 确保所有子元素也可以交互
        const allChildren = contentDiv.querySelectorAll('*');
        allChildren.forEach(child => {
          child.style.pointerEvents = 'auto';
          child.style.cursor = 'pointer';
        });

        // 在foreignObject上也添加点击监听器
        const foClickHandler = (e) => {
          console.log('[AMIS交互-FO] foreignObject点击事件:', e.target);
          console.log('[AMIS交互-FO] 点击坐标:', e.clientX, e.clientY);
          // 不阻止传播，让事件继续到contentDiv
        };

        if (fo._amisClickHandler) {
          fo.removeEventListener('click', fo._amisClickHandler, true);
        }
        fo.addEventListener('click', foClickHandler, true);
        fo._amisClickHandler = foClickHandler;

        // 在contentDiv上添加点击监听器
        const clickHandler = (e) => {
          console.log('[AMIS交互] contentDiv点击事件被捕获:', e.target);
          console.log('[AMIS交互] 事件类型:', e.type);
          console.log('[AMIS交互] 事件目标标签:', e.target.tagName);
          console.log('[AMIS交互] 点击坐标:', e.clientX, e.clientY);
          // 不阻止传播，让按钮等元素正常工作
        };

        if (contentDiv._amisClickHandler) {
          contentDiv.removeEventListener('click', contentDiv._amisClickHandler, true);
        }

        contentDiv.addEventListener('click', clickHandler, true);
        contentDiv._amisClickHandler = clickHandler;

        console.log(`[updateAllAmisElementsInteractiveMode] 启用交互，子元素数量: ${allChildren.length}`);
      } else {
        console.warn(`[updateAllAmisElementsInteractiveMode] foreignObject[${index}] 没有找到 .amis-content-div`);
      }

      // 将foreignObject移到最上层
      if (fo.parentNode) {
        fo.parentNode.appendChild(fo);
      }
    } else {
      // 禁用交互模式
      fo.style.pointerEvents = 'none';
      fo.style.zIndex = '';

      // 恢复BPMN的hit区域
      let hitArea = null;
      const parentGroup = fo.parentElement;

      if (parentGroup) {
        // 先在父元素中查找
        hitArea = parentGroup.querySelector('.djs-hit');

        // 如果没找到，在父元素的父元素中查找
        if (!hitArea && parentGroup.parentElement) {
          hitArea = parentGroup.parentElement.querySelector('.djs-hit');
        }

        if (hitArea && hitArea._originalPointerEvents !== undefined) {
          hitArea.style.pointerEvents = hitArea._originalPointerEvents;
          delete hitArea._originalPointerEvents;
          console.log(`[updateAllAmisElementsInteractiveMode] 恢复hit区域，恢复值:`, hitArea.style.pointerEvents);
        }
      }

      // 清除foreignObject的监听器
      if (fo._amisClickHandler) {
        fo.removeEventListener('click', fo._amisClickHandler, true);
        fo._amisClickHandler = null;
      }

      if (contentDiv) {
        contentDiv.style.pointerEvents = 'none';
        contentDiv.classList.remove('amis-interactive');

        // 清除内联样式
        contentDiv.style.border = '';
        contentDiv.style.cursor = '';
        contentDiv.style.backgroundColor = '';
        contentDiv.style.boxShadow = '';
        contentDiv.style.animation = '';
        contentDiv.style.position = '';
        contentDiv.style.zIndex = '';
        contentDiv.style.padding = '4px'; // 恢复原始padding
        contentDiv.style.boxSizing = '';

        if (contentDiv._amisClickHandler) {
          contentDiv.removeEventListener('click', contentDiv._amisClickHandler, true);
          contentDiv._amisClickHandler = null;
        }

        const allChildren = contentDiv.querySelectorAll('*');
        allChildren.forEach(child => {
          child.style.pointerEvents = '';
          child.style.cursor = '';
        });
      }
    }
  });

  console.log('[updateAllAmisElementsInteractiveMode] 处理完成');
}

/**
 * 判断元素是否为API Activity
 */
function isApiActivity(element) {
  const businessObject = element.businessObject;
  if (!businessObject) return false;

  // 检查是否为服务任务且名称包含API或HTTP
  if (element.type === 'bpmn:ServiceTask') {
    const name = businessObject.name?.toLowerCase() || '';
    if (name.includes('api') || name.includes('http')) {
      return true;
    }
  }

  // 检查扩展元素中是否包含apiActivityId
  if (businessObject.extensionElements) {
    return businessObject.extensionElements.values.some((ext: any) => {
      if (ext.$type === 'bpmn:Documentation' && ext.text) {
        return ext.text.startsWith('apiActivityId:');
      }
      return false;
    });
  }

  return false;
}

/**
 * 获取API Activity ID
 */
function getApiActivityId(element) {
  const businessObject = element.businessObject;
  if (businessObject && businessObject.extensionElements) {
    const doc = businessObject.extensionElements.values.find((ext: any) =>
      ext.$type === 'bpmn:Documentation' && ext.text?.startsWith('apiActivityId:')
    );
    if (doc) {
      return doc.text.replace('apiActivityId:', '').trim();
    }
  }
  return null;
}

/**
 * 打开API Activity编辑器
 */
function openApiActivityEditor(element) {
  const apiActivityId = getApiActivityId(element);

  if (apiActivityId) {
    // 如果已有ID,打开编辑器编辑
    const url = `/api-activity-editor?id=${apiActivityId}`;
    window.open(url, '_blank', 'width=1200,height=800');
  } else {
    // 如果没有ID,创建新的API Activity
    const url = '/api-activity-editor';
    const newWindow = window.open(url, '_blank', 'width=1200,height=800');

    // 监听新窗口的消息,获取创建的API Activity ID
    window.addEventListener('message', function handler(event) {
      if (event.data.type === 'api-activity-saved' && event.data.id) {
        // 保存API Activity ID到BPMN元素
        saveApiActivityIdToElement(element, event.data.id);
        window.removeEventListener('message', handler);
      }
    });
  }
}

/**
 * 保存API Activity ID到BPMN元素
 */
function saveApiActivityIdToElement(element, apiActivityId: string) {
  const modeling = modeler.value?.get('modeling');
  const moddle = modeler.value?.get('moddle');

  if (!modeling || !moddle) {
    console.error('无法获取modeling或moddle实例');
    return;
  }

  const businessObject = element.businessObject;

  // 创建或更新extensionElements
  let extensionElements = businessObject.extensionElements;
  if (!extensionElements) {
    extensionElements = moddle.create('bpmn:ExtensionElements');
  }

  // 查找或创建Documentation元素
  let docElement = extensionElements.values?.find((ext: any) =>
    ext.$type === 'bpmn:Documentation' && ext.text?.startsWith('apiActivityId:')
  );

  if (docElement) {
    // 更新现有的Documentation
    docElement.text = `apiActivityId:${apiActivityId}`;
  } else {
    // 创建新的Documentation
    docElement = moddle.create('bpmn:Documentation', {
      text: `apiActivityId:${apiActivityId}`
    });
    if (!extensionElements.values) {
      extensionElements.values = [];
    }
    extensionElements.values.push(docElement);
  }

  // 更新元素
  modeling.updateProperties(element, {
    extensionElements: extensionElements
  });

  console.log(`API Activity ID ${apiActivityId} 已保存到元素 ${element.id}`);
}

/**
 * 生成Hoppscotch分享链接
 */
async function generateHoppscotchShareLink(element) {
  const apiActivityId = getApiActivityId(element);

  if (!apiActivityId) {
    alert('该元素没有关联的API Activity');
    return;
  }

  try {
    const response = await fetch(`/api/bpmn/activity/${apiActivityId}/share-link`);
    const result = await response.json();

    if (result.success) {
      const shareLink = result.data.shareLink;
      // 复制到剪贴板
      await navigator.clipboard.writeText(shareLink);
      alert('Hoppscotch分享链接已复制到剪贴板:\n' + shareLink);
    } else {
      alert('生成分享链接失败: ' + result.message);
    }
  } catch (error) {
    console.error('生成分享链接失败:', error);
    alert('生成分享链接失败: ' + error);
  }
}

/**
 * 导出Curl命令
 */
async function exportCurlCommand(element) {
  const apiActivityId = getApiActivityId(element);

  if (!apiActivityId) {
    alert('该元素没有关联的API Activity');
    return;
  }

  try {
    const response = await fetch(`/api/bpmn/activity/${apiActivityId}/curl`);
    const result = await response.json();

    if (result.success) {
      const curl = result.data.curl;
      // 复制到剪贴板
      await navigator.clipboard.writeText(curl);
      alert('Curl命令已复制到剪贴板');
    } else {
      alert('导出Curl命令失败: ' + result.message);
    }
  } catch (error) {
    console.error('导出Curl命令失败:', error);
    alert('导出Curl命令失败: ' + error);
  }
}

// 解决 window._debugModeler linter 错误
declare global {
  interface Window {
    _debugModeler: any;
    _debugModelerRaw: any;
    _debugModelerRef: any;
    _bpmnMenuCache: any; // 新增：用于缓存菜单数据
    _bpmnContentHtmlMap: any; // 新增：用于缓存HTML内容
    _currentModeler: any; // 存储当前modeler实例以便更新图形
    __APP_ROUTER__: any; // 暴露router实例给AMIS使用
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

/* AMIS 交互模式样式 - 使用更高的优先级 */
foreignObject .amis-interactive,
.amis-content-div.amis-interactive {
  outline: 3px dashed #fa8c16 !important;
  outline-offset: 3px !important;
  cursor: pointer !important;
  animation: pulse-border 1s ease-in-out infinite !important;
  position: relative !important;
  z-index: 9999 !important;
  /* 添加背景色变化使动画更明显 */
  background-color: rgba(255, 140, 22, 0.15) !important;
  /* 添加阴影使效果更明显 */
  box-shadow: 0 0 10px rgba(255, 140, 22, 0.5) !important;
}

/* 确保交互模式下所有内部元素都可点击 */
foreignObject .amis-interactive *,
.amis-content-div.amis-interactive * {
  pointer-events: auto !important;
  cursor: pointer !important;
}

@keyframes pulse-border {
  0%, 100% {
    border-color: #fa8c16;
    border-width: 3px;
    background-color: rgba(255, 140, 22, 0.15);
    box-shadow: 0 0 10px rgba(255, 140, 22, 0.5);
  }
  50% {
    border-color: #ffc069;
    border-width: 4px;
    background-color: rgba(255, 192, 105, 0.25);
    box-shadow: 0 0 20px rgba(255, 192, 105, 0.8);
  }
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

/* 交互提示样式 */
.interaction-hint {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.75);
  color: #fff;
  border-radius: 4px;
  font-size: 12px;
  z-index: 10000;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.interaction-hint.active {
  background: #52c41a;
  box-shadow: 0 2px 12px rgba(82, 196, 26, 0.4);
}

.interaction-hint span {
  display: inline-block;
}
</style>
