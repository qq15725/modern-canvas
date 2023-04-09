import { fadePlugin } from './fade'
import { node2dImagePlugin } from './node2d-image'
import { presetShapesPlugin } from './preset-shapes'
import { transform2dPlugin } from './transform2d'
import { selector2dPlugin } from './selector2d'

export const presetPlugins = [
  presetShapesPlugin,
  node2dImagePlugin,
  fadePlugin,
  transform2dPlugin,
  selector2dPlugin,
]
