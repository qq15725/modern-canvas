import { render } from './render'
import { createContainer } from './container'
import { bufferPlugin, fadePlugin, imagePlugin, positionTransformPlugin } from './plugins'
import { registerProgram, useProgram } from './program'
import { registerTexture } from './texture'
import { draw } from './draw'
import { registerPlugin } from './plugin'
import { registerBuffer } from './buffer'
import { provideGl } from './gl'
import type { GlBufferTargets, GlDrawModes, GlExtensions, GlSlTypes } from './gl'
import type { Node } from './types'
import type { Program, RegisterProgramOptions, UseProgramOptions } from './program'
import type { Plugin, RegisterPluginOptions } from './plugin'
import type { RegisterTextureOptions, Texture } from './texture'
import type { Container } from './container'
import type { Buffer, RegisterBufferOptions } from './buffer'

export interface CanvasOptions {
  view?: HTMLCanvasElement
  glOptions?: WebGLContextAttributes
}

export interface Canvas extends Container {
  view: HTMLCanvasElement
  width: number
  height: number

  gl: WebGLRenderingContext
  glDefaultTexture: WebGLTexture
  glDefaultFramebuffers: { glFramebuffer: WebGLFramebuffer; glTexture: WebGLTexture }[]
  glBufferTargets: GlBufferTargets
  glDrawModes: GlDrawModes
  glSlTypes: GlSlTypes
  glExtensions: GlExtensions

  plugins: Plugin[]
  programs: Map<string, Program>
  buffers: Map<string, Buffer>
  textures: Map<string, Texture>
  children: Node[]
  registerPlugin(options: RegisterPluginOptions): void
  registerBuffer(options: RegisterBufferOptions): void
  registerTexture(options: RegisterTextureOptions): void
  registerProgram(options: RegisterProgramOptions): void
  getProgram(name: string): Program
  useProgram(options: UseProgramOptions): void
  boot(): Promise<void>
  draw(time?: number): void
  render(): void
  destroy(): void
}

const presetPlugins = [
  bufferPlugin,
  imagePlugin,
  fadePlugin,
  positionTransformPlugin,
]

export function createCanvas(options: CanvasOptions = {}): Canvas {
  const {
    view = document.createElement('canvas'),
    glOptions,
  } = options

  const canvas = createContainer() as Canvas
  canvas.set('view', view)
  provideGl(canvas, glOptions)
  canvas.bind('width', () => canvas.gl.drawingBufferWidth)
  canvas.bind('height', () => canvas.gl.drawingBufferHeight)
  canvas.set('plugins', [])
  canvas.set('programs', new Map())
  canvas.set('buffers', new Map())
  canvas.set('textures', new Map())
  canvas.set('children', [])
  canvas.set('registerPlugin', (options: any) => registerPlugin(canvas, options))
  canvas.set('registerBuffer', (options: any) => registerBuffer(canvas, options))
  canvas.set('registerTexture', (options: any) => registerTexture(canvas, options))
  canvas.set('registerProgram', (options: any) => registerProgram(canvas, options))
  canvas.set('useProgram', (options: any) => useProgram(canvas, options))
  canvas.set('draw', (time: any) => draw(canvas, time))
  canvas.set('render', () => render(canvas))
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

  presetPlugins.forEach(plugin => canvas.registerPlugin(plugin))

  return canvas
}
