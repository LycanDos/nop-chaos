import * as monaco from 'monaco-editor'

import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'

import 'monaco-editor/esm/vs/basic-languages/xml/xml.contribution'

let configured = false

export function ensureMonacoConfigured() {
  if (configured)
    return monaco

  ;(self as typeof self & {
    MonacoEnvironment?: {
      getWorker: (_workerId: string, label: string) => Worker
    }
  }).MonacoEnvironment = {
    getWorker() {
      return new editorWorker()
    }
  }

  configured = true
  return monaco
}
