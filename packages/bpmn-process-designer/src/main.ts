import { provide } from 'vue'
import App from './App.vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

// mock usePage 全局上下文，防止刷新后为null
const globalNopPage = {
  ce: {},
  component: {},
  // 可根据实际依赖补充属性
}

const app = createApp(App, {
  modelKey: 'Process_1',
  modelName: '测试流程'
})

// 全局 provide，防止 usePage() 相关依赖报错
app.provide('nopPage', globalNopPage)

app.use(ElementPlus)
app.mount('#app')
