// API stub
export interface ProcessListenerVO { id?: number; name?: string; type?: string; status?: number; [k: string]: any }
export const ProcessListenerApi = {
  getProcessListenerPage: async (params: any) => ({ list: [] as ProcessListenerVO[], total: 0 }),
  getProcessListener: async (id: any) => ({} as ProcessListenerVO),
  createProcessListener: async (data: any) => ({}),
  updateProcessListener: async (data: any) => ({}),
  deleteProcessListener: async (id: any) => ({})
}
