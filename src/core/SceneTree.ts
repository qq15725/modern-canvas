import type { WebGLRenderer } from '../renderer'
import type { EventListenerOptions, EventListenerValue } from '../shared'
import type { MainLoopEventMap } from './MainLoop'
import type { Node } from './Node'
import { QuadUvGeometry } from './geometries'
import { MainLoop } from './MainLoop'
import { RenderStack } from './RenderStack'
import { Timer } from './Timer'
import { Viewport } from './Viewport'

export interface SceneTreeEventMap extends MainLoopEventMap {
  processing: () => void
  processed: () => void
  nodeProcessing: (node: Node) => void
  nodeProcessed: (node: Node) => void
}

export interface SceneTree {
  on: (<K extends keyof SceneTreeEventMap>(type: K, listener: SceneTreeEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  off: (<K extends keyof SceneTreeEventMap>(type: K, listener: SceneTreeEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  emit: (<K extends keyof SceneTreeEventMap>(type: K, ...args: Parameters<SceneTreeEventMap[K]>) => boolean)
    & ((type: string, ...args: any[]) => boolean)
}

export class SceneTree extends MainLoop {
  readonly renderStack = new RenderStack()
  readonly root = new Viewport(true)._setTree(this)
  readonly timeline = new Timer({ loop: true })._setTree(this)

  protected _currentViewport?: Viewport
  getCurrentViewport(): Viewport | undefined { return this._currentViewport }
  setCurrentViewport(viewport: Viewport | undefined): void { this._currentViewport = viewport }

  protected _render(renderer: WebGLRenderer, delta = 0): this {
    this.timeline.addTime(delta)
    this.emit('processing')
    this.root.emit('process', delta)
    this.emit('processed')
    renderer.program.uniforms.projectionMatrix = this.root.toProjectionArray(true)
    this.renderStack.render(renderer)
    this._renderScreen(renderer)
    return this
  }

  protected _renderScreen(renderer: WebGLRenderer): void {
    renderer.state.reset()
    const pixelRatio = renderer.pixelRatio
    const { width, height } = this.root
    renderer.framebuffer.bind(null)
    renderer.viewport.bind({
      x: 0,
      y: 0,
      width: width * pixelRatio,
      height: height * pixelRatio,
    })
    renderer.clear()
    const texture = this.root.texture
    texture.activate(renderer, 0)
    QuadUvGeometry.draw(renderer)
    renderer.texture.unbind(texture)
  }
}
