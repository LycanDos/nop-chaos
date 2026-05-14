<template>
  <div class="bpmn-designer-example">
    <ContentWrap>
      <div class="page-header">
        <div>
          <h3>BPMN 流程设计器示例</h3>
          <p class="page-desc">展示 bpmn-js 流程设计器的完整功能，包含节点编辑、属性配置、执行器绑定等</p>
        </div>
        <div class="header-actions">
          <el-select v-model="selectedExample" @change="switchExample" style="width:200px">
            <el-option label="采购审批流程" value="purchase" />
            <el-option label="请假审批流程" value="leave" />
            <el-option label="空白流程" value="empty" />
          </el-select>
        </div>
      </div>
    </ContentWrap>
    <ContentWrap>
      <div class="designer-container">
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
import { ref, computed } from 'vue'
import { ProcessDesigner } from 'bpmn-process-designer'
import { nopSiteExecutorApi } from '../api/bpmn/executorApi'

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
</script>

<style scoped>
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
.designer-container {
  height: calc(100vh - 260px);
  min-height: 500px;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  overflow: hidden;
}
</style>
