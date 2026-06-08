<template>
  <div class="antd-demo">
    <aside class="antd-demo__nav">
      <div class="antd-demo__nav-title">Antd 组件</div>
      <Anchor :affix="false">
        <AnchorLink v-for="group in componentGroups" :key="group.key" :href="`#${group.key}`" :title="group.title" />
      </Anchor>
    </aside>

    <main class="antd-demo__main">
      <section class="antd-demo__hero">
        <div>
          <TypographyTitle :level="3">Ant Design Vue 组件 Demo</TypographyTitle>
          <TypographyParagraph>按 Ant Design Vue 3.x 组件分类展示，覆盖 General、Layout、Navigation、Data Entry、Data Display、Feedback、Other。</TypographyParagraph>
        </div>
        <Space>
          <Button type="primary" @click="message.success('Message 已触发')">Message</Button>
          <Button @click="notification.info({ message: 'Notification', description: '这是通知组件示例。' })">Notification</Button>
        </Space>
      </section>

      <section id="all" class="antd-demo__panel">
        <div class="antd-demo__panel-head">
          <TypographyTitle :level="4">全部组件索引</TypographyTitle>
          <Tag color="blue">{{ allComponentCount }} 个</Tag>
        </div>
        <div class="antd-demo__tag-cloud">
          <Tag v-for="name in allComponentNames" :key="name">{{ name }}</Tag>
        </div>
      </section>

      <section id="general" class="antd-demo__panel">
        <DemoHeader title="General" :items="groupItems('general')" />
        <Space wrap>
          <Button type="primary">Primary Button</Button>
          <Button>Default Button</Button>
          <Button type="dashed">Dashed</Button>
          <Button type="link">Link</Button>
        </Space>
        <Divider />
        <TypographyTitle :level="5">Typography</TypographyTitle>
        <TypographyParagraph>
          <TypographyText mark>文本标记</TypographyText>
          <TypographyText code class="antd-demo__inline">code</TypographyText>
          <TypographyLink href="https://antdv.com/" target="_blank">antdv.com</TypographyLink>
        </TypographyParagraph>
      </section>

      <section id="layout" class="antd-demo__panel">
        <DemoHeader title="Layout" :items="groupItems('layout')" />
        <Space direction="vertical" class="antd-demo__full">
          <Row :gutter="8">
            <Col :span="8"><div class="antd-demo__grid-cell">Col 8</div></Col>
            <Col :span="8"><div class="antd-demo__grid-cell">Col 8</div></Col>
            <Col :span="8"><div class="antd-demo__grid-cell">Col 8</div></Col>
          </Row>
          <Layout class="antd-demo__layout-box">
            <LayoutSider width="120">Sider</LayoutSider>
            <Layout>
              <LayoutHeader>Header</LayoutHeader>
              <LayoutContent>Content</LayoutContent>
              <LayoutFooter>Footer</LayoutFooter>
            </Layout>
          </Layout>
          <Divider orientation="left">Divider</Divider>
        </Space>
      </section>

      <section id="navigation" class="antd-demo__panel">
        <DemoHeader title="Navigation" :items="groupItems('navigation')" />
        <Space direction="vertical" class="antd-demo__full">
          <Affix :offset-top="72"><Tag color="processing">Affix</Tag></Affix>
          <Breadcrumb>
            <BreadcrumbItem>开发工具</BreadcrumbItem>
            <BreadcrumbItem>Antd Demo</BreadcrumbItem>
          </Breadcrumb>
          <Menu mode="horizontal" :selected-keys="['components']">
            <MenuItem key="components">组件</MenuItem>
            <MenuItem key="patterns">模式</MenuItem>
          </Menu>
          <Space wrap>
            <Dropdown>
              <Button>Dropdown</Button>
              <template #overlay>
                <Menu>
                  <MenuItem key="1">菜单项</MenuItem>
                  <MenuDivider />
                  <MenuItem key="2">分隔后菜单项</MenuItem>
                </Menu>
              </template>
            </Dropdown>
            <DropdownButton>DropdownButton</DropdownButton>
            <Pagination :total="80" :page-size="10" size="small" />
          </Space>
          <Steps :current="1" size="small">
            <StepsStep title="选择" />
            <StepsStep title="配置" />
            <StepsStep title="完成" />
          </Steps>
          <PageHeader title="PageHeader" sub-title="页面头部示例" />
        </Space>
      </section>

      <section id="data-entry" class="antd-demo__panel">
        <DemoHeader title="Data Entry" :items="groupItems('data-entry')" />
        <Form layout="vertical">
          <Row :gutter="12">
            <Col :span="8"><FormItem label="Input"><Input v-model:value="formState.text" /></FormItem></Col>
            <Col :span="8"><FormItem label="InputNumber"><InputNumber v-model:value="formState.count" class="antd-demo__full" /></FormItem></Col>
            <Col :span="8"><FormItem label="Select"><Select v-model:value="formState.select" :options="selectOptions" /></FormItem></Col>
            <Col :span="8"><FormItem label="AutoComplete"><AutoComplete v-model:value="formState.auto" :options="selectOptions" /></FormItem></Col>
            <Col :span="8"><FormItem label="Cascader"><Cascader v-model:value="formState.cascader" :options="cascaderOptions" /></FormItem></Col>
            <Col :span="8"><FormItem label="TreeSelect"><TreeSelect v-model:value="formState.tree" :tree-data="treeData" /></FormItem></Col>
            <Col :span="8"><FormItem label="DatePicker"><DatePicker class="antd-demo__full" /></FormItem></Col>
            <Col :span="8"><FormItem label="TimePicker"><TimePicker class="antd-demo__full" /></FormItem></Col>
            <Col :span="8"><FormItem label="Mentions"><Mentions v-model:value="formState.mention"><MentionsOption value="nop">nop</MentionsOption></Mentions></FormItem></Col>
          </Row>
          <Space wrap>
            <InputPassword placeholder="InputPassword" />
            <InputSearch placeholder="InputSearch" enter-button />
            <CheckboxGroup v-model:value="formState.checks" :options="['A', 'B']" />
            <RadioGroup v-model:value="formState.radio"><RadioButton value="left">Left</RadioButton><RadioButton value="right">Right</RadioButton></RadioGroup>
            <Switch v-model:checked="formState.enabled" />
            <Slider v-model:value="formState.slider" class="antd-demo__slider" />
            <Rate v-model:value="formState.rate" />
          </Space>
          <Transfer class="antd-demo__transfer" :data-source="transferData" :target-keys="['2']" :render="(item) => item.title" />
          <UploadDragger :before-upload="preventUpload" :max-count="1">
            <p>Upload / UploadDragger</p>
          </UploadDragger>
        </Form>
      </section>

      <section id="data-display" class="antd-demo__panel">
        <DemoHeader title="Data Display" :items="groupItems('data-display')" />
        <Space direction="vertical" class="antd-demo__full">
          <Space wrap>
            <Avatar>N</Avatar>
            <AvatarGroup><Avatar>A</Avatar><Avatar>B</Avatar></AvatarGroup>
            <Badge count="5"><Button>Badge</Button></Badge>
            <BadgeRibbon text="Ribbon"><Card size="small">BadgeRibbon</Card></BadgeRibbon>
            <Tooltip title="Tooltip"><Tag color="blue">Tag</Tag></Tooltip>
            <Popover title="Popover" content="弹出内容"><Button>Popover</Button></Popover>
            <Statistic title="Statistic" :value="1128" />
            <StatisticCountdown title="Countdown" :value="Date.now() + 1000 * 60 * 60" />
          </Space>
          <Card title="Card"><CardMeta title="CardMeta" description="卡片元信息" /></Card>
          <Descriptions bordered size="small"><DescriptionsItem label="DescriptionsItem">值</DescriptionsItem></Descriptions>
          <Collapse><CollapsePanel key="1" header="CollapsePanel">折叠内容</CollapsePanel></Collapse>
          <Tabs><TabsTabPane key="1" tab="Tabs">TabsTabPane</TabsTabPane></Tabs>
          <List bordered :data-source="['ListItem', 'ListItemMeta']"><template #renderItem="{ item }"><ListItem><ListItemMeta :title="item" description="列表项" /></ListItem></template></List>
          <Table size="small" :pagination="false" :columns="tableColumns" :data-source="tableData" />
          <Tree :tree-data="treeData" default-expand-all />
          <Timeline><TimelineItem>TimelineItem</TimelineItem><TimelineItem color="green">完成</TimelineItem></Timeline>
          <Calendar :fullscreen="false" />
          <Carousel autoplay><div class="antd-demo__carousel">Carousel</div><div class="antd-demo__carousel">Slide</div></Carousel>
          <Comment author="Comment" content="评论组件示例" />
          <Image width="96px" src="/wechat-public-account.jpg" />
          <Empty description="Empty" />
        </Space>
      </section>

      <section id="feedback" class="antd-demo__panel">
        <DemoHeader title="Feedback" :items="groupItems('feedback')" />
        <Space direction="vertical" class="antd-demo__full">
          <Alert message="Alert" description="反馈提示示例" type="info" show-icon />
          <Space wrap>
            <Button @click="drawerVisible = true">Drawer</Button>
            <Button @click="modalVisible = true">Modal</Button>
            <Popconfirm title="确认操作？"><Button>Popconfirm</Button></Popconfirm>
            <Spin />
          </Space>
          <Progress :percent="68" />
          <Result status="success" title="Result" sub-title="结果反馈示例" />
          <Skeleton active />
        </Space>
        <Drawer v-model:visible="drawerVisible" title="Drawer" placement="right"><p>抽屉内容</p></Drawer>
        <Modal v-model:visible="modalVisible" title="Modal"><p>弹窗内容</p></Modal>
      </section>

      <section id="other" class="antd-demo__panel">
        <DemoHeader title="Other" :items="groupItems('other')" />
        <ConfigProvider>
          <Alert message="ConfigProvider 当前由根应用统一配置 locale/theme。" type="success" />
        </ConfigProvider>
        <BackTop />
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import {
  Affix, Alert, Anchor, AutoComplete, Avatar, BackTop, Badge,
  Breadcrumb, Button, Calendar, Card, Carousel, Cascader, Checkbox,
  Collapse, Col, Comment, ConfigProvider, DatePicker, Descriptions,
  Divider, Drawer, Dropdown, Empty, Form, Image, Input, InputNumber,
  Layout, List, Mentions, Menu, Modal, PageHeader,
  Pagination, Popconfirm, Popover, Progress, Radio, Rate, Result, Select, Skeleton,
  Slider, Space, Spin, Statistic, Steps, Switch, Table, Tabs,
  Tag, TimePicker, Timeline, Tooltip, Transfer, Tree, TreeSelect,
  Typography, Upload, message, notification,
} from 'ant-design-vue';
import { computed, defineComponent, h, reactive, ref } from 'vue';

const TypographyTitle = Typography.Title;
const TypographyParagraph = Typography.Paragraph;
const TypographyText = Typography.Text;
const TypographyLink = Typography.Link;
const AnchorLink = Anchor.Link;
const AvatarGroup = Avatar.Group;
const BadgeRibbon = Badge.Ribbon;
const BreadcrumbItem = Breadcrumb.Item;
const CardMeta = Card.Meta;
const CheckboxGroup = Checkbox.Group;
const CollapsePanel = Collapse.Panel;
const DescriptionsItem = Descriptions.Item;
const DropdownButton = Dropdown.Button;
const FormItem = Form.Item;
const InputPassword = Input.Password;
const InputSearch = Input.Search;
const LayoutContent = Layout.Content;
const LayoutFooter = Layout.Footer;
const LayoutHeader = Layout.Header;
const LayoutSider = Layout.Sider;
const ListItem = List.Item;
const ListItemMeta = List.Item.Meta;
const MentionsOption = Mentions.Option;
const MenuDivider = Menu.Divider;
const MenuItem = Menu.Item;
const RadioButton = Radio.Button;
const RadioGroup = Radio.Group;
const StatisticCountdown = Statistic.Countdown;
const StepsStep = Steps.Step;
const TabsTabPane = Tabs.TabPane;
const TimelineItem = Timeline.Item;
const UploadDragger = Upload.Dragger;

const DemoHeader = defineComponent({
  props: {
    title: { type: String, required: true },
    items: { type: Array as () => string[], required: true },
  },
  setup(props) {
    return () => h('div', { class: 'antd-demo__panel-head' }, [
      h(TypographyTitle, { level: 4 }, () => props.title),
      h('div', { class: 'antd-demo__tag-row' }, props.items.map((item) => h(Tag, { key: item }, () => item))),
    ]);
  },
});

const componentGroups = [
  { key: 'general', title: 'General', items: ['Button', 'Icon', 'Typography'] },
  { key: 'layout', title: 'Layout', items: ['Divider', 'Grid', 'Layout', 'Space'] },
  { key: 'navigation', title: 'Navigation', items: ['Affix', 'Anchor', 'Breadcrumb', 'Dropdown', 'Menu', 'PageHeader', 'Pagination', 'Steps'] },
  { key: 'data-entry', title: 'Data Entry', items: ['AutoComplete', 'Cascader', 'Checkbox', 'DatePicker', 'Form', 'Input', 'InputNumber', 'Mentions', 'Radio', 'Rate', 'Select', 'Slider', 'Switch', 'TimePicker', 'Transfer', 'TreeSelect', 'Upload'] },
  { key: 'data-display', title: 'Data Display', items: ['Avatar', 'Badge', 'Calendar', 'Card', 'Carousel', 'Collapse', 'Comment', 'Descriptions', 'Empty', 'Image', 'List', 'Popover', 'Statistic', 'Table', 'Tabs', 'Tag', 'Timeline', 'Tooltip', 'Tree'] },
  { key: 'feedback', title: 'Feedback', items: ['Alert', 'Drawer', 'Message', 'Modal', 'Notification', 'Popconfirm', 'Progress', 'Result', 'Skeleton', 'Spin'] },
  { key: 'other', title: 'Other', items: ['BackTop', 'ConfigProvider'] },
];

const allComponentNames = computed(() => componentGroups.flatMap((group) => group.items));
const allComponentCount = computed(() => allComponentNames.value.length);
function groupItems(key: string) {
  return componentGroups.find((group) => group.key === key)?.items ?? [];
}

const drawerVisible = ref(false);
const modalVisible = ref(false);
const formState = reactive({
  text: 'Nop',
  count: 3,
  select: 'a',
  auto: 'a',
  cascader: ['zhejiang', 'hangzhou'],
  tree: 'parent',
  mention: '@nop',
  checks: ['A'],
  radio: 'left',
  enabled: true,
  slider: 45,
  rate: 4,
});

const selectOptions = [
  { label: '选项 A', value: 'a' },
  { label: '选项 B', value: 'b' },
];
const cascaderOptions = [
  { label: '浙江', value: 'zhejiang', children: [{ label: '杭州', value: 'hangzhou' }] },
];
const treeData = [
  { title: '父节点', value: 'parent', key: 'parent', children: [{ title: '子节点', value: 'child', key: 'child' }] },
];
const transferData = [
  { key: '1', title: '源项' },
  { key: '2', title: '目标项' },
];
const tableColumns = [
  { title: '组件', dataIndex: 'name' },
  { title: '分类', dataIndex: 'group' },
];
const tableData = [
  { key: '1', name: 'TableColumn / Summary', group: 'Data Display' },
];

function preventUpload() {
  message.info('Upload 示例不会真正上传文件');
  return false;
}
</script>

<style scoped lang="less">
.antd-demo {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  min-height: 100%;
  background: #f5f7fb;
}

.antd-demo__nav {
  position: sticky;
  top: 0;
  align-self: start;
  height: 100vh;
  padding: 16px 12px;
  border-right: 1px solid #e5e7eb;
  background: #fff;
  overflow-y: auto;
}

.antd-demo__nav-title {
  margin-bottom: 12px;
  color: var(--primary-color, #0960bd);
  font-size: 15px;
  font-weight: 700;
}

.antd-demo__main {
  min-width: 0;
  padding: 12px;
}

.antd-demo__hero,
.antd-demo__panel {
  margin-bottom: 12px;
  padding: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fff;
}

.antd-demo__hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.antd-demo__panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.antd-demo__tag-cloud,
.antd-demo__tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.antd-demo__full {
  width: 100%;
}

.antd-demo__inline {
  margin: 0 8px;
}

.antd-demo__grid-cell,
.antd-demo__carousel {
  padding: 16px;
  border-radius: 4px;
  background: #e8f2ff;
  color: var(--primary-color, #0960bd);
  text-align: center;
}

.antd-demo__layout-box {
  overflow: hidden;
  border-radius: 4px;
  color: #fff;
  text-align: center;
}

.antd-demo__layout-box :deep(.ant-layout-sider),
.antd-demo__layout-box :deep(.ant-layout-header),
.antd-demo__layout-box :deep(.ant-layout-footer) {
  background: var(--primary-color, #0960bd);
  color: #fff;
}

.antd-demo__layout-box :deep(.ant-layout-content) {
  min-height: 70px;
  background: #e8f2ff;
  color: var(--primary-color, #0960bd);
  line-height: 70px;
}

.antd-demo__slider {
  width: 180px;
}

.antd-demo__transfer {
  margin: 12px 0;
}

@media (max-width: 900px) {
  .antd-demo {
    grid-template-columns: 1fr;
  }

  .antd-demo__nav {
    position: static;
    height: auto;
    border-right: 0;
    border-bottom: 1px solid #e5e7eb;
  }

  .antd-demo__hero {
    display: block;
  }
}
</style>
