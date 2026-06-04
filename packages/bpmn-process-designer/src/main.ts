import { createApp } from 'vue'
import { createPinia } from 'pinia'
import I18n from './package/languages'
import App from './App.vue'

const app = createApp(App)
app.use(createPinia())
app.use(I18n)
app.mount('#app')
