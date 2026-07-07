import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import 'lxgw-wenkai-webfont/lxgwwenkai-regular.css'
import './styles/variables.css'
import './styles/preview.css'
import './styles/editor.css'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
