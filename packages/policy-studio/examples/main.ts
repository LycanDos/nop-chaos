import { createApp } from 'vue'
import 'element-plus/dist/index.css'
import { ElButton } from 'element-plus/es/components/button/index.mjs'
import { ElCol } from 'element-plus/es/components/col/index.mjs'
import { ElEmpty } from 'element-plus/es/components/empty/index.mjs'
import { ElForm } from 'element-plus/es/components/form/index.mjs'
import { ElIcon } from 'element-plus/es/components/icon/index.mjs'
import { ElInput } from 'element-plus/es/components/input/index.mjs'
import { ElInputNumber } from 'element-plus/es/components/input-number/index.mjs'
import { ElRow } from 'element-plus/es/components/row/index.mjs'
import { ElSelect } from 'element-plus/es/components/select/index.mjs'
import { ElSwitch } from 'element-plus/es/components/switch/index.mjs'
import { ElTabs } from 'element-plus/es/components/tabs/index.mjs'
import { ElTag } from 'element-plus/es/components/tag/index.mjs'
import { ElTreeSelect } from 'element-plus/es/components/tree-select/index.mjs'
import App from './App.vue'

const app = createApp(App)

app.use(ElButton)
app.use(ElCol)
app.use(ElEmpty)
app.use(ElForm)
app.use(ElIcon)
app.use(ElInput)
app.use(ElInputNumber)
app.use(ElRow)
app.use(ElSelect)
app.use(ElSwitch)
app.use(ElTabs)
app.use(ElTag)
app.use(ElTreeSelect)

app.mount('#app')
