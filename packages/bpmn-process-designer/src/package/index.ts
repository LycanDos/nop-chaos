import MyProcessDesigner from './designer'
import MyProcessPenal from './penal'


import './theme/index.scss'
import 'bpmn-js/dist/assets/diagram-js.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-codes.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css'

export { MyProcessDesigner, MyProcessPenal }
export { default as CustomContentPadProvider } from './designer/plugins/content-pad'
export { default as CustomPaletteProvider } from './designer/plugins/palette'
export { default as ReplaceMenuProvider } from './designer/plugins/replaceMenuProvider'
// export { ProcessDesignerWithProvider } from './designer'
