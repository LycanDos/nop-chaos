import TemplateCanvas from './TemplateCanvas.vue'
export * from './types'

export { TemplateCanvas }

export default {
  install(app: any) {
    app.component('template-canvas', TemplateCanvas)
  }
}
