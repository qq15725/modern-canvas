import type { Fonts } from 'modern-font'
import type { Hex8Color } from 'modern-idoc'
import type {
  InputEvents,
  MainLoopEvents,
  MainLoopProperties,
  WebGLRenderer,
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
  backgroundColor: Hex8Color
  // internal
  debug: boolean
  processPaused: boolean
  fonts: Fonts
  timeline: Timeline
}

export class SceneTree extends MainLoop {
  @property() declare backgroundColor?: Hex8Color
  @property({ internal: true, fallback: false }) declare debug: boolean
  @property({ internal: true, fallback: false }) declare processPaused: boolean
  @property({ internal: true, default: () => fonts }) declare fonts: Fonts | undefined
  @property({ internal: true, default: () => new Timeline() }) declare timeline: Timeline

  readonly input = new Input()
  readonly renderStack = new RenderStack()
  readonly root = new Window(true).setTree(this)

  protected _backgroundColor = new Color()
  protected _currentViewport?: Viewport
  getCurrentViewport(): Viewport | undefined { return this._currentViewport }
  setCurrentViewport(viewport: Viewport | undefined): void { this._currentViewport = viewport }

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
      case 'timeline':
        this.timeline.setTree(this)
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

  protected _render(renderer: WebGLRenderer): void {
    this.emit('rendering')
    this.renderStack.render(renderer)
    this._renderScreen(renderer)
    this.emit('rendered')
  }

  protected _renderScreen(renderer: WebGLRenderer): void {
    if (this.root.msaa) {
      renderer.framebuffer.finishRenderPass(
        this.root._glFramebuffer(renderer),
      )
    }
    renderer.state.reset()
    renderer.framebuffer.bind(null)
    renderer.gl.bindFramebuffer(renderer.gl.FRAMEBUFFER, null)
    renderer.viewport.bind({
      x: 0, y: 0,
      width: this.root.width * renderer.pixelRatio,
      height: this.root.height * renderer.pixelRatio,
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

  override destroy(): void {
    this.root.destroy()
    this.input.destroy()
    super.destroy()
  }
}
