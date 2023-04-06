import type { Canvas } from './canvas'
import type { Node } from './types'

export interface RegisterPluginOptions {
  name: string
  include?: (node: Node) => boolean
  exclude?: (node: Node) => boolean
  register?(canvas: Canvas): void
  draw?(canvas: Canvas, node: Node, time: number): void
}

export interface Plugin {
  name: string
  include?: (node: Node) => boolean
  exclude?: (node: Node) => boolean
  draw?(canvas: Canvas, node: Node, time: number): void
}

export function definePlugin(plugin: RegisterPluginOptions | (() => RegisterPluginOptions)): RegisterPluginOptions {
  return typeof plugin === 'function' ? plugin() : plugin
}

export function registerPlugin(canvas: Canvas, options: RegisterPluginOptions) {
  const { plugins } = canvas
  const { register, ...plugin } = options

  register?.(canvas)

  plugins.push(plugin)
}
