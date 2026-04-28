// API stub
export interface ProcessExpressionVO { id?: number; name?: string; expression?: string; status?: number; [k: string]: any }
export const ProcessExpressionApi = {
  getProcessExpressionPage: async (params: any) => ({ list: [] as ProcessExpressionVO[], total: 0 }),
  getProcessExpression: async (id: any) => ({} as ProcessExpressionVO),
  createProcessExpression: async (data: any) => ({}),
  updateProcessExpression: async (data: any) => ({}),
  deleteProcessExpression: async (id: any) => ({})
}
