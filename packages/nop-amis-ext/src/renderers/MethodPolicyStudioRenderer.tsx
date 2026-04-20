import { Renderer, RendererProps, unRegisterRenderer } from 'amis'
import React from 'react'
import MethodPolicyStudioView from '../components/MethodPolicyStudio'

unRegisterRenderer('nop-method-policy-studio')

@Renderer({
  type: 'nop-method-policy-studio',
})
export class MethodPolicyStudioRenderer extends React.Component<RendererProps> {
  render() {
    return <MethodPolicyStudioView {...this.props} />
  }
}
