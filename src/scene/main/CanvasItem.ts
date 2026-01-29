import type { Batchable2D, GlBlendMode, GlRenderer } from '../../core'
import type { Texture2D } from '../resources'
import type { CanvasBatchable } from './CanvasContext'
import type { Node } from './Node'
import type { TimelineNodeEvents, TimelineNodeProperties } from './TimelineNode'
import { property } from 'modern-idoc'
import { clamp, customNode, Transform2D } from '../../core'
import { ViewportTexture } from '../resources'
import { CanvasContext } from './CanvasContext'
import { TimelineNode } from './TimelineNode'

export interface CanvasItemProperties extends TimelineNodeProperties {
  blendMode: GlBlendMode
}

export interface CanvasItemEvents extends TimelineNodeEvents {
  draw: []
}

export interface CanvasItem {
  on: <K extends keyof CanvasItemEvents & string>(event: K, listener: (...args: CanvasItemEvents[K]) => void) => this
  once: <K extends keyof CanvasItemEvents & string>(event: K, listener: (...args: CanvasItemEvents[K]) => void) => this
  off: <K extends keyof CanvasItemEvents & string>(event: K, listener: (...args: CanvasItemEvents[K]) => void) => this
  emit: <K extends keyof CanvasItemEvents & string>(event: K, ...args: CanvasItemEvents[K]) => this
}

@customNode('CanvasItem')
export class CanvasItem extends TimelineNode {
  @property() declare blendMode: GlBlendMode | undefined
  protected _blendMode: GlBlendMode | undefined

  @property({ internal: true, fallback: true }) declare visible: boolean
  @property({ internal: true, fallback: 1 }) declare opacity: number

  protected _parentGlobalVisible?: boolean
  protected _globalVisible?: boolean
  get globalVisible(): boolean { return this._globalVisible ?? true }

  protected _parentGlobalOpacity?: number
  protected _globalOpacity?: number
  get globalOpacity(): number { return this._globalOpacity ?? 1 }

  protected _modulate: number[] = [255, 255, 255, 255]

  // Batch render
  context = new CanvasContext()
  protected _resetContext = true
  needsDraw = true
  needsLayout = false
  needsPaint = false
  protected _drawBatchables: CanvasBatchable[] = []
  protected _layoutBatchables: CanvasBatchable[] = []
  protected _batchables: CanvasBatchable[] = []

  constructor(properties?: Partial<CanvasItemProperties>, nodes: Node[] = []) {
    super()

    this
      .setProperties(properties)
      .append(nodes)
  }

  protected override _updateProperty(key: string, value: any, oldValue: any): void {
    super._updateProperty(key, value, oldValue)

    switch (key) {
      case 'blendMode':
        this._blendMode = value
        this.requestPaint()
        break
      case 'opacity':
        this._updateGlobalOpacity()
        break
      case 'visible':
        this._updateGlobalVisible()
        break
    }
  }

  protected override _updateInsideTimeRange(): void {
    const oldValue = this.insideTimeRange
    super._updateInsideTimeRange()
    if (oldValue !== this.insideTimeRange) {
      this._updateGlobalVisible()
    }
  }

  show(): void {
    this.visible = true
  }

  hide(): void {
    this.visible = false
  }

  isVisibleInTree(): boolean {
    return this.globalOpacity > 0 && this.globalVisible
  }

  override updateRenderable(): void {
    super.updateRenderable()
    this._renderable = this._renderable && this.isVisibleInTree()
  }

  requestDraw(): void {
    this.needsDraw = true
    this.requestRender()
  }

  requestLayout(): void {
    this.needsLayout = true
    this.requestRender()
  }

  requestPaint(): void {
    this.needsPaint = true
    this.requestRender()
  }

  protected _updateModulate(): void {
    this._modulate = [255, 255, 255, 255].map(v => v * this.globalOpacity)
  }

  protected _updateGlobalVisible(): void {
    this._parentGlobalVisible = this.getParent<CanvasItem>()?.globalVisible
    this._globalVisible = (this._parentGlobalVisible ?? true)
      && this.visible
      && this.insideTimeRange
    this.updateRenderable()
  }

  protected _updateGlobalOpacity(): void {
    this._parentGlobalOpacity = this.getParent<CanvasItem>()?.opacity
    const globalOpacity = clamp(this.opacity, 0, 1)
      * (this._parentGlobalOpacity ?? 1)
    if (this._globalOpacity !== globalOpacity) {
      this._globalOpacity = globalOpacity
      this._updateModulate()
      this.requestPaint()
      this.updateRenderable()
    }
  }

  protected _draw(): void {
    this.emit('draw')
  }

  protected _transformUvs(batchable: CanvasBatchable): Float32Array | undefined {
    const { texture, vertices, transformUv } = batchable
    if (!texture) {
      return undefined
    }
    const { width, height } = texture
    const transform = transformUv
      ?? ((uvs, i) => {
        uvs[i] = uvs[i] / width
        uvs[i + 1] = uvs[i + 1] / height
      })
    const uvs = vertices.slice()
    for (let len = uvs.length, i = 0; i < len; i += 2) {
      transform(uvs, i)
    }
    return uvs
  }

  protected _redraw(): CanvasBatchable[] {
    this._draw()
    return this.context.toBatchables().map((batchable) => {
      return {
        ...batchable,
        uvs: this._transformUvs(batchable),
      }
    })
  }

  protected _relayout(batchables: CanvasBatchable[], oldBatchables: CanvasBatchable[]): CanvasBatchable[] {
    return batchables.map((batchable, index) => {
      let vertices
      const len = batchable.vertices.length
      const oldVertices = oldBatchables[index]?.vertices
      if (oldVertices && oldVertices.length === len) {
        vertices = oldVertices
      }
      else {
        vertices = new Float32Array(len)
      }
      return {
        ...batchable,
        vertices,
      }
    })
  }

  protected _repaint(batchables: CanvasBatchable[]): CanvasBatchable[] {
    const modulate = this._modulate
    const blendMode = this._blendMode
    return batchables.map((batchable) => {
      return {
        ...batchable,
        modulate,
        blendMode,
      }
    })
  }

  protected override _process(delta: number): void {
    super._process(delta)

    const parent = this.getParent<CanvasItem>()

    if (this._parentGlobalVisible !== parent?.globalVisible) {
      this._updateGlobalVisible()
    }

    if (this._parentGlobalOpacity !== parent?.globalOpacity) {
      this._updateGlobalOpacity()
    }
  }

  protected _updateBatchables(): void {
    if (!this.needsRender) {
      return
    }

    const needsDraw = this.needsDraw
    let needsLayout = this.needsLayout
    let needsPaint = this.needsPaint

    let batchables: CanvasBatchable[] | undefined
    if (needsDraw) {
      this._drawBatchables = this._redraw()
      needsLayout = true
    }

    if (needsLayout) {
      this._layoutBatchables = this._relayout(this._drawBatchables, this._layoutBatchables)
      needsPaint = true
    }

    if (needsPaint) {
      batchables = this._repaint(this._layoutBatchables)
    }

    if (needsDraw) {
      if (this._resetContext) {
        this.context.reset()
      }
    }

    if (batchables) {
      this._batchables = batchables
      this.needsDraw = false
      this.needsLayout = false
      this.needsPaint = false
    }

    this.needsRender = false
  }

  protected _handleViewportTexture(batchable: Batchable2D): Texture2D | undefined {
    const viewport = this.tree?.getPreviousViewport()
    if (viewport) {
      if ('getRect' in this) {
        const { a, d, tx, ty } = viewport.canvasTransform
        const { vertices } = batchable
        const uvTransform = new Transform2D()
          .scale(1 / viewport.width * a, -1 / viewport.height * d)
          .translate(
            -(-tx) / viewport.width,
            1 + (-ty) / viewport.height,
          )
        const uvs = new Float32Array(vertices.length)
        for (let len = vertices.length, i = 0; i < len; i += 2) {
          const { x, y } = uvTransform.apply({ x: vertices[i], y: vertices[i + 1] })
          uvs[i] = x
          uvs[i + 1] = y
        }
        batchable.uvs = uvs
        return viewport.texture
      }
    }
    return undefined
  }

  protected override _render(renderer: GlRenderer): void {
    this._updateBatchables()

    const pixelate = this._tree?.pixelate
    const roundPixels = this._tree?.roundPixels
    const batchables = this._batchables

    for (let batchable, texture, len = batchables.length, i = 0; i < len; i++) {
      batchable = batchables[i]
      texture = batchable.texture
      if (texture instanceof ViewportTexture) {
        texture = this._handleViewportTexture(batchable)
      }
      renderer.batch2D.render({
        ...batchable,
        roundPixels,
        size: pixelate ? batchable.size : undefined,
        texture,
      })
    }

    super._render(renderer)
  }
}
