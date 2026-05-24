import { Renderer, RendererProps, unRegisterRenderer } from 'amis'
import React from 'react'

interface FlowEditorCanvasRendererProps extends RendererProps {
    value?: any
    onChange?: (value: any) => void
}

unRegisterRenderer('nop-flow-editor-canvas')

@Renderer({
    type: 'nop-flow-editor-canvas'
})
export class FlowEditorCanvasRenderer extends React.Component<FlowEditorCanvasRendererProps> {
    render() {
        const { classnames: cx, className } = this.props

        return (
            <div className={cx('nop-flow-editor-canvas', className)}>
                <div className="nop-flow-editor-canvas-placeholder">
                    <p>流程设计器画布</p>
                </div>
            </div>
        )
    }
}
