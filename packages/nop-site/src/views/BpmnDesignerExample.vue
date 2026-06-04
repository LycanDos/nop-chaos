<template>
  <div class="bpmn-designer-example">
    <ContentWrap>
      <div class="page-header">
        <div>
          <h3>BPMN 流程设计器示例</h3>
          <p class="page-desc">展示 bpmn-js 流程设计器的完整功能，包含节点编辑、属性配置、执行器绑定等</p>
        </div>
        <div class="header-actions">
          <a-select v-model:value="selectedExample" @change="switchExample" style="width:200px">
            <a-select-option value="purchase">采购审批流程</a-select-option>
            <a-select-option value="leave">请假审批流程</a-select-option>
            <a-select-option value="empty">空白流程</a-select-option>
          </a-select>
        </div>
      </div>
    </ContentWrap>
    <ContentWrap>
      <div class="bpmn-designer-wrapper">
        <ProcessDesigner
          ref="processDesignerRef"
          :xml="currentXml"
          :executor-api="executorApi"
        />
      </div>
    </ContentWrap>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { ProcessDesigner } from 'bpmn-process-designer'
import { nopSiteExecutorApi } from '../api/bpmn/executorApi'
// bpmn-js 样式 — 必须导入，否则渲染为大黑块
import 'bpmn-process-designer/dist/bpmn-process-designer.css';
import 'bpmn-js/dist/assets/diagram-js.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css'
import 'bpmn-js/dist/assets/bpmn-js.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css'
import 'diagram-js-minimap/assets/diagram-js-minimap.css'
import 'bpmn-js-token-simulation/assets/css/bpmn-js-token-simulation.css'
import 'bpmn-js-bpmnlint/dist/assets/css/bpmn-js-bpmnlint.css'
import 'bpmn-js-color-picker/colors/color-picker.css'

defineOptions({ name: 'BpmnDesignerExample' })

const processDesignerRef = ref<any>(null)
const selectedExample = ref('purchase')
const executorApi = nopSiteExecutorApi

const purchaseXml = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  id="def-purchase" targetNamespace="http://nop/demo">
  <process id="purchaseOrder" name="采购审批流程" isExecutable="true">
    <startEvent id="StartEvent_1" name="开始" />
    <sequenceFlow id="Flow_start_apply" sourceRef="StartEvent_1" targetRef="Task_apply" />
    <userTask id="Task_apply" name="提交采购申请" />
    <sequenceFlow id="Flow_apply_mgr" sourceRef="Task_apply" targetRef="Task_mgr" />
    <userTask id="Task_mgr" name="部门经理审批" />
    <sequenceFlow id="Flow_mgr_gateway" sourceRef="Task_mgr" targetRef="Gateway_amount" />
    <exclusiveGateway id="Gateway_amount" name="金额判断" />
    <sequenceFlow id="Flow_gateway_finance" sourceRef="Gateway_amount" targetRef="Task_finance">
      <conditionExpression xsi:type="tFormalExpression">amount &lt;= 50000</conditionExpression>
    </sequenceFlow>
    <sequenceFlow id="Flow_gateway_gm" sourceRef="Gateway_amount" targetRef="Task_gm">
      <conditionExpression xsi:type="tFormalExpression">amount &gt; 50000</conditionExpression>
    </sequenceFlow>
    <userTask id="Task_finance" name="财务审核" />
    <userTask id="Task_gm" name="总经理审批" />
    <sequenceFlow id="Flow_finance_parallel" sourceRef="Task_finance" targetRef="Gateway_parallel" />
    <sequenceFlow id="Flow_gm_parallel" sourceRef="Task_gm" targetRef="Gateway_parallel" />
    <parallelGateway id="Gateway_parallel" name="汇聚" />
    <sequenceFlow id="Flow_parallel_notify" sourceRef="Gateway_parallel" targetRef="Task_notify" />
    <serviceTask id="Task_notify" name="通知结果" />
    <sequenceFlow id="Flow_notify_end" sourceRef="Task_notify" targetRef="EndEvent_1" />
    <endEvent id="EndEvent_1" name="结束" />
  </process>
  <bpmndi:BPMNDiagram id="Diagram_1">
    <bpmndi:BPMNPlane id="Plane_1" bpmnElement="purchaseOrder">
      <bpmndi:BPMNShape id="shape_start" bpmnElement="StartEvent_1"><dc:Bounds x="60" y="200" width="36" height="36" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="shape_apply" bpmnElement="Task_apply"><dc:Bounds x="140" y="178" width="100" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="shape_mgr" bpmnElement="Task_mgr"><dc:Bounds x="290" y="178" width="100" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="shape_gateway" bpmnElement="Gateway_amount"><dc:Bounds x="440" y="190" width="50" height="50" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="shape_finance" bpmnElement="Task_finance"><dc:Bounds x="550" y="120" width="100" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="shape_gm" bpmnElement="Task_gm"><dc:Bounds x="550" y="260" width="100" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="shape_parallel" bpmnElement="Gateway_parallel"><dc:Bounds x="730" y="190" width="50" height="50" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="shape_notify" bpmnElement="Task_notify"><dc:Bounds x="850" y="178" width="100" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="shape_end" bpmnElement="EndEvent_1"><dc:Bounds x="1000" y="200" width="36" height="36" /></bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="edge_start_apply" bpmnElement="Flow_start_apply"><di:waypoint x="96" y="218" /><di:waypoint x="140" y="218" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="edge_apply_mgr" bpmnElement="Flow_apply_mgr"><di:waypoint x="240" y="218" /><di:waypoint x="290" y="218" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="edge_mgr_gateway" bpmnElement="Flow_mgr_gateway"><di:waypoint x="390" y="218" /><di:waypoint x="440" y="215" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="edge_gateway_finance" bpmnElement="Flow_gateway_finance"><di:waypoint x="465" y="190" /><di:waypoint x="465" y="160" /><di:waypoint x="550" y="160" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="edge_gateway_gm" bpmnElement="Flow_gateway_gm"><di:waypoint x="465" y="240" /><di:waypoint x="465" y="300" /><di:waypoint x="550" y="300" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="edge_finance_parallel" bpmnElement="Flow_finance_parallel"><di:waypoint x="650" y="160" /><di:waypoint x="755" y="160" /><di:waypoint x="755" y="190" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="edge_gm_parallel" bpmnElement="Flow_gm_parallel"><di:waypoint x="650" y="300" /><di:waypoint x="755" y="300" /><di:waypoint x="755" y="240" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="edge_parallel_notify" bpmnElement="Flow_parallel_notify"><di:waypoint x="780" y="218" /><di:waypoint x="850" y="218" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="edge_notify_end" bpmnElement="Flow_notify_end"><di:waypoint x="950" y="218" /><di:waypoint x="1000" y="218" /></bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>`

const leaveXml = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  id="def-leave" targetNamespace="http://nop/demo">
  <process id="leaveProcess" name="请假审批流程" isExecutable="true">
    <startEvent id="StartEvent_1" name="开始" />
    <sequenceFlow id="Flow_start_apply" sourceRef="StartEvent_1" targetRef="Task_apply" />
    <userTask id="Task_apply" name="提交请假申请" />
    <sequenceFlow id="Flow_apply_dept" sourceRef="Task_apply" targetRef="Task_dept" />
    <userTask id="Task_dept" name="部门经理审批" />
    <sequenceFlow id="Flow_dept_hr" sourceRef="Task_dept" targetRef="Task_hr" />
    <userTask id="Task_hr" name="HR 确认" />
    <sequenceFlow id="Flow_hr_end" sourceRef="Task_hr" targetRef="EndEvent_1" />
    <endEvent id="EndEvent_1" name="结束" />
  </process>
  <bpmndi:BPMNDiagram id="Diagram_1">
    <bpmndi:BPMNPlane id="Plane_1" bpmnElement="leaveProcess">
      <bpmndi:BPMNShape id="shape_start" bpmnElement="StartEvent_1"><dc:Bounds x="80" y="180" width="36" height="36" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="shape_apply" bpmnElement="Task_apply"><dc:Bounds x="170" y="158" width="100" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="shape_dept" bpmnElement="Task_dept"><dc:Bounds x="330" y="158" width="100" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="shape_hr" bpmnElement="Task_hr"><dc:Bounds x="490" y="158" width="100" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="shape_end" bpmnElement="EndEvent_1"><dc:Bounds x="650" y="180" width="36" height="36" /></bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="edge_start_apply" bpmnElement="Flow_start_apply"><di:waypoint x="116" y="198" /><di:waypoint x="170" y="198" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="edge_apply_dept" bpmnElement="Flow_apply_dept"><di:waypoint x="270" y="198" /><di:waypoint x="330" y="198" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="edge_dept_hr" bpmnElement="Flow_dept_hr"><di:waypoint x="430" y="198" /><di:waypoint x="490" y="198" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="edge_hr_end" bpmnElement="Flow_hr_end"><di:waypoint x="590" y="198" /><di:waypoint x="650" y="198" /></bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>`

const exampleMap: Record<string, string> = {
  purchase: purchaseXml,
  leave: leaveXml,
  empty: '',
}

const currentXml = computed(() => exampleMap[selectedExample.value] || '')

function switchExample(val: string) {
  selectedExample.value = val
}

// ====== AI Copilot 页面上下文注册 ======
import { providePageContext } from '@/components/AiCopilot/usePageContext.ts'

onMounted(() => {
  // 注册 AI Copilot 页面上下文
  providePageContext({
    pageType: 'bpmn-designer',
    route: '/bpmn-designer/example',
    getState: () => ({
      processName: selectedExample.value,
      hasContent: !!currentXml.value,
    }),
    actions: {
      async createProcess(params: any) {
        if (processDesignerRef.value) {
          await processDesignerRef.value.loadXml(params?.xml || '')
        }
      },
      async addNode(params: any) {
        const modeler = processDesignerRef.value?.getModeler()
        if (!modeler) return
        const modeling = modeler.get('modeling')
        const canvas = modeler.get('canvas')
        const rootElement = canvas.getRootElement()
        const shape = modeling.createShape(
          { type: params.type, width: 100, height: 80 },
          { x: params.x || 200, y: params.y || 200 },
          rootElement,
        )
        if (params.name) {
          modeling.updateProperties(shape, { name: params.name })
        }
      },
      async updateNode(params: any) {
        const modeler = processDesignerRef.value?.getModeler()
        if (!modeler) return
        const modeling = modeler.get('modeling')
        const elementRegistry = modeler.get('elementRegistry')
        const element = params.id ? elementRegistry.get(params.id) : null
        if (element) {
          modeling.updateProperties(element, params.properties || {})
        }
      },
      async removeNode(params: any) {
        const modeler = processDesignerRef.value?.getModeler()
        if (!modeler) return
        const modeling = modeler.get('modeling')
        const elementRegistry = modeler.get('elementRegistry')
        const element = params.id ? elementRegistry.get(params.id) : null
        if (element) {
          modeling.removeElements([element])
        }
      },
      async connectNodes(params: any) {
        const modeler = processDesignerRef.value?.getModeler()
        if (!modeler) return
        const modeling = modeler.get('modeling')
        const elementRegistry = modeler.get('elementRegistry')
        const source = params.sourceId ? elementRegistry.get(params.sourceId) : null
        const target = params.targetId ? elementRegistry.get(params.targetId) : null
        if (source && target) {
          modeling.connect(source, target)
        }
      },
      async layoutProcess() {
        const modeler = processDesignerRef.value?.getModeler()
        if (modeler) {
          try {
            const autoLayout = modeler.get('autoLayout')
            if (autoLayout) autoLayout.layout()
          } catch (_) { /* layout not available */ }
        }
      },
      async getProcessStructure() {
        const modeler = processDesignerRef.value?.getModeler()
        if (!modeler) return { nodes: [] }
        const elementRegistry = modeler.get('elementRegistry')
        const elements = elementRegistry.getAll()
        return {
          nodes: elements
            .filter((e: any) => e.businessObject?.$type?.startsWith('bpmn:'))
            .map((e: any) => ({
              id: e.id,
              type: e.businessObject.$type.replace('bpmn:', ''),
              name: e.businessObject.name || '',
            })),
        }
      },
      async getNodeInfo(params: any) {
        const modeler = processDesignerRef.value?.getModeler()
        if (!modeler) return null
        const elementRegistry = modeler.get('elementRegistry')
        const el = params.id ? elementRegistry.get(params.id) : null
        if (!el) return null
        return {
          id: el.id,
          type: el.businessObject?.$type?.replace('bpmn:', '') || '',
          name: el.businessObject?.name || '',
          properties: el.businessObject,
        }
      },
    },
  })
})

// 给小地图添加可拖动标题栏（含收缩/关闭按钮）
onMounted(() => {
  nextTick(() => {
    setTimeout(() => {
      const minimap = document.querySelector('.djs-minimap') as HTMLElement;
      if (!minimap || minimap.querySelector('.minimap-titlebar')) return;
      minimap.classList.add('has-titlebar');

      const titlebar = document.createElement('div');
      titlebar.className = 'minimap-titlebar';
      titlebar.innerHTML = `
        <span class="minimap-titlebar__drag"></span>
        <span class="minimap-titlebar__actions">
          <button class="minimap-btn minimap-btn--minimize" title="收缩">−</button>
          <button class="minimap-btn minimap-btn--close" title="关闭">×</button>
        </span>
      `;
      minimap.insertBefore(titlebar, minimap.firstChild);

      // 收缩/展开
      const minimizeBtn = titlebar.querySelector('.minimap-btn--minimize') as HTMLElement;
      let minimized = false;
      minimizeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        minimized = !minimized;
        let sibling = titlebar.nextElementSibling as HTMLElement;
        while (sibling) {
          sibling.style.display = minimized ? 'none' : '';
          sibling = sibling.nextElementSibling as HTMLElement;
        }
        minimizeBtn.textContent = minimized ? '+' : '−';
        minimap.style.maxHeight = minimized ? '22px' : '200px';
      });

      // 关闭
      const closeBtn = titlebar.querySelector('.minimap-btn--close') as HTMLElement;
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const m = processDesignerRef.value?.getModeler?.();
        if (m) {
          try { m.get('minimap').toggle(false); } catch (_) {}
        } else {
          minimap.style.display = 'none';
        }
      });

      // 拖动
      let isDragging = false, startX = 0, startY = 0, origX = 0, origY = 0;
      titlebar.addEventListener('mousedown', (e) => {
        if ((e.target as HTMLElement).closest('.minimap-btn')) return;
        isDragging = true;
        startX = e.clientX; startY = e.clientY;
        const rect = minimap.getBoundingClientRect();
        const parent = (minimap.offsetParent || document.body).getBoundingClientRect();
        origX = rect.left - parent.left; origY = rect.top - parent.top;
        e.preventDefault();
      });
      document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        minimap.style.position = 'absolute';
        minimap.style.left = (origX + e.clientX - startX) + 'px';
        minimap.style.top = (origY + e.clientY - startY) + 'px';
        minimap.style.right = 'auto';
        minimap.style.bottom = 'auto';
      });
      document.addEventListener('mouseup', () => { isDragging = false; });
    }, 1000);
  });
});
</script>

<style lang="scss">
.bpmn-designer-example {
  padding: 16px;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}
.page-header h3 {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 4px 0;
}
.page-desc {
  color: #999;
  font-size: 13px;
  margin: 0;
}
.bpmn-designer-wrapper {
  width: 100%;
  height: calc(100vh - 260px);
  min-height: 500px;
  overflow: hidden;
  background-color: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
}

/* 小地图样式 */
.djs-minimap {
  box-shadow: 0 1px 4px 0 rgba(0, 0, 0, 0.25);
  border: none;
  background-color: #fff;
  border-radius: 4px;
  overflow: hidden;
  width: 260px !important;
  height: auto !important;
  max-height: 200px;
  padding-top: 0;
}
.djs-minimap > .map {
  width: 260px !important;
  height: 150px !important;
  overflow: hidden;
  position: relative;
}
.minimap-titlebar {
  height: 22px;
  background: #f5f5f5;
  border-bottom: 1px solid #e8e8e8;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px;
  cursor: move;
  user-select: none;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 30;
}
.minimap-titlebar__drag { flex: 1; height: 100%; }
.minimap-titlebar__actions {
  display: flex;
  gap: 2px;
}
.minimap-btn {
  width: 16px; height: 16px; border: none; background: transparent;
  cursor: pointer; font-size: 14px; line-height: 1; color: #999;
  border-radius: 2px; display: flex; align-items: center;
  justify-content: center; padding: 0; position: relative; z-index: 31;
}
.minimap-btn:hover { background: #e0e0e0; color: #333; }
.djs-minimap .viewport-dom { z-index: 8; }
.djs-minimap.open .overlay { z-index: 7; }
.djs-minimap.has-titlebar > .map { margin-top: 22px; position: relative; }
.djs-minimap.has-titlebar .viewport-dom { top: 22px !important; transform: none !important; }
.djs-minimap.has-titlebar.open .overlay { top: 22px !important; }
.djs-minimap:not(.open) { display: none !important; }
</style>
