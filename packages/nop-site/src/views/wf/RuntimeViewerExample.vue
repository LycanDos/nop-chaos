<template>
  <div class="runtime-example-page">
    <ContentWrap>
      <div class="page-header">
        <div>
          <h3>工作流运行时示例</h3>
          <p class="page-desc">基于 Flowable BPMN 示例流程的运行时视图演示，展示各状态节点颜色、进度条、徽章及侧边详情面板</p>
        </div>
        <a-select v-model:value="selectedExample" @change="switchExample" style="width:220px">
          <a-select-option value="purchase">采购订单审批</a-select-option>
          <a-select-option value="leave">请假审批流程</a-select-option>
        </a-select>
      </div>
    </ContentWrap>
    <ContentWrap>
      <RuntimeViewer
        :model-value="runtimeData"
        height="calc(100vh - 260px)"
      />
    </ContentWrap>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import RuntimeViewer from './RuntimeViewer.vue'
import type { RuntimeViewerViewModel, ElementState, StepRuntimeInfo, InstanceInfo, LogEntry } from './RuntimeDataProvider'

defineOptions({ name: 'WfRuntimeViewerExample' })

const selectedExample = ref('purchase')
const runtimeData = ref<RuntimeViewerViewModel>(createPurchaseExample())

function switchExample(val: string) {
  runtimeData.value = val === 'leave' ? createLeaveExample() : createPurchaseExample()
}

/* ========== 采购订单审批 ========== */
function createPurchaseExample(): RuntimeViewerViewModel {
  const bpmnXml = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  id="def-purchase" targetNamespace="http://flowable/demo">
  <process id="purchaseOrder" name="采购订单审批" isExecutable="true">
    <startEvent id="startEvent" name="开始" />
    <sequenceFlow id="flow_start_apply" sourceRef="startEvent" targetRef="applyTask" />
    <userTask id="applyTask" name="提交采购申请" />
    <sequenceFlow id="flow_apply_mgr" sourceRef="applyTask" targetRef="mgrTask" />
    <userTask id="mgrTask" name="部门经理审批" />
    <sequenceFlow id="flow_mgr_gateway" sourceRef="mgrTask" targetRef="amountGateway" />
    <exclusiveGateway id="amountGateway" name="金额判断" />
    <sequenceFlow id="flow_gateway_finance" sourceRef="amountGateway" targetRef="financeTask">
      <conditionExpression xsi:type="tFormalExpression">&lt;= 50000</conditionExpression>
    </sequenceFlow>
    <sequenceFlow id="flow_gateway_gm" sourceRef="amountGateway" targetRef="gmTask">
      <conditionExpression xsi:type="tFormalExpression">&gt; 50000</conditionExpression>
    </sequenceFlow>
    <userTask id="financeTask" name="财务审核" />
    <userTask id="gmTask" name="总经理审批" />
    <sequenceFlow id="flow_finance_gm" sourceRef="financeTask" targetRef="gmTask2" />
    <userTask id="gmTask2" name="总经理确认" />
    <sequenceFlow id="flow_finance_parallel" sourceRef="gmTask" targetRef="parallelGateway" />
    <sequenceFlow id="flow_gm2_parallel" sourceRef="gmTask2" targetRef="parallelGateway" />
    <parallelGateway id="parallelGateway" name="汇聚" />
    <sequenceFlow id="flow_parallel_notify" sourceRef="parallelGateway" targetRef="notifyTask" />
    <serviceTask id="notifyTask" name="通知结果" />
    <sequenceFlow id="flow_notify_end" sourceRef="notifyTask" targetRef="endEvent" />
    <endEvent id="endEvent" name="结束" />
  </process>
  <bpmndi:BPMNDiagram id="diagram_purchase">
    <bpmndi:BPMNPlane id="plane_purchase" bpmnElement="purchaseOrder">
      <bpmndi:BPMNShape id="shape_start" bpmnElement="startEvent"><dc:Bounds x="60" y="200" width="36" height="36" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="shape_apply" bpmnElement="applyTask"><dc:Bounds x="140" y="178" width="100" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="shape_mgr" bpmnElement="mgrTask"><dc:Bounds x="290" y="178" width="100" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="shape_amount" bpmnElement="amountGateway"><dc:Bounds x="440" y="190" width="50" height="50" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="shape_finance" bpmnElement="financeTask"><dc:Bounds x="550" y="120" width="100" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="shape_gm" bpmnElement="gmTask"><dc:Bounds x="550" y="260" width="100" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="shape_gm2" bpmnElement="gmTask2"><dc:Bounds x="700" y="120" width="100" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="shape_parallel" bpmnElement="parallelGateway"><dc:Bounds x="710" y="250" width="50" height="50" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="shape_notify" bpmnElement="notifyTask"><dc:Bounds x="830" y="178" width="100" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="shape_end" bpmnElement="endEvent"><dc:Bounds x="980" y="200" width="36" height="36" /></bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="edge_start_apply" bpmnElement="flow_start_apply"><di:waypoint x="96" y="218" /><di:waypoint x="140" y="218" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="edge_apply_mgr" bpmnElement="flow_apply_mgr"><di:waypoint x="240" y="218" /><di:waypoint x="290" y="218" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="edge_mgr_gateway" bpmnElement="flow_mgr_gateway"><di:waypoint x="390" y="218" /><di:waypoint x="440" y="218" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="edge_gateway_finance" bpmnElement="flow_gateway_finance"><di:waypoint x="465" y="190" /><di:waypoint x="465" y="160" /><di:waypoint x="550" y="160" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="edge_gateway_gm" bpmnElement="flow_gateway_gm"><di:waypoint x="465" y="240" /><di:waypoint x="465" y="300" /><di:waypoint x="550" y="300" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="edge_finance_gm2" bpmnElement="flow_finance_gm"><di:waypoint x="650" y="160" /><di:waypoint x="700" y="160" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="edge_gm_parallel" bpmnElement="flow_gm_parallel"><di:waypoint x="650" y="300" /><di:waypoint x="735" y="300" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="edge_gm2_parallel" bpmnElement="flow_gm2_parallel"><di:waypoint x="800" y="160" /><di:waypoint x="735" y="160" /><di:waypoint x="735" y="250" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="edge_parallel_notify" bpmnElement="flow_parallel_notify"><di:waypoint x="760" y="275" /><di:waypoint x="760" y="218" /><di:waypoint x="830" y="218" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="edge_notify_end" bpmnElement="flow_notify_end"><di:waypoint x="930" y="218" /><di:waypoint x="980" y="218" /></bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>`

  const instanceInfo: InstanceInfo = {
    wfId: 'PO-2026-0042',
    wfName: '采购订单审批',
    status: 'ACTIVATED',
    startTime: '2026-05-12 14:30:00',
    bizKey: 'PO-2026-0042',
  }

  const elementStates: ElementState[] = [
    { elementId: 'startEvent', status: 'completed', execIndex: 0 },
    { elementId: 'flow_start_apply', status: 'completed' },
    { elementId: 'applyTask', status: 'completed', execIndex: 1 },
    { elementId: 'flow_apply_mgr', status: 'completed' },
    { elementId: 'mgrTask', status: 'completed', execIndex: 2 },
    { elementId: 'flow_mgr_gateway', status: 'completed' },
    { elementId: 'amountGateway', status: 'completed' },
    { elementId: 'flow_gateway_finance', status: 'completed' },
    { elementId: 'financeTask', status: 'active', execIndex: 3 },
    { elementId: 'flow_gateway_gm', status: 'pending' },
    { elementId: 'gmTask', status: 'pending' },
    { elementId: 'flow_finance_gm2', status: 'pending' },
    { elementId: 'gmTask2', status: 'pending' },
    { elementId: 'flow_gm_parallel', status: 'pending' },
    { elementId: 'flow_gm2_parallel', status: 'pending' },
    { elementId: 'parallelGateway', status: 'pending' },
    { elementId: 'flow_parallel_notify', status: 'pending' },
    { elementId: 'notifyTask', status: 'pending' },
    { elementId: 'flow_notify_end', status: 'pending' },
    { elementId: 'endEvent', status: 'pending' },
  ]

  const stepRuntimeMap = new Map<string, StepRuntimeInfo>()
  stepRuntimeMap.set('startEvent', {
    elementId: 'startEvent', displayName: '开始', status: 'completed',
    startTime: '2026-05-12 14:30:00', endTime: '2026-05-12 14:30:00',
    stepType: 'startEvent', execIndex: 0, actions: [], logs: [
      { logTime: '2026-05-12 14:30:00', logLevel: 'INFO', logContent: '流程实例已启动' },
    ],
  })
  stepRuntimeMap.set('applyTask', {
    elementId: 'applyTask', displayName: '提交采购申请', status: 'completed',
    actorName: '王采购', startTime: '2026-05-12 14:30:00', endTime: '2026-05-12 15:10:00',
    stepType: 'userTask', execIndex: 1, actions: [
      { actionName: 'complete', actorName: '王采购', actionTime: '2026-05-12 15:10:00', comment: '采购笔记本电脑 x 10台，预算 ¥45,000' },
    ], logs: [
      { logTime: '2026-05-12 14:30:00', logLevel: 'INFO', logContent: '节点已激活，处理人: 王采购' },
      { logTime: '2026-05-12 15:10:00', logLevel: 'INFO', logContent: '提交采购申请完成' },
    ],
  })
  stepRuntimeMap.set('mgrTask', {
    elementId: 'mgrTask', displayName: '部门经理审批', status: 'completed',
    actorName: '李经理', startTime: '2026-05-12 15:10:00', endTime: '2026-05-12 16:30:00',
    stepType: 'userTask', execIndex: 2, actions: [
      { actionName: 'approve', actorName: '李经理', actionTime: '2026-05-12 16:30:00', comment: '同意采购，请财务审核' },
    ], logs: [
      { logTime: '2026-05-12 15:10:00', logLevel: 'INFO', logContent: '节点已激活，处理人: 李经理' },
      { logTime: '2026-05-12 16:30:00', logLevel: 'INFO', logContent: '审批通过' },
    ],
  })
  stepRuntimeMap.set('financeTask', {
    elementId: 'financeTask', displayName: '财务审核', status: 'active',
    actorName: '赵财务', startTime: '2026-05-12 16:30:00',
    stepType: 'userTask', execIndex: 3, actions: [], logs: [
      { logTime: '2026-05-12 16:30:00', logLevel: 'INFO', logContent: '节点已激活，处理人: 赵财务' },
      { logTime: '2026-05-12 16:30:00', logLevel: 'INFO', logContent: '等待财务审核中...' },
    ],
  })

  return { bpmnXml, instanceInfo, elementStates, stepRuntimeMap, logs: [] }
}

/* ========== 请假审批（复杂含驳回） ========== */
function createLeaveExample(): RuntimeViewerViewModel {
  const bpmnXml = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  id="def-leave" targetNamespace="http://flowable/demo">
  <process id="leaveProcess" name="请假审批" isExecutable="true">
    <startEvent id="leaveStart" name="开始" />
    <sequenceFlow id="ls_apply" sourceRef="leaveStart" targetRef="leaveApply" />
    <userTask id="leaveApply" name="提交请假申请" />
    <sequenceFlow id="la_dept" sourceRef="leaveApply" targetRef="deptApprove" />
    <userTask id="deptApprove" name="部门经理审批" />
    <sequenceFlow id="ld_hr" sourceRef="deptApprove" targetRef="hrApprove" />
    <userTask id="hrApprove" name="HR确认" />
    <sequenceFlow id="lh_end" sourceRef="hrApprove" targetRef="leaveEnd" />
    <endEvent id="leaveEnd" name="结束" />
    <!-- 驳回线 -->
    <sequenceFlow id="ld_reject" sourceRef="deptApprove" targetRef="leaveApply">
      <conditionExpression xsi:type="tFormalExpression">${'$'}{rejected}</conditionExpression>
    </sequenceFlow>
  </process>
  <bpmndi:BPMNDiagram id="diagram_leave">
    <bpmndi:BPMNPlane id="plane_leave" bpmnElement="leaveProcess">
      <bpmndi:BPMNShape id="s_ls" bpmnElement="leaveStart"><dc:Bounds x="80" y="180" width="36" height="36" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="s_la" bpmnElement="leaveApply"><dc:Bounds x="160" y="158" width="100" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="s_da" bpmnElement="deptApprove"><dc:Bounds x="320" y="158" width="100" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="s_ha" bpmnElement="hrApprove"><dc:Bounds x="480" y="158" width="100" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="s_le" bpmnElement="leaveEnd"><dc:Bounds x="640" y="180" width="36" height="36" /></bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="e_ls_la" bpmnElement="ls_apply"><di:waypoint x="116" y="198" /><di:waypoint x="160" y="198" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="e_la_da" bpmnElement="la_dept"><di:waypoint x="260" y="198" /><di:waypoint x="320" y="198" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="e_da_ha" bpmnElement="ld_hr"><di:waypoint x="420" y="198" /><di:waypoint x="480" y="198" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="e_ha_le" bpmnElement="lh_end"><di:waypoint x="580" y="198" /><di:waypoint x="640" y="198" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="e_da_la_reject" bpmnElement="ld_reject"><di:waypoint x="370" y="238" /><di:waypoint x="370" y="280" /><di:waypoint x="210" y="280" /><di:waypoint x="210" y="238" /></bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>`

  const instanceInfo: InstanceInfo = {
    wfId: 'LEAVE-2026-0088',
    wfName: '请假审批',
    status: 'COMPLETED',
    startTime: '2026-05-09 09:00:00',
    endTime: '2026-05-09 17:30:00',
    bizKey: 'LEAVE-2026-0088',
  }

  const elementStates: ElementState[] = [
    { elementId: 'leaveStart', status: 'completed', execIndex: 0 },
    { elementId: 'ls_apply', status: 'completed' },
    { elementId: 'leaveApply', status: 'completed', execIndex: 1 },
    { elementId: 'la_dept', status: 'completed' },
    { elementId: 'deptApprove', status: 'completed', execIndex: 2 },
    { elementId: 'ld_reject', status: 'completed' },
    { elementId: 'leaveApply', status: 'completed' }, // 重新提交的第二个令牌
    { elementId: 'la_dept', status: 'completed' },
    { elementId: 'deptApprove', status: 'completed', execIndex: 3 },
    { elementId: 'ld_hr', status: 'completed' },
    { elementId: 'hrApprove', status: 'completed', execIndex: 4 },
    { elementId: 'lh_end', status: 'completed' },
    { elementId: 'leaveEnd', status: 'completed', execIndex: 5 },
  ]

  const stepRuntimeMap = new Map<string, StepRuntimeInfo>()
  stepRuntimeMap.set('leaveStart', {
    elementId: 'leaveStart', displayName: '开始', status: 'completed',
    startTime: '2026-05-09 09:00:00', endTime: '2026-05-09 09:00:00',
    stepType: 'startEvent', execIndex: 0, actions: [], logs: [
      { logTime: '2026-05-09 09:00:00', logLevel: 'INFO', logContent: '流程实例已启动' },
    ],
  })
  stepRuntimeMap.set('leaveApply', {
    elementId: 'leaveApply', displayName: '提交请假申请', status: 'completed',
    actorName: '陈小明', startTime: '2026-05-09 09:00:00', endTime: '2026-05-09 15:20:00',
    stepType: 'userTask', execIndex: 1, actions: [
      { actionName: 'submit', actorName: '陈小明', actionTime: '2026-05-09 09:05:00', comment: '申请年假3天' },
      { actionName: 'resubmit', actorName: '陈小明', actionTime: '2026-05-09 15:20:00', comment: '已修改请假理由，重新提交' },
    ], logs: [
      { logTime: '2026-05-09 09:00:00', logLevel: 'INFO', logContent: '节点已激活' },
      { logTime: '2026-05-09 09:05:00', logLevel: 'INFO', logContent: '请假申请已提交' },
      { logTime: '2026-05-09 14:30:00', logLevel: 'WARN', logContent: '部门经理驳回了申请，退回到本节点' },
      { logTime: '2026-05-09 15:20:00', logLevel: 'INFO', logContent: '重新提交申请' },
    ],
  })
  stepRuntimeMap.set('deptApprove', {
    elementId: 'deptApprove', displayName: '部门经理审批', status: 'completed',
    actorName: '张经理', startTime: '2026-05-09 09:10:00', endTime: '2026-05-09 16:00:00',
    stepType: 'userTask', execIndex: 2, actions: [
      { actionName: 'reject', actorName: '张经理', actionTime: '2026-05-09 14:30:00', comment: '请假理由不充分，请补充' },
      { actionName: 'approve', actorName: '张经理', actionTime: '2026-05-09 16:00:00', comment: '同意请假' },
    ], logs: [
      { logTime: '2026-05-09 09:10:00', logLevel: 'INFO', logContent: '节点已激活，处理人: 张经理' },
      { logTime: '2026-05-09 14:30:00', logLevel: 'WARN', logContent: '驳回申请，退回至提交申请节点' },
      { logTime: '2026-05-09 15:25:00', logLevel: 'INFO', logContent: '节点再次激活（重新提交）' },
      { logTime: '2026-05-09 16:00:00', logLevel: 'INFO', logContent: '审批通过' },
    ],
  })
  stepRuntimeMap.set('hrApprove', {
    elementId: 'hrApprove', displayName: 'HR确认', status: 'completed',
    actorName: '刘HR', startTime: '2026-05-09 16:00:00', endTime: '2026-05-09 17:30:00',
    stepType: 'userTask', execIndex: 3, actions: [
      { actionName: 'confirm', actorName: '刘HR', actionTime: '2026-05-09 17:30:00', comment: '年假已登记' },
    ], logs: [
      { logTime: '2026-05-09 16:00:00', logLevel: 'INFO', logContent: '节点已激活，处理人: 刘HR' },
      { logTime: '2026-05-09 17:30:00', logLevel: 'INFO', logContent: 'HR确认完成' },
    ],
  })

  return { bpmnXml, instanceInfo, elementStates, stepRuntimeMap, logs: [] }
}
</script>

<style scoped>
.runtime-example-page {
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
</style>
