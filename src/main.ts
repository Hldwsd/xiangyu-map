import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import './assets/tokens.css'
import './assets/main.css'
import { applyThemeFromQuery } from './theme/theme'

// 主题对比用：`?theme=a|b|c` 只覆盖 token 值，不改任何组件代码。
// 选型定稿后这里和 tokens.css 里未选中的两组一起删掉（见 ADR 0004）。
applyThemeFromQuery()

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
