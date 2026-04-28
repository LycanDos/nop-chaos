// API stub
export interface ApprovalNodeInfo { id?: string; [k: string]: any }
export const getProcessInstancePage = async (params: any) => ({ list: [], total: 0 })
export const getProcessInstance = async (id: any) => ({})
export const createProcessInstance = async (data: any) => ({})
export const cancelProcessInstance = async (id: any, reason?: string) => ({})
export default { getProcessInstancePage, getProcessInstance, createProcessInstance, cancelProcessInstance }
