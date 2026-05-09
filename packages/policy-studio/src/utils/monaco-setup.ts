import * as monaco from 'monaco-editor'

import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

import 'monaco-editor/esm/vs/basic-languages/xml/xml.contribution'
import 'monaco-editor/esm/vs/language/json/monaco.contribution'
import 'monaco-editor/esm/vs/language/css/monaco.contribution'
import 'monaco-editor/esm/vs/language/html/monaco.contribution'
import 'monaco-editor/esm/vs/language/typescript/monaco.contribution'

let configured = false

export function ensureMonacoConfigured() {
  if (configured)
    return monaco

  ;(self as typeof self & {
    MonacoEnvironment?: {
      getWorker: (_workerId: string, label: string) => Worker
    }
  }).MonacoEnvironment = {
    getWorker(_workerId: string, label: string) {
      if (label === 'json') {
        return new jsonWorker()
      }

      if (label === 'css' || label === 'scss' || label === 'less') {
        return new cssWorker()
      }

      if (label === 'html' || label === 'handlebars' || label === 'razor' || label === 'xml') {
        return new htmlWorker()
      }

      if (label === 'typescript' || label === 'javascript') {
        return new tsWorker()
      }

      return new editorWorker()
    }
  }

  configured = true
  return monaco
}
