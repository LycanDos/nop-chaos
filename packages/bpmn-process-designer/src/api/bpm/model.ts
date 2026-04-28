// API stub
export interface ModelVO { id?: string; key?: string; name?: string; [k: string]: any }
export const getModel = async (id: any) => ({} as ModelVO)
export const getModelList = async () => [] as ModelVO[]
export const createModel = async (data: any) => ({})
export const updateModel = async (data: any) => ({})
export const deleteModel = async (id: any) => ({})
export const deployModel = async (id: any) => ({})
export const getModelPage = async (params: any) => ({ list: [], total: 0 })
