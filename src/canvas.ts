import { render, startRenderLoop } from './render'
import { createContainer } from './container'
import { presetPlugins } from './plugins'
import { registerProgram, useProgram } from './program'
import { registerTexture } from './texture'
import { registerBuffer } from './buffer'
import { provideGl } from './gl'
import type { GlBufferTargets, GlDrawModes, GlExtensions, GlSlTypes } from './gl'
import type { Node } from './types'
import type { Program, RegisterProgramOptions, UseProgramOptions } from './program'
import type { Plugin } from './plugin'
import type { RegisterTextureOptions, Texture } from './texture'
import type { Container } from './container'
import type { Buffer, RegisterBufferOptions } from './buffer'

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
  glBufferTargets: GlBufferTargets
  glDrawModes: GlDrawModes
  glSlTypes: GlSlTypes
  glExtensions: GlExtensions

  width: number
  height: number

  plugins: Map<string, Plugin>
  beforeRenderPlugins: Plugin[]
  renderPlugins: Plugin[]
  afterRenderPlugins: Plugin[]

  programs: Map<string, Program>
  buffers: Map<string, Buffer>
  textures: Map<string, Texture>
  registerBuffer(options: RegisterBufferOptions): void
  registerTexture(options: RegisterTextureOptions): void
  registerProgram(options: RegisterProgramOptions): void
  getProgram(name: string): Program
  useProgram(options: UseProgramOptions): void
  boot(): Promise<void>
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
  canvas.set('programs', new Map())
  canvas.set('buffers', new Map())
  canvas.set('textures', new Map())
  canvas.set('data', data)
  canvas.set('registerBuffer', (options: any) => registerBuffer(canvas, options))
  canvas.set('registerTexture', (options: any) => registerTexture(canvas, options))
  canvas.set('registerProgram', (options: any) => registerProgram(canvas, options))
  canvas.set('useProgram', (options: any) => useProgram(canvas, options))
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
