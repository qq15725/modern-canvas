import type { Fonts } from 'modern-font'
import type { Hex8Color } from 'modern-idoc'
import type { ImagePipelineResolver } from '../2d/element/imagePipeline'
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
import { resetBatchPool } from './CanvasItem'
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
  timeline = new Timeline().setTree(this)

  /**
   * 图片处理管线解析器（实例级，非全局）。图片填充带 `imagePipelines` 时，
   * 子节点经 `this.tree?.imagePipelineResolver` 取用，把图片烘焙到运行时纹理。
   * 由宿主按引擎实例注入；未注入则不处理、沿用原图。
   */
  imagePipelineResolver?: ImagePipelineResolver

  readonly nodeMap = new Map<string, Node>()

  /** 已订阅 load 事件的 fonts 实例，用于在 fonts 切换 / 销毁时解绑。 */
  protected _boundFonts?: Fonts
  protected _textRemeasureScheduled = false
  protected _onFontLoad = (): void => this._scheduleTextRemeasure()

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

  getNodeById<T extends Node = Node>(id: string): T | undefined {
    return this.nodeMap.get(id) as T | undefined
  }

  constructor(properties?: Partial<SceneTreeProperties>) {
    super()
    this.on('nodeEnter', node => this.nodeMap.set(node.id, node))
    this.on('nodeExit', node => this.nodeMap.delete(node.id))
    this.setProperties(properties)
    // 字体可用后重排文字：setProperties 后 fonts 已就绪（默认即全局 fonts 单例）。
    this._bindFonts(this.fonts)
  }

  /** 订阅 fonts 的 load 事件，并在切换 fonts / 销毁时解绑，避免重复订阅与泄漏。 */
  protected _bindFonts(next?: Fonts): void {
    if (this._boundFonts === next) {
      return
    }
    this._boundFonts?.off('load', this._onFontLoad)
    this._boundFonts = next
    next?.on('load', this._onFontLoad)
  }

  /**
   * 字体到位后，重排树内全部文字（含表格 back 层单元格——它们也在 nodeMap）。
   * 一个 tick 内多次 load 合并为一次。文字创建时字体可能尚未就绪、按 0 宽 glyph 测量挤成一坨，
   * 这里在字体可用时自动重新测量，使所有消费方无需各自轮询字体状态。
   */
  protected _scheduleTextRemeasure(): void {
    if (this._textRemeasureScheduled) {
      return
    }
    this._textRemeasureScheduled = true
    queueMicrotask(() => {
      this._textRemeasureScheduled = false
      this.nodeMap.forEach((node) => {
        const text = (node as any).text
        if (text?.enabled && typeof text.update === 'function') {
          text.update()
        }
      })
    })
  }

  protected override _updateProperty(key: string, value: any, oldValue: any): void {
    super._updateProperty(key, value, oldValue)

    switch (key) {
      case 'backgroundColor':
        this._backgroundColor.value = value
        break
      case 'fonts':
        this._bindFonts(value)
        this._scheduleTextRemeasure()
        break
    }
  }

  override setProperties(properties?: Record<string, any>): this {
    if (properties) {
      const { timeline, ...rest } = properties

      if (timeline) {
        this.timeline = timeline?.setTree(this)
      }

      super.setProperties(rest)
    }

    return this
  }

  log(...args: any[]): void {
    if (this.debug) {
      // eslint-disable-next-line no-console
      console.log(`[modern-canvas][${performance.now().toFixed(4)}ms]`, ...args)
    }
  }

  protected _process(delta = 0): void {
    // The render stack is rebuilt from scratch every process pass. Clearing it
    // up front discards anything a prior `_process` left behind when it was not
    // followed by a `render` (notably the export pipeline's `waitUntilProcessed`).
    // Otherwise the scene gets queued twice and stateful effects render wrong.
    this.renderStack.reset()
    this.timeline.emit('process', delta)
    this.emit('processing')
    this.root.emit('process', delta)
    this.emit('processed')
  }

  protected _render(renderer: WebGLRenderer): void {
    this.emit('rendering')
    // reset the batch wrapper pool at frame start — last frame's render finished
    // synchronously, so all pooled references have already been consumed by flush
    resetBatchPool()
    this.renderStack.render(renderer)
    this._renderScreen(renderer)
    this.emit('rendered')
  }

  protected _renderScreen(renderer: WebGLRenderer): void {
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

  protected override _destroy(): void {
    super._destroy()
    this._bindFonts(undefined)
    this.root.destroy()
    this.input.destroy()
    this.nodeMap.clear()
  }
}
