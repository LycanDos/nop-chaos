import App from './App.vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
const app = createApp(App, {
  modelKey: 'Process_1',
  modelName: '测试流程'
})
app.use(ElementPlus)
app.mount('#app')
