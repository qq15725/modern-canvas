import { basePlugin } from './base'
import { nodeImagePlugin } from './node-image'
import { fadePlugin } from './fade'
import { selector2dPlugin } from './selector2d'
import { transform2dPlugin } from './transform2d'

export * from './base'
export * from './fade'
export * from './node-image'
export * from './selector2d'
export * from './transform2d'

export const plugins = [
  basePlugin,
  nodeImagePlugin,
  fadePlugin,
  transform2dPlugin,
  selector2dPlugin,
]
