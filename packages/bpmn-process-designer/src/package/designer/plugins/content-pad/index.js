import CustomContextPadProvider from './contentPadProvider'
import ReplaceMenuModule from '../replace-menu'

export default {
  __init__: ['contextPadProvider'],
  contextPadProvider: ['type', CustomContextPadProvider],
  __depends__: [ReplaceMenuModule]
}
