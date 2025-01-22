import type {
  ColorValue,
  EventListenerOptions,
  EventListenerValue,
  MainLoopEventMap,
  PropertyDeclaration, WebGLRenderer } from '../../core'
import type { Node } from './Node'
import { Color, Input, MainLoop, property,
} from '../../core'
import { QuadUvGeometry } from '../resources'
import { RenderStack } from './RenderStack'
import { Timeline } from './Timeline'
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
  once: (<K extends keyof SceneTreeEventMap>(type: K, listener: SceneTreeEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  off: (<K extends keyof SceneTreeEventMap>(type: K, listener?: SceneTreeEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  emit: (<K extends keyof SceneTreeEventMap>(type: K, ...args: Parameters<SceneTreeEventMap[K]>) => boolean)
    & ((type: string, ...args: any[]) => boolean)
}

export class SceneTree extends MainLoop {
  @property({ default: false }) declare paused: boolean
  @property() declare backgroundColor?: ColorValue

  readonly input = new Input()
  readonly renderStack = new RenderStack()
  readonly root = new Viewport(true).setTree(this)
  readonly timeline: Timeline

  protected _backgroundColor = new Color()
  protected _currentViewport?: Viewport
  getCurrentViewport(): Viewport | undefined { return this._currentViewport }
  setCurrentViewport(viewport: Viewport | undefined): void { this._currentViewport = viewport }

  constructor(timeline = new Timeline()) {
    super()

    this.timeline = timeline.setTree(this)
  }

  protected override _updateProperty(key: PropertyKey, value: any, oldValue: any, declaration?: PropertyDeclaration): void {
    super._updateProperty(key, value, oldValue, declaration)

    switch (key) {
      case 'backgroundColor':
        this._backgroundColor.value = value
        break
    }
  }

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
    const { pixelRatio } = renderer
    const { width, height } = this.root
    renderer.framebuffer.bind(null)
    renderer.viewport.bind({
      x: 0,
      y: 0,
      width: width * pixelRatio,
      height: height * pixelRatio,
    })
    if (this.backgroundColor) {
      renderer.gl.clearColor(...this._backgroundColor.toArray())
    }
    renderer.clear()
    if (this.backgroundColor) {
      renderer.gl.clearColor(0, 0, 0, 0)
    }
    const texture = this.root.texture
    texture.activate(renderer, 0)
    QuadUvGeometry.draw(renderer)
    renderer.texture.unbind(texture)
  }

  override free(): void {
    super.free()
    this.root.getChildren(true)
      .forEach(node => this.root.removeChild(node))
    this.input.removeEventListeners()
  }
}
