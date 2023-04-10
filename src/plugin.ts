import type { Canvas } from './canvas'

export interface Plugin {
  name: string
  register?(canvas: Canvas): void
  beforeRender?(canvas: Canvas): void
  afterRender?(canvas: Canvas): void
}

export function definePlugin(plugin: Plugin | (() => Plugin)): Plugin {
  return typeof plugin === 'function' ? plugin() : plugin
}
