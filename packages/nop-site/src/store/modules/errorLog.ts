import type { ErrorLogInfo } from '/#/store';

import { defineStore } from 'pinia';
import { store } from '/@/store';

import { formatToDateTime } from '/@/utils/dateUtil';
import projectSetting from '/@/settings/projectSetting';

import { ErrorTypeEnum } from '/@/enums/exceptionEnum';
import { errorReportTransport } from '/@/api/sys/errorReportTransport';
import { getToken, getTenantId } from '/@/utils/auth';
import { router } from '/@/router';

export interface ErrorLogState {
  errorLogInfoList: Nullable<ErrorLogInfo[]>;
  errorLogListCount: number;
}

export const useErrorLogStore = defineStore({
  id: 'app-error-log',
  state: (): ErrorLogState => ({
    errorLogInfoList: null,
    errorLogListCount: 0,
  }),
  getters: {
    getErrorLogInfoList(): ErrorLogInfo[] {
      return this.errorLogInfoList || [];
    },
    getErrorLogListCount(): number {
      return this.errorLogListCount;
    },
  },
  actions: {
    addErrorLogInfo(info: ErrorLogInfo) {
      const item = {
        ...info,
        time: formatToDateTime(new Date()),
      };
      this.errorLogInfoList = [item, ...(this.errorLogInfoList || [])];
      this.errorLogListCount += 1;

      // 上报到后端
      this.uploadToServer(item);
    },

    /**
     * 异步上报错误到后端（静默失败，不阻塞）。
     * 收集用户信息、路由信息、nopTrace 等上下文。
     */
    uploadToServer(item: ErrorLogInfo) {
      try {
        const entry = errorReportTransport.buildEntry({
          errorType: item.type,
          errorName: item.name,
          errorMessage: item.message,
          errorStack: item.stack,
          errorDetail: item.detail,
          errorFile: item.file,
          pageUrl: item.url || (typeof window !== 'undefined' ? window.location.href : ''),
          routePath: router?.currentRoute?.value?.fullPath,
          nopTrace: (item as any)._nopTrace,
          responseBody: (item as any)._responseBody,
        });

        // 尝试获取用户信息（可能未登录）
        try {
          const { useUserStoreWithOut } = require('/@/store/modules/user');
          const userStore = useUserStoreWithOut();
          const userInfo = userStore.getUserInfo;
          if (userInfo) {
            entry.userId = userInfo.userId;
            entry.userName = userInfo.username || userInfo.realname;
          }
          entry.tenantId = getTenantId();
        } catch {
          // 用户信息获取失败，继续上报
        }

        errorReportTransport.enqueue(entry);
      } catch {
        // 静默失败，避免上报自身引发循环
      }
    },

    setErrorLogListCount(count: number): void {
      this.errorLogListCount = count;
    },

    /**
     * Triggered after ajax request error
     * @param error
     * @returns
     */
    addAjaxErrorInfo(error) {
      const { useErrorHandle } = projectSetting;
      if (!useErrorHandle) {
        return;
      }
      const errInfo: Partial<ErrorLogInfo> = {
        message: error.message,
        type: ErrorTypeEnum.AJAX,
      };
      if (error.response) {
        const { config: { url = '', data: params = '', method = 'get', headers = {} } = {}, data = {} } = error.response;
        errInfo.url = url;
        errInfo.name = 'Ajax Error!';
        errInfo.file = '-';
        errInfo.stack = JSON.stringify(data);
        errInfo.detail = JSON.stringify({ params, method, headers });

        // 提取 nopTrace 和 responseBody 用于上报
        const respHeaders = error.response.headers;
        if (respHeaders) {
          (errInfo as any)._nopTrace = respHeaders['nop-trace'] || respHeaders['x-nop-trace'];
        }
        if (data) {
          (errInfo as any)._responseBody = typeof data === 'string' ? data : JSON.stringify(data);
        }
      }
      this.addErrorLogInfo(errInfo as ErrorLogInfo);
    },
  },
});

// Need to be used outside the setup
export function useErrorLogStoreWithOut() {
  return useErrorLogStore(store);
}
