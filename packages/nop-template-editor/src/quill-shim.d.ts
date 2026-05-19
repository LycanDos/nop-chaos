declare module 'quill' {
  interface QuillOptions {
    theme?: string
    modules?: Record<string, any>
    placeholder?: string
    [key: string]: any
  }
  class Quill {
    root: HTMLElement
    constructor(container: HTMLElement | string, options?: QuillOptions)
    on(event: string, handler: (...args: any[]) => void): void
    focus(): void
    getContents(): any
    setContents(delta: any): void
    getText(): string
    update(): void
  }
  export default Quill
}
