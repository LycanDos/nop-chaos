/**
 * 运行时视图数据模型与数据提供层
 * 统一数据接口，支持示例数据（默认）和后端 GraphQL 查询两种模式
 */
import { ajaxRequest } from '@nop-chaos/sdk'

/* ========== 类型定义 ========== */

export type ElementRuntimeStatus = 'completed' | 'active' | 'failed' | 'rejected' | 'killed' | 'pending'

export interface ElementState {
  elementId: string
  status: ElementRuntimeStatus
  execIndex?: number
}

export interface ActionRecord {
  actionName: string
  actorName: string
  actionTime: string
  comment?: string
}

export interface LogEntry {
  logTime: string
  logLevel: string
  logContent: string
}

export interface StepRuntimeInfo {
  elementId: string
  stepId?: string
  displayName: string
  status: ElementRuntimeStatus
  actorName?: string
  startTime?: string
  endTime?: string
  stepType?: string
  execIndex?: number
  actions: ActionRecord[]
  logs: LogEntry[]
}

export interface InstanceInfo {
  wfId: string
  wfName: string
  status: string
  startTime: string
  endTime?: string
  bizKey?: string
}

export interface RuntimeViewerViewModel {
  bpmnXml: string
  instanceInfo: InstanceInfo
  elementStates: ElementState[]
  stepRuntimeMap: Map<string, StepRuntimeInfo>
  logs: LogEntry[]
}

/* ========== 数据获取 ========== */

/**
 * 从后端 GraphQL 查询运行时数据
 */
export async function fetchRuntimeData(wfId: string): Promise<RuntimeViewerViewModel> {
  // 1. 查询流程实例
  const instanceRes = await ajaxRequest({
    url: '/graphql',
    data: {
      query: `query($id:String!) {
        NopWfInstance__get(id:$id) {
          wfId wfName wfVersion status createdTime finishedTime bizKey
          flowDefId
        }
      }`,
      variables: { id: wfId },
    },
  })
  const instance = instanceRes?.NopWfInstance__get
  if (!instance) {
    throw new Error(`流程实例 ${wfId} 不存在`)
  }

  // 2. 查询流程定义获取 BPMN XML
  const defRes = await ajaxRequest({
    url: '/graphql',
    data: {
      query: `query($id:String!) {
        NopWfDefinition__get(id:$id) {
          diagram
        }
      }`,
      variables: { id: instance.flowDefId },
    },
  })
  const bpmnXml = defRes?.NopWfDefinition__get?.diagram || ''

  // 3. 查询步骤实例
  const stepsRes = await ajaxRequest({
    url: '/graphql',
    data: {
      query: `query($wfId:String!) {
        NopWfStepInstance__findList(
          filter: { wfId: $wfId }
          orderBy: [{field: "execOrder", desc: false}]
        ) {
          stepId stepName displayName status groupIdx
          actorId actorName
          createdTime finishedTime
          execOrder stepType
        }
      }`,
      variables: { wfId },
    },
  })
  const steps = stepsRes?.NopWfStepInstance__findList || []

  // 4. 查询动作历史
  const actionsRes = await ajaxRequest({
    url: '/graphql',
    data: {
      query: `query($wfId:String!) {
        NopWfAction__findList(
          filter: { wfId: $wfId }
          orderBy: [{field: "actionTime", desc: false}]
        ) {
          actionName actorName actionTime comment stepId
        }
      }`,
      variables: { wfId },
    },
  })
  const actions = actionsRes?.NopWfAction__findList || []

  // 5. 查询日志
  const logsRes = await ajaxRequest({
    url: '/graphql',
    data: {
      query: `query($wfId:String!) {
        NopWfLog__findList(
          filter: { wfId: $wfId }
          orderBy: [{field: "logTime", desc: false}]
        ) {
          logTime logLevel logContent stepId
        }
      }`,
      variables: { wfId },
    },
  })
  const logs = logsRes?.NopWfLog__findList || []

  // 6. 组装视图模型
  return buildViewModel({ instance, bpmnXml, steps, actions, logs })
}

/* ========== 视图模型组装 ========== */

function buildViewModel(data: {
  instance: any
  bpmnXml: string
  steps: any[]
  actions: any[]
  logs: any[]
}): RuntimeViewerViewModel {
  const { instance, bpmnXml, steps, actions, logs } = data

  // 状态映射：nop-wf 状态值 → 视图状态
  function mapStatus(stepStatus: number): ElementRuntimeStatus {
    if (stepStatus >= 40 && stepStatus < 60) return 'completed'
    if (stepStatus === 30 || stepStatus === 35) return 'active'
    if (stepStatus === 60) return 'failed'
    if (stepStatus === 90) return 'rejected'
    if (stepStatus === 70) return 'killed'
    return 'pending'
  }

  const elementStates: ElementState[] = []
  const stepRuntimeMap = new Map<string, StepRuntimeInfo>()

  for (const step of steps) {
    const status = mapStatus(step.status)
    // 步骤实例的 stepName 对应 BPMN 元素 ID
    const elementId = step.stepName || step.stepId
    elementStates.push({
      elementId,
      status,
      execIndex: step.execOrder,
    })

    // 按 stepId 分组动作
    const stepActions = actions.filter((a: any) => a.stepId === step.stepId)
    // 按 stepId 分组日志
    const stepLogs = logs.filter((l: any) => l.stepId === step.stepId)

    stepRuntimeMap.set(elementId, {
      elementId,
      stepId: step.stepId,
      displayName: step.displayName || step.stepName,
      status,
      actorName: step.actorName,
      startTime: step.createdTime,
      endTime: step.finishedTime,
      stepType: step.stepType,
      execIndex: step.execOrder,
      actions: stepActions.map((a: any) => ({
        actionName: a.actionName,
        actorName: a.actorName,
        actionTime: a.actionTime,
        comment: a.comment,
      })),
      logs: stepLogs.map((l: any) => ({
        logTime: l.logTime,
        logLevel: l.logLevel,
        logContent: l.logContent,
      })),
    })
  }

  return {
    bpmnXml,
    instanceInfo: {
      wfId: instance.wfId,
      wfName: instance.wfName,
      status: instance.status,
      startTime: instance.createdTime,
      endTime: instance.finishedTime,
      bizKey: instance.bizKey,
    },
    elementStates,
    stepRuntimeMap,
    logs: logs.map((l: any) => ({
      logTime: l.logTime,
      logLevel: l.logLevel,
      logContent: l.logContent,
    })),
  }
}

/* ========== 示例数据 ========== */

const DEMO_BPMN_XML = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  id="def-leave" targetNamespace="http://nop.workflow/demo">

  <process id="leaveProcess" name="请假审批流程" isExecutable="true">
    <startEvent id="StartEvent_1" name="开始" />
    <sequenceFlow id="Flow_start_apply" sourceRef="StartEvent_1" targetRef="Task_apply" />
    <userTask id="Task_apply" name="提交申请" />
    <sequenceFlow id="Flow_apply_dept" sourceRef="Task_apply" targetRef="Task_dept" />
    <userTask id="Task_dept" name="部门经理审批" />
    <sequenceFlow id="Flow_dept_gateway" sourceRef="Task_dept" targetRef="Gateway_days" />
    <exclusiveGateway id="Gateway_days" name="天数判断" />
    <sequenceFlow id="Flow_gateway_hr" sourceRef="Gateway_days" targetRef="Task_hr">
      <conditionExpression xsi:type="tFormalExpression">&lt;= 3</conditionExpression>
    </sequenceFlow>
    <sequenceFlow id="Flow_gateway_gm" sourceRef="Gateway_days" targetRef="Task_gm">
      <conditionExpression xsi:type="tFormalExpression">&gt; 3</conditionExpression>
    </sequenceFlow>
    <userTask id="Task_hr" name="HR审批" />
    <userTask id="Task_gm" name="总经理审批" />
    <sequenceFlow id="Flow_hr_parallel" sourceRef="Task_hr" targetRef="Gateway_parallel" />
    <sequenceFlow id="Flow_gm_parallel" sourceRef="Task_gm" targetRef="Gateway_parallel" />
    <parallelGateway id="Gateway_parallel" name="汇聚" />
    <sequenceFlow id="Flow_parallel_notify" sourceRef="Gateway_parallel" targetRef="Task_notify" />
    <serviceTask id="Task_notify" name="通知结果" />
    <sequenceFlow id="Flow_notify_end" sourceRef="Task_notify" targetRef="EndEvent_1" />
    <endEvent id="EndEvent_1" name="结束" />
  </process>

  <bpmndi:BPMNDiagram id="diagram_leave">
    <bpmndi:BPMNPlane id="plane_leave" bpmnElement="leaveProcess">
      <bpmndi:BPMNShape id="shape_StartEvent_1" bpmnElement="StartEvent_1">
        <dc:Bounds x="100" y="200" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="shape_Task_apply" bpmnElement="Task_apply">
        <dc:Bounds x="180" y="178" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="shape_Task_dept" bpmnElement="Task_dept">
        <dc:Bounds x="340" y="178" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="shape_Gateway_days" bpmnElement="Gateway_days">
        <dc:Bounds x="500" y="190" width="50" height="50" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="shape_Task_hr" bpmnElement="Task_hr">
        <dc:Bounds x="610" y="120" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="shape_Task_gm" bpmnElement="Task_gm">
        <dc:Bounds x="610" y="260" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="shape_Gateway_parallel" bpmnElement="Gateway_parallel">
        <dc:Bounds x="770" y="190" width="50" height="50" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="shape_Task_notify" bpmnElement="Task_notify">
        <dc:Bounds x="880" y="178" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="shape_EndEvent_1" bpmnElement="EndEvent_1">
        <dc:Bounds x="1040" y="200" width="36" height="36" />
      </bpmndi:BPMNShape>

      <bpmndi:BPMNEdge id="edge_start_apply" bpmnElement="Flow_start_apply">
        <di:waypoint x="136" y="218" />
        <di:waypoint x="180" y="218" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="edge_apply_dept" bpmnElement="Flow_apply_dept">
        <di:waypoint x="280" y="218" />
        <di:waypoint x="340" y="218" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="edge_dept_gateway" bpmnElement="Flow_dept_gateway">
        <di:waypoint x="440" y="218" />
        <di:waypoint x="500" y="218" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="edge_gateway_hr" bpmnElement="Flow_gateway_hr">
        <di:waypoint x="525" y="190" />
        <di:waypoint x="525" y="160" />
        <di:waypoint x="610" y="160" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="edge_gateway_gm" bpmnElement="Flow_gateway_gm">
        <di:waypoint x="525" y="240" />
        <di:waypoint x="525" y="300" />
        <di:waypoint x="610" y="300" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="edge_hr_parallel" bpmnElement="Flow_hr_parallel">
        <di:waypoint x="710" y="160" />
        <di:waypoint x="795" y="160" />
        <di:waypoint x="795" y="190" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="edge_gm_parallel" bpmnElement="Flow_gm_parallel">
        <di:waypoint x="710" y="300" />
        <di:waypoint x="795" y="300" />
        <di:waypoint x="795" y="240" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="edge_parallel_notify" bpmnElement="Flow_parallel_notify">
        <di:waypoint x="820" y="218" />
        <di:waypoint x="880" y="218" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="edge_notify_end" bpmnElement="Flow_notify_end">
        <di:waypoint x="980" y="218" />
        <di:waypoint x="1040" y="218" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>`

export const demoData: RuntimeViewerViewModel = {
  bpmnXml: DEMO_BPMN_XML,
  instanceInfo: {
    wfId: 'demo-001',
    wfName: 'leaveProcess',
    status: 'ACTIVATED',
    startTime: '2026-05-10 09:00:00',
    bizKey: 'LEAVE-2026-001',
  },
  elementStates: [
    { elementId: 'StartEvent_1', status: 'completed', execIndex: 0 },
    { elementId: 'Flow_start_apply', status: 'completed' },
    { elementId: 'Task_apply', status: 'completed', execIndex: 1 },
    { elementId: 'Flow_apply_dept', status: 'completed' },
    { elementId: 'Task_dept', status: 'active', execIndex: 2 },
    { elementId: 'Gateway_days', status: 'pending' },
    { elementId: 'Flow_dept_gateway', status: 'completed' },
    { elementId: 'Flow_gateway_hr', status: 'pending' },
    { elementId: 'Flow_gateway_gm', status: 'pending' },
    { elementId: 'Task_hr', status: 'pending' },
    { elementId: 'Task_gm', status: 'pending' },
    { elementId: 'Gateway_parallel', status: 'pending' },
    { elementId: 'Flow_hr_parallel', status: 'pending' },
    { elementId: 'Flow_gm_parallel', status: 'pending' },
    { elementId: 'Flow_parallel_notify', status: 'pending' },
    { elementId: 'Task_notify', status: 'pending' },
    { elementId: 'Flow_notify_end', status: 'pending' },
    { elementId: 'EndEvent_1', status: 'pending' },
  ],
  stepRuntimeMap: new Map([
    [
      'StartEvent_1',
      {
        elementId: 'StartEvent_1',
        displayName: '开始',
        status: 'completed',
        startTime: '2026-05-10 09:00:00',
        endTime: '2026-05-10 09:00:00',
        stepType: 'startEvent',
        execIndex: 0,
        actions: [],
        logs: [
          { logTime: '2026-05-10 09:00:00', logLevel: 'INFO', logContent: '流程实例已启动' },
          { logTime: '2026-05-10 09:00:00', logLevel: 'INFO', logContent: '开始事件已触发' },
        ],
      },
    ],
    [
      'Task_apply',
      {
        elementId: 'Task_apply',
        displayName: '提交申请',
        status: 'completed',
        actorName: '张三',
        startTime: '2026-05-10 09:00:00',
        endTime: '2026-05-10 09:05:00',
        stepType: 'userTask',
        execIndex: 1,
        actions: [
          { actionName: 'approve', actorName: '张三', actionTime: '2026-05-10 09:05:00', comment: '申请提交完成' },
        ],
        logs: [
          { logTime: '2026-05-10 09:00:00', logLevel: 'INFO', logContent: '节点已激活，处理人: 张三' },
          { logTime: '2026-05-10 09:05:00', logLevel: 'INFO', logContent: '执行动作 [approve]，操作人: 张三' },
          { logTime: '2026-05-10 09:05:00', logLevel: 'INFO', logContent: '节点已完成' },
        ],
      },
    ],
    [
      'Task_dept',
      {
        elementId: 'Task_dept',
        displayName: '部门经理审批',
        status: 'active',
        actorName: '李四',
        startTime: '2026-05-10 09:05:00',
        stepType: 'userTask',
        execIndex: 2,
        actions: [],
        logs: [
          { logTime: '2026-05-10 09:05:00', logLevel: 'INFO', logContent: '节点已激活，处理人: 李四' },
          { logTime: '2026-05-10 09:05:00', logLevel: 'INFO', logContent: '等待处理中...' },
        ],
      },
    ],
  ]),
  logs: [
    { logTime: '2026-05-10 09:00:00', logLevel: 'INFO', logContent: '流程实例 [leaveProcess] 已启动' },
    { logTime: '2026-05-10 09:00:00', logLevel: 'INFO', logContent: '节点 [开始] 已激活' },
    { logTime: '2026-05-10 09:00:00', logLevel: 'INFO', logContent: '节点 [开始] 已完成' },
    { logTime: '2026-05-10 09:00:00', logLevel: 'INFO', logContent: '节点 [提交申请] 已激活，处理人: 张三' },
    { logTime: '2026-05-10 09:05:00', logLevel: 'INFO', logContent: '执行动作 [approve] on 节点 [Task_apply]，操作人: 张三' },
    { logTime: '2026-05-10 09:05:00', logLevel: 'INFO', logContent: '节点 [提交申请] 已完成' },
    { logTime: '2026-05-10 09:05:00', logLevel: 'INFO', logContent: '节点 [部门经理审批] 已激活，处理人: 李四' },
    { logTime: '2026-05-10 09:05:00', logLevel: 'INFO', logContent: '→ 当前执行中...' },
  ],
}
