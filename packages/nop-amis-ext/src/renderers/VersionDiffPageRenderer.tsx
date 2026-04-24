import { Renderer, RendererProps, unRegisterRenderer } from 'amis'
import React from 'react'
import VersionDiffPageView from '../components/VersionDiffPage'

unRegisterRenderer('nop-version-diff-page')

@Renderer({
  type: 'nop-version-diff-page',
})
export class VersionDiffPageRenderer extends React.Component<RendererProps> {
  render() {
    return <VersionDiffPageView {...this.props} />
  }
}
