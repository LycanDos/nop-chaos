import VariableEventRenderer from './RewriteRenderer/VariableEventRenderer.ts'
import ConnectorIconRenderer from './RewriteRenderer/ConnectorIconRenderer'
import ExclusiveGatewayRender from '@/designer/Renderer/RewriteRenderer/ExclusiveGatewayRender.ts'
import WfSkinRenderer from '@/designer/Renderer/RewriteRenderer/WfSkinRenderer.ts'

const httpTaskRenderer = {
  __init__: [
    'variableEventRenderer',
    'connectorIconRenderer',
    'neutralElementColors',
    'exclusiveGatewayRender',
    'wfSkinRenderer',
  ],
  variableEventRenderer: ['type', VariableEventRenderer],
  neutralElementColors: ['type', class {}],
  connectorIconRenderer: ['type', ConnectorIconRenderer],
  exclusiveGatewayRender: ['type', ExclusiveGatewayRender],
  wfSkinRenderer: ['type', WfSkinRenderer],
}

export default httpTaskRenderer
