<template>
  <div :class="prefixCls">
    <Popover v-model:visible="popoverVisible" title="" trigger="click" :overlayClassName="`${prefixCls}__overlay`">
      <Badge :count="count" :overflowCount="9" :offset="[-4, 10]" :numberStyle="numberStyle">
        <BellOutlined />
      </Badge>
      <template #content>
        <Tabs>
          <template v-for="item in listData" :key="item.key">
            <TabPane>
              <template #tab>
                {{ item.name }}
                <span v-if="item.list.length !== 0">({{ item.count }})</span>
              </template>
              <!-- 绑定title-click事件的通知列表中标题是“可点击”的-->
              <NoticeList :list="item.list" @title-click="onNoticeClick" />
            </TabPane>
          </template>
        </Tabs>
        <a-row class="bottom-buttons">
          <a-col :span="count === 0 ? 0 : 12">
            <a-button @click="onEmptyNotify" type="dashed" block>清空消息</a-button>
          </a-col>
          <a-col :span="count === 0 ? 24 : 12">
            <a-button @click="popoverVisible = false" type="dashed" block>
              <router-link to="/monitor/mynews">查看更多</router-link>
            </a-button>
          </a-col>
        </a-row>
      </template>
    </Popover>
    <DynamicNotice ref="dynamicNoticeRef" v-bind="dynamicNoticeProps" />
    <DetailModal @register="registerDetail" />
  </div>
</template>
<script lang="ts">
  import { computed, defineComponent, ref, unref, reactive, onMounted, getCurrentInstance, onUnmounted } from 'vue';
  import { Popover, Tabs, Badge } from 'ant-design-vue';
  import { BellOutlined } from '@ant-design/icons-vue';
  import { tabListData } from './data';
  import { listCementByUser, editCementSend } from './notify.api';
  import NoticeList from './NoticeList.vue';
  import DetailModal from '/@/views/monitor/mynews/DetailModal.vue';
  import DynamicNotice from '/@/views/monitor/mynews/DynamicNotice.vue';
  import { useModal } from '/@/Modal';
  import { useDesign } from '/@/hooks/web/useDesign';
  import { useGlobSetting } from '/@/hooks/setting';
  import { useUserStore } from '/@/store/modules/user';
  import { connectWebSocket, onWebSocket, result } from '/@/hooks/web/useWebSocket';
  import { readAllMsg } from '/@/views/monitor/mynews/mynews.api';
  import { getToken } from '/@/utils/auth';
  export default defineComponent({
    components: {
      Popover,
      BellOutlined,
      Tabs,
      TabPane: Tabs.TabPane,
      Badge,
      NoticeList,
      DetailModal,
      DynamicNotice,
    },
    setup() {
      const { prefixCls } = useDesign('header-notify');
      const instance: any = getCurrentInstance();
      const userStore = useUserStore();
      const glob = useGlobSetting();
      const dynamicNoticeProps = reactive({ path: '', formData: {} });
      const [registerDetail, detailModal] = useModal();
      const popoverVisible = ref<boolean>(false);
      const listData = ref(tabListData);
      listData.value[0].list = [];
      listData.value[1].list = [];
      listData.value[0].count = 0;
      listData.value[1].count = 0;

      onMounted(() => {
        initWebSocket();
      });

      const count = computed(() => {
        let count = 0;
        for (let i = 0; i < listData.value.length; i++) {
          count += listData.value[i].count;
        }
        return count;
      });

      function mapAnnouncement(item) {
        return {
          ...item,
          title: item.titile,
          description: item.msgAbstract,
          datetime: item.sendTime,
        };
      }

      // 获取系统消息
      async function loadData() {
        try {
          let { anntMsgList, sysMsgList, anntMsgTotal, sysMsgTotal } = await listCementByUser({
            pageSize: 5,
          });
          listData.value[0].list = anntMsgList.map(mapAnnouncement);
          listData.value[1].list = sysMsgList.map(mapAnnouncement);
          listData.value[0].count = anntMsgTotal;
          listData.value[1].count = sysMsgTotal;
        } catch (e) {
          console.warn('系统消息通知异常：', e);
        }
      }

      loadData();

      function onNoticeClick(record) {
        try {
          editCementSend(record.id);
          loadData();
        } catch (e) {
          console.error(e);
        }
        if (record.openType === 'component') {
          dynamicNoticeProps.path = record.openPage;
          dynamicNoticeProps.formData = { id: record.busId };
          instance.refs.dynamicNoticeRef?.detail(record.openPage);
        } else {
          detailModal.openModal(true, {
            record,
            isUpdate: true,
          });
        }
        popoverVisible.value = false;
      }

      // 初始化 WebSocket
      function initWebSocket() {
        let userId = unref(userStore.getUserInfo).id;
        let token = getToken();
        // WebSocket与普通的请求所用协议有所不同，ws等同于http，wss等同于https
        let url = glob.domainUrl?.replace('https://', 'wss://').replace('http://', 'ws://') + '/websocket/' + userId;
        connectWebSocket(url);
        onWebSocket(onWebSocketMessage);
      }

      function onWebSocketMessage(data) {
        console.log('---onWebSocketMessage---', data)
        if (data.cmd === 'topic' || data.cmd === 'user') {
          //update-begin-author:taoyan date:2022-7-13 for: VUEN-1674【严重bug】系统通知，为什么必须刷新右上角才提示
          //后台保存数据太慢 前端延迟刷新消息
          setTimeout(()=>{
            loadData();
          }, 1000)
          //update-end-author:taoyan date:2022-7-13 for: VUEN-1674【严重bug】系统通知，为什么必须刷新右上角才提示
        }
      }

      // 清空消息
      function onEmptyNotify() {
        popoverVisible.value = false;
        readAllMsg({}, loadData);
      }

      return {
        prefixCls,
        listData,
        count,
        onNoticeClick,
        onEmptyNotify,
        numberStyle: {},
        popoverVisible,
        registerDetail,
        dynamicNoticeProps,
      };
    },
  });
</script>
<style lang="less" scoped>
  //noinspection LessUnresolvedVariable
  @prefix-cls: ~'@{namespace}-header-notify';

  .@{prefix-cls} {
    padding-top: 2px;

    &__overlay {
      max-width: 340px;

      .ant-popover-inner-content {
        padding: 0;
      }

      .ant-tabs-nav {
        margin-bottom: 12px;
      }

      .ant-list-item {
        padding: 12px 24px;
        transition: background-color 300ms;

        &:hover {
          background-color: #e6f7ff;
        }
      }

      .bottom-buttons {
        text-align: center;
        border-top: 1px solid #f0f0f0;
        height: 42px;

        .ant-btn {
          border: 0;
          height: 100%;

          &:first-child {
            border-right: 1px solid #f0f0f0;
          }
        }
      }
    }

    .ant-tabs-content {
      width: 300px;
    }

    .ant-badge {
      font-size: 18px;

      .ant-badge-count {
        @badget-size: 16px;
        width: @badget-size;
        height: @badget-size;
        min-width: @badget-size;
        line-height: @badget-size;
        padding: 0;

        .ant-scroll-number-only > p.ant-scroll-number-only-unit {
          font-size: 14px;
          height: @badget-size;
        }
      }

      .ant-badge-multiple-words {
        padding: 0 0 0 2px;
        font-size: 12px;
      }

      svg {
        width: 0.9em;
      }
    }
  }

  // 兼容黑暗模式
  [data-theme='dark'] .@{prefix-cls} {
    &__overlay {
      .ant-list-item {
        &:hover {
          background-color: #111b26;
        }
      }

      .bottom-buttons {
        border-top: 1px solid #303030;

        .ant-btn {
          &:first-child {
            border-right: 1px solid #303030;
          }
        }
      }
    }
  }
</style>
