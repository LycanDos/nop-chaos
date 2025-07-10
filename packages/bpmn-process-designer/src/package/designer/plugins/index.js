import ReplaceMenuProvider from './replaceMenuProvider'

export default {
  __init__: ['contextPadProvider', 'paletteProvider', 'replaceMenuProvider'],
  contextPadProvider: ['type', require('./content-pad/contentPadProvider').default],
  paletteProvider: ['type', require('./palette/CustomPalette').default],
  replaceMenuProvider: ['type', ReplaceMenuProvider],
} 