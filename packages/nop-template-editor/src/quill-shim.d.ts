declare module 'quill' {
  interface QuillOptions {
    theme?: string
    modules?: Record<string, any>
    placeholder?: string
    [key: string]: any
  }

  class Quill {
    static import(path: string): any
    static register(path: any, def?: any, suppressWarning?: boolean): void
    root: HTMLElement
    clipboard: {
      dangerouslyPasteHTML(html: string): void
    }
    constructor(container: HTMLElement | string, options?: QuillOptions)
    on(event: string, handler: (...args: any[]) => void): void
    focus(): void
    getContents(): any
    setContents(delta: any): void
    getText(): string
    update(): void
    getSelection(focus?: boolean): { index: number; length: number } | null
    setSelection(index: number, length?: number, source?: string): void
    getFormat(range?: any): Record<string, any>
    format(name: string, value: any, source?: string): void
    removeFormat(index: number, length: number, source?: string): void
  }

  export default Quill
}
