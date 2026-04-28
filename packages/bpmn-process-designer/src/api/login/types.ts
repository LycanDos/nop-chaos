// API stub
export interface LoginParams { username?: string; password?: string; [k: string]: any }
export interface LoginResult { token?: string; [k: string]: any }
export interface UserInfoResult { user?: any; roles?: string[]; permissions?: string[]; [k: string]: any }
