import { basePlugin } from './base'
import { nodeImagePlugin } from './node-image'
import { nodeTextPlugin } from './node-text'
import { nodeVideoPlugin } from './node-video'
import { fadePlugin } from './fade'
import { transform2dPlugin } from './transform2d'

export * from './base'
export * from './fade'
export * from './node-image'
export * from './node-text'
export * from './transform2d'

export const plugins = [
  basePlugin,
  nodeImagePlugin,
  nodeTextPlugin,
  nodeVideoPlugin,
  fadePlugin,
  transform2dPlugin,
]
