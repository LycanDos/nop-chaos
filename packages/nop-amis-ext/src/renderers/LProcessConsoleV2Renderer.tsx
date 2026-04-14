import { Renderer, RendererProps, unRegisterRenderer } from 'amis'
import React from 'react'
import LProcessConsoleV2View from '../components/LProcessConsoleV2'

unRegisterRenderer('nop-lprocess-console-v2')

@Renderer({
  type: 'nop-lprocess-console-v2',
})
export class LProcessConsoleV2Renderer extends React.Component<RendererProps> {
  render() {
    return <LProcessConsoleV2View {...this.props} />
  }
}
