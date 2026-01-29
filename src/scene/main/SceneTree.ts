import type { Fonts } from 'modern-font'
import type { Hex8Color } from 'modern-idoc'
import type {
  GlRenderer,
  InputEvents,
  MainLoopEvents,
  MainLoopProperties,
} from '../../core'
import type { Node } from './Node'
import type { Viewport } from './Viewport'
import { fonts } from 'modern-font'
import { property } from 'modern-idoc'
import {
  Color,
  Input,
  MainLoop,
} from '../../core'
import { QuadUvGeometry } from '../resources'
import { RenderStack } from './RenderStack'
import { Timeline } from './Timeline'
import { Window } from './Window'

export interface SceneTreeEvents extends MainLoopEvents, InputEvents {
  processing: []
  processed: []
  rendering: []
  rendered: []
  nodeEnter: [node: Node]
  nodeExit: [node: Node]
  nodeProcessing: [node: Node]
  nodeProcessed: [node: Node]
}

export interface SceneTree {
  on: <K extends keyof SceneTreeEvents & string>(event: K, listener: (...args: SceneTreeEvents[K]) => void) => this
  once: <K extends keyof SceneTreeEvents & string>(event: K, listener: (...args: SceneTreeEvents[K]) => void) => this
  off: <K extends keyof SceneTreeEvents & string>(event: K, listener: (...args: SceneTreeEvents[K]) => void) => this
  emit: <K extends keyof SceneTreeEvents & string>(event: K, ...args: SceneTreeEvents[K]) => this
}

export interface SceneTreeProperties extends MainLoopProperties {
  msaa: boolean
  pixelate: boolean
  roundPixels: boolean
  backgroundColor: Hex8Color
  // internal
  debug: boolean
  processPaused: boolean
  fonts: Fonts
  timeline: Timeline
}

export class SceneTree extends MainLoop {
  @property({ alias: 'root.msaa' }) declare msaa: boolean
  @property({ fallback: false }) declare pixelate: boolean
  @property({ fallback: false }) declare roundPixels: boolean
  @property() declare backgroundColor?: Hex8Color
  @property({ internal: true, fallback: false }) declare debug: boolean
  @property({ internal: true, fallback: false }) declare processPaused: boolean
  @property({ internal: true, default: () => fonts }) declare fonts: Fonts | undefined

  readonly input = new Input()
  readonly renderStack = new RenderStack()
  readonly root = new Window().setTree(this)
  readonly timeline = new Timeline().setTree(this)

  protected _backgroundColor = new Color()
  protected _previousViewport?: Viewport
  protected _currentViewport?: Viewport
  getPreviousViewport(): Viewport | undefined { return this._previousViewport }
  getCurrentViewport(): Viewport | undefined { return this._currentViewport }
  setCurrentViewport(viewport: Viewport | undefined): void {
    if (this._currentViewport && !this._currentViewport.equal(viewport)) {
      this._previousViewport = this._currentViewport
    }
    this._currentViewport = viewport
  }

  constructor(properties?: Partial<SceneTreeProperties>) {
    super()
    this.setProperties(properties)
  }

  protected override _updateProperty(key: string, value: any, oldValue: any): void {
    super._updateProperty(key, value, oldValue)

    switch (key) {
      case 'backgroundColor':
        this._backgroundColor.value = value
        break
    }
  }

  log(...args: any[]): void {
    if (this.debug) {
      // eslint-disable-next-line no-console
      console.log(`[modern-canvas][${performance.now().toFixed(4)}ms]`, ...args)
    }
  }

  protected _process(delta = 0): void {
    this.timeline.emit('process', delta)
    this.emit('processing')
    this.root.emit('process', delta)
    this.emit('processed')
  }

  protected _render(renderer: GlRenderer): void {
    this.emit('rendering')
    this.renderStack.render(renderer)
    this._renderScreen(renderer)
    this.emit('rendered')
  }

  protected _renderScreen(renderer: GlRenderer): void {
    this.root.finish(renderer)
    renderer.state.reset()
    renderer.renderTarget.unbind()
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
    texture.inactivate(renderer)
  }

  override destroy(): void {
    this.root.destroy()
    this.input.destroy()
    super.destroy()
  }
}
