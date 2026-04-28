// API stub
export interface DeptVO { id?: number; name?: string; parentId?: number; [k: string]: any }
export const getDeptPage = async (params: any) => ({ list: [] as DeptVO[], total: 0 })
export const getDept = async (id: any) => ({} as DeptVO)
export const getDeptList = async () => [] as DeptVO[]
export const getSimpleDeptList = async () => [] as DeptVO[]
export default { getDeptPage, getDept, getDeptList, getSimpleDeptList }
