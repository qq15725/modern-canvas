import { render, startRenderLoop } from './render'
import { createContainer } from './container'
import { presetPlugins } from './plugins'
import { registerMaterial } from './material'
import { registerTexture } from './texture'
import { provideGl } from './gl'
import { registerShape } from './shape'
import { renderNode } from './render-node'
import type { RenderNodeOptions } from './render-node'
import type { InternalShape, Shape } from './shape'
import type { GlDrawModes, GlExtensions, GlSlTypes } from './gl'
import type { Node } from './types'
import type { InternalMaterial, Material } from './material'
import type { Plugin } from './plugin'
import type { InternalTexture, Texture } from './texture'
import type { Container } from './container'

export interface CanvasOptions {
  glOptions?: WebGLContextAttributes
  view?: HTMLCanvasElement
  data?: Node[]
}

export interface Canvas extends Container {
  view: HTMLCanvasElement
  data: Node[]

  gl: WebGLRenderingContext
  glDefaultTexture: WebGLTexture
  glDefaultFramebuffers: { glFramebuffer: WebGLFramebuffer; glTexture: WebGLTexture }[]
  glDrawModes: GlDrawModes
  glSlTypes: GlSlTypes
  glExtensions: GlExtensions

  width: number
  height: number

  plugins: Map<string, Plugin>
  beforeRenderPlugins: Plugin[]
  renderPlugins: Plugin[]
  afterRenderPlugins: Plugin[]

  shapes: Map<string, InternalShape>
  registerShape(shape: Shape): void

  materials: Map<string, InternalMaterial>
  registerMaterial(options: Material): void

  textures: Map<string, InternalTexture>
  registerTexture(options: Texture): void

  renderNode(options: RenderNodeOptions): void
  render(time?: number): void
  startRenderLoop(): void
  destroy(): void
}

export function createCanvas(options: CanvasOptions = {}): Canvas {
  const {
    glOptions,
    view = document.createElement('canvas'),
    data = [],
  } = options

  const canvas = createContainer() as Canvas
  canvas.set('view', view)
  provideGl(canvas, glOptions)
  canvas.bind('width', () => canvas.gl.drawingBufferWidth)
  canvas.bind('height', () => canvas.gl.drawingBufferHeight)
  canvas.singleton('plugins', () => {
    const plugins = new Map()
    presetPlugins.forEach(plugin => {
      plugin.register?.(canvas)
      plugins.set(plugin.name, plugin)
    })
    return plugins
  })
  canvas.singleton('beforeRenderPlugins', () => Array.from(canvas.plugins.values()).filter(plugin => 'beforeRender' in plugin))
  canvas.singleton('renderPlugins', () => Array.from(canvas.plugins.values()).filter(plugin => 'render' in plugin))
  canvas.singleton('afterRenderPlugins', () => Array.from(canvas.plugins.values()).filter(plugin => 'afterRender' in plugin))
  canvas.set('shapes', new Map())
  canvas.set('materials', new Map())
  canvas.set('textures', new Map())
  canvas.set('data', data)
  canvas.set('registerShape', (shape: any) => registerShape(canvas, shape))
  canvas.set('registerMaterial', (options: any) => registerMaterial(canvas, options))
  canvas.set('registerTexture', (options: any) => registerTexture(canvas, options))
  canvas.set('renderNode', (options: any) => renderNode(canvas, options))
  canvas.set('render', (time: any) => render(canvas, time))
  canvas.set('startRenderLoop', () => startRenderLoop(canvas))
  function onLost(event: WebGLContextEvent) {
    event.preventDefault()
    setTimeout(() => {
      canvas.gl.isContextLost() && canvas.glExtensions.loseContext?.restoreContext()
    }, 0)
  }
  function onRestored() {}
  view.addEventListener?.('webglcontextlost', onLost as any, false)
  view.addEventListener?.('webglcontextrestored', onRestored, false)
  canvas.set('destroy', () => {
    view.removeEventListener?.('webglcontextlost', onLost as any)
    view.removeEventListener?.('webglcontextrestored', onRestored)
    canvas.gl.useProgram(null)
    canvas.glExtensions.loseContext?.loseContext()
  })

  return canvas
}
