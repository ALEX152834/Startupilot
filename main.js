import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import shareMixin from '@/mixins/share.js'

export function createApp() {
  const app = createSSRApp(App)
  const pinia = createPinia()
  
  app.use(pinia)
  app.mixin(shareMixin)
  
  return {
    app,
    pinia
  }
}

