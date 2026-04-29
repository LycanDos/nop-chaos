import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import I18n from './package/languages'
import App from './App.vue'

const app = createApp(App)
app.use(createPinia())
app.use(ElementPlus)
app.use(I18n)
app.mount('#app')
