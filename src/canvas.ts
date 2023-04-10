import { render } from './render'
import { createContainer } from './container'
import { registerMaterial } from './material'
import { provideGl } from './gl'
import { registerShape } from './shape'
import { registerNodeRenderer } from './node-renderer'
import { forEachNode } from './node'
import { registerResource } from './resource'
import type { InternalResource, Resource } from './resource'
import type { InternalShape, Shape } from './shape'
import type { GlDrawModes, GlExtensions, GlFramebuffer, GlSlTypes } from './gl'
import type { InternalNodeRenderer, NodeRenderer } from './node-renderer'
import type { Node } from './node'
import type { InternalMaterial, Material } from './material'
import type { Plugin } from './plugin'
import type { Container } from './container'

export interface CanvasOptions extends WebGLContextAttributes {
  view?: HTMLCanvasElement
  children?: Node[]
  plugins?: Plugin[]
}

export interface Canvas extends Container {
  view: HTMLCanvasElement
  children: Node[]

  gl: WebGLRenderingContext
  glDefaultTexture: WebGLTexture
  glFramebuffers: GlFramebuffer[]
  glDrawModes: GlDrawModes
  glSlTypes: GlSlTypes
  glExtensions: GlExtensions

  width: number
  height: number

  plugins: Map<string, Plugin>
  beforeRenderPlugins: Plugin[]
  afterRenderPlugins: Plugin[]

  shapes: Map<string, InternalShape>
  registerShape(shape: Shape): void

  materials: Map<string, InternalMaterial>
  registerMaterial(options: Material): void

  resources: Map<string, InternalResource>
  registerResource(options: Resource): void

  nodeRenderers: Map<string, InternalNodeRenderer>
  registerNodeRenderer(options: NodeRenderer): void

  forEachNode(callbackFn: (node: Node, path: number[]) => void): void

  load(): Promise<void>
  render(time?: number): void
  startRenderLoop(): void
  destroy(): void
}

export function createCanvas(options: CanvasOptions = {}): Canvas {
  const {
    view = document.createElement('canvas'),
    children = [],
    plugins: userPlugins = [],
  } = options

  const canvas = createContainer() as Canvas
  canvas.set('view', view)
  provideGl(canvas, options)
  canvas.bind('width', () => canvas.gl.drawingBufferWidth)
  canvas.bind('height', () => canvas.gl.drawingBufferHeight)
  canvas.singleton('plugins', () => {
    const plugins = new Map()
    userPlugins.forEach(plugin => {
      plugin.register?.(canvas)
      plugins.set(plugin.name, plugin)
    })
    return plugins
  })
  canvas.singleton('beforeRenderPlugins', () => Array.from(canvas.plugins.values()).filter(plugin => 'beforeRender' in plugin))
  canvas.singleton('afterRenderPlugins', () => Array.from(canvas.plugins.values()).filter(plugin => 'afterRender' in plugin))
  canvas.set('children', children)
  canvas.set('shapes', new Map())
  canvas.set('registerShape', (shape: any) => registerShape(canvas, shape))
  canvas.set('materials', new Map())
  canvas.set('registerMaterial', (material: any) => registerMaterial(canvas, material))
  canvas.set('resources', new Map())
  canvas.set('registerResource', (resource: any) => registerResource(canvas, resource))
  canvas.set('nodeRenderers', new Map())
  canvas.set('registerNodeRenderer', (nodeRenderer: any) => registerNodeRenderer(canvas, nodeRenderer))
  canvas.set('forEachNode', (callbackFn: any) => forEachNode(canvas, callbackFn))
  canvas.set('load', async () => {
    // TODO to be optimized
    canvas.get('plugins')
    const allRenderers = Array.from(canvas.nodeRenderers.values())
    canvas.forEachNode((node, path) => {
      const renderers = allRenderers.filter(renderer => {
        return (
          (!renderer.include && !renderer.exclude)
          || (renderer.include && renderer.include(node, path))
          || (renderer.exclude && !renderer.exclude(node, path))
        )
      })
      renderers.forEach(renderer => renderer.update?.(node, 0))
    })
    while (Array.from(canvas.resources.values()).some(resource => resource.loading)) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    return true
  })
  canvas.set('render', (time: any) => render(canvas, time))
  canvas.set('startRenderLoop', () => {
    let then = 0
    let time = 0

    renderLoop(0)

    function renderLoop(now: number) {
      requestAnimationFrame(renderLoop)
      render(canvas, time)
      now *= 0.001
      time += now - then
      then = now
    }
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

  return canvas
}
