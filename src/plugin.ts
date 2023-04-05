import type { Canvas } from './canvas'
import type { Node } from './types'

export interface RegisterPluginOptions {
  name: string
  type: string | string[]
  register?(canvas: Canvas): void
  boot?(canvas: Canvas, node: Node): void
  render?(canvas: Canvas, node: Node, time: number): void
}

export interface Plugin {
  name: string
  boot?(canvas: Canvas, node: Node): void | Promise<void>
  render?(canvas: Canvas, node: Node, time: number): void
}

export function definePlugin(plugin: RegisterPluginOptions | (() => RegisterPluginOptions)): RegisterPluginOptions {
  return typeof plugin === 'function' ? plugin() : plugin
}

export function registerPlugin(canvas: Canvas, options: RegisterPluginOptions) {
  const { plugins } = canvas
  const { type, register, ...plugin } = options

  register?.(canvas)

  const types = typeof type === 'string' ? [type] : type

  types.forEach(type => {
    let usePlugins = plugins.get(type)
    if (!usePlugins) {
      usePlugins = []
      plugins.set(type, usePlugins)
    }
    usePlugins.push(plugin)
  })
}
