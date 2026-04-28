// API stub
export enum TaskStatusEnum { PENDING = 1, RUNNING = 2, APPROVE = 3, REJECT = 4, CANCEL = 5 }
export const getTaskPage = async (params: any) => ({ list: [], total: 0 })
export const getTaskDonePage = async (params: any) => ({ list: [], total: 0 })
export const approveTask = async (data: any) => ({})
export const rejectTask = async (data: any) => ({})
export default { getTaskPage, getTaskDonePage, approveTask, rejectTask, TaskStatusEnum }
