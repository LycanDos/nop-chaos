// API stub
export interface UserVO { id?: number; username?: string; nickname?: string; [k: string]: any }
export const getUserPage = async (params: any) => ({ list: [] as UserVO[], total: 0 })
export const getUser = async (id: any) => ({} as UserVO)
export const getUserList = async () => [] as UserVO[]
export const getSimpleUserList = async () => [] as UserVO[]
export default { getUserPage, getUser, getUserList, getSimpleUserList }
