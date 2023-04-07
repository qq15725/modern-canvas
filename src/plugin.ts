import type { Canvas } from './canvas'
import type { Node } from './types'

export interface Plugin {
  name: string
  include?: (node: Node) => boolean
  exclude?: (node: Node) => boolean
  register?(canvas: Canvas): void
  beforeRender?(canvas: Canvas): void
  render?(canvas: Canvas, node: Node, time: number): void
  afterRender?(canvas: Canvas): void
}

export function definePlugin(plugin: Plugin | (() => Plugin)): Plugin {
  return typeof plugin === 'function' ? plugin() : plugin
}
