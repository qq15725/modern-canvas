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
  bumpGeometryRevision,
  Color,
  Input,
  MainLoop,
} from '../../core'
import { FxaaMaterial, QuadUvGeometry } from '../resources'
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

/** 语义色 token 调色板：token 名 → 各主题实际色（如 { surface: { light: '#fff', dark: '#1e1e1e' } }）。 */
export type ThemeTokens = Record<string, Record<string, string>>

export interface SceneTreeProperties extends MainLoopProperties {
  msaa: boolean
  fxaa: boolean
  pixelate: boolean
  roundPixels: boolean
  backgroundColor: Hex8Color
  /** 当前主题名（默认 'light'）。元素颜色为 `@token` 时按此主题查 themeTokens 解析。 */
  theme: string
  /** token 调色板；由宿主注入，引擎自身不含具体颜色。 */
  themeTokens: ThemeTokens
  // internal
  debug: boolean
  processPaused: boolean
  fonts: Fonts
  timeline: Timeline
}

export class SceneTree extends MainLoop {
  @property({ alias: 'root.msaa' }) declare msaa: boolean
  /** 最终合成时做 FXAA 后处理（零额外 pass / 显存，MSAA 之外的轻量抗锯齿路线）。 */
  @property({ fallback: false }) declare fxaa: boolean
  /** 描边流动效果的高亮色（如主题主色）；见 Element2DOutline.flow。 */
  @property() declare flowColor?: Hex8Color
  /** 流动亮段的间距（路径像素，亮段约占其 30%）；固定物理尺度，长短线亮段一致。 */
  @property() declare flowPeriod?: number
  @property({ fallback: false }) declare pixelate: boolean
  @property({ fallback: false }) declare roundPixels: boolean
  @property() declare backgroundColor?: Hex8Color
  /** 语义色主题；变更时重解析全树 token 色。见 resolveThemeColor。 */
  @property({ fallback: 'light' }) declare theme: string
  @property() declare themeTokens?: ThemeTokens
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
  protected _flowColor = new Color()
  protected _flowColorArray?: Float32Array
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

  /**
   * 语义色 token 解析：`@token` → 当前主题下的实际色。
   * 非 token（普通颜色字符串/数值）原样返回；token 未在调色板命中时也原样返回（安全回退）。
   */
  resolveThemeColor<T = any>(value: T): T | string {
    if (typeof value !== 'string' || value[0] !== '@') {
      return value
    }
    const token = value.slice(1)
    const resolved = this.themeTokens?.[token]?.[this.theme]
    return resolved ?? value
  }

  /** 主题 / 调色板变更后，重解析全树元素的 token 色（bg/border 即时重设，文字重排重栅格）。 */
  protected _applyThemeToTree(): void {
    this.nodeMap.forEach((node) => {
      (node as any).applyThemeColors?.()
    })
  }

  constructor(properties?: Partial<SceneTreeProperties>) {
    super()
    // A node entering/leaving changes no geometry, but it does change what an id
    // resolves to — connections cache their route against this revision and would
    // otherwise keep serving a path routed to a node that is no longer in the tree.
    this.on('nodeEnter', (node) => {
      this.nodeMap.set(node.id, node)
      // 元素构造期 apply style 时 tree 尚未挂上，token 色解析不到主题；入树后补解析一次。
      ;(node as any).applyThemeColors?.()
      bumpGeometryRevision()
    })
    this.on('nodeExit', (node) => {
      this.nodeMap.delete(node.id)
      bumpGeometryRevision()
    })
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
      case 'flowColor':
        this._flowColor.value = value ?? 0x3B82F6
        this._flowColorArray = new Float32Array(this._flowColor.toArray().slice(0, 3))
        break
      case 'fonts':
        this._bindFonts(value)
        this._scheduleTextRemeasure()
        break
      case 'theme':
      case 'themeTokens':
        this._applyThemeToTree()
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
    // restart flush ordinals so each flush pairs with its slot from last frame
    // (enables the batcher's static-frame buffer reuse)
    renderer.batch2D.beginFrame()
    if (this._flowColorArray) {
      renderer.batch2D.effectUniforms.uFlowColor = this._flowColorArray
    }
    if (this.flowPeriod) {
      renderer.batch2D.effectUniforms.uFlowPeriod = this.flowPeriod
    }
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
    if (this.fxaa) {
      // AA happens inside the composite draw that runs anyway — no extra pass
      QuadUvGeometry.draw(renderer, FxaaMaterial.instance, {
        sampler: 0,
        texelSize: [
          1 / (texture.pixelWidth || texture.width || 1),
          1 / (texture.pixelHeight || texture.height || 1),
        ],
      })
    }
    else {
      QuadUvGeometry.draw(renderer)
    }
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
