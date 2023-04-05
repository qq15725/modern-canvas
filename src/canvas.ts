import { createContainer } from './container'
import { imagePlugin, nodePlugin } from './plugins'
import { registerProgram, useProgram } from './program'
import { registerTexture } from './texture'
import { draw } from './draw'
import { registerPlugin } from './plugin'
import type { Node } from './types'
import type { Program, RegisterProgramOptions, UseProgramOptions } from './program'
import type { Plugin, RegisterPluginOptions } from './plugin'
import type { RegisterTextureOptions, Texture } from './texture'
import type { Container } from './container'

export interface CanvasOptions {
  view?: HTMLCanvasElement
  glOptions?: WebGLContextAttributes
}

export interface Canvas extends Container {
  view: HTMLCanvasElement
  gl: WebGLRenderingContext
  glExtensions: {
    loseContext: WEBGL_lose_context | null
  }
  plugins: Map<string, Plugin[]>
  programs: Map<string, Program>
  textures: Map<string, Texture>
  children: Node[]
  registerPlugin(options: RegisterPluginOptions): void
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
  nodePlugin,
  imagePlugin,
]

export function createCanvas(options: CanvasOptions = {}): Canvas {
  const {
    view = document.createElement('canvas'),
    glOptions,
  } = options

  const canvas = createContainer() as Canvas
  canvas.set('view', view)
  canvas.singleton('gl', () => {
    // init webgl context TODO support webgl2
    const gl = (
      view.getContext('webgl', glOptions)
      || view.getContext('experimental-webgl', glOptions)
    ) as WebGLRenderingContext
    if (!gl) throw new Error('failed to getContext for webgl')
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    return gl
  })
  canvas.singleton('glExtensions', () => ({
    loseContext: canvas.gl.getExtension('WEBGL_lose_context'),
  }))
  canvas.set('plugins', new Map())
  canvas.set('programs', new Map())
  canvas.set('textures', new Map())
  canvas.set('children', [])
  canvas.set('registerPlugin', (options: any) => registerPlugin(canvas, options))
  canvas.set('registerTexture', (options: any) => registerTexture(canvas, options))
  canvas.set('registerProgram', (options: any) => registerProgram(canvas, options))
  canvas.set('useProgram', (options: any) => useProgram(canvas, options))
  canvas.set('boot', async () => {
    const { children, plugins } = canvas
    async function boot(node: Node) {
      const usePlugins = plugins.get(node.type)
      if (usePlugins) {
        for (let len = usePlugins.length, i = 0; i < len; i++) {
          await usePlugins[i].boot?.(canvas, node)
        }
      }
      const { children } = node
      if (!children) return
      for (let len = children.length, i = 0; i < len; i++) {
        await boot(children[i])
      }
    }
    for (let len = children.length, i = 0; i < len; i++) {
      await boot(children[i])
    }
  })
  canvas.set('draw', (time: any) => draw(canvas, time))
  canvas.set('render', () => {
    let then = 0
    let time = 0
    function mainLoop(now: number) {
      canvas.draw(time)
      now *= 0.001
      time += now - then
      then = now
      requestAnimationFrame(mainLoop)
    }
    requestAnimationFrame(mainLoop)
  })
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
