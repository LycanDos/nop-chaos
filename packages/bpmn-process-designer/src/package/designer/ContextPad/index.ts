import type { ModuleDeclaration } from 'didi'
import CustomContextPadProvider from '@/designer/ContextPad/CustomContextPadProvider.ts'

const customContextPad: ModuleDeclaration = {
  __init__: ['customContextPadProvider'],
  customContextPadProvider: ['type', CustomContextPadProvider],
}

export default customContextPad
