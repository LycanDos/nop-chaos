import { Renderer, RendererProps, unRegisterRenderer } from 'amis'
import React from 'react'

interface FlowEditorRendererProps extends RendererProps {
    flowEditorSchema?: any
    componentLib?: string
    value?: any
    onChange?: (value: any) => void
}

unRegisterRenderer('nop-flow-editor')

@Renderer({
    type: 'nop-flow-editor'
})
export class FlowEditorRenderer extends React.Component<FlowEditorRendererProps> {
    render() {
        const { render, body, flowEditorSchema, componentLib, ...rest } = this.props

        return (
            <div className="nop-flow-editor">
                {render('body', body || '', {}, rest)}
            </div>
        )
    }
}
