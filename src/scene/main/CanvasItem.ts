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
  @property({ internal: true, fallback: true }) declare visible: boolean
  @property({ internal: true, fallback: 1 }) declare opacity: number

  protected _parentGlobalVisible?: boolean
  protected _globalVisible?: boolean
  get globalVisible(): boolean { return this._globalVisible ?? true }

  protected _parentGlobalOpacity?: number
  protected _globalOpacity?: number
  get globalOpacity(): number { return this._globalOpacity ?? 1 }

  // Batch render
  context = new CanvasContext()
  protected _resetContext = true
  needsRender = true
  needsLayout = false
  needsPaint = false
  protected _rawBatchables: CanvasBatchable[] = []
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
        this.requestPaint()
        break
      case 'opacity':
        this._updateGlobalOpacity()
        break
      case 'visible':
      case 'insideTimeRange':
        this._updateGlobalVisible()
        break
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

  override canRender(): boolean {
    return super.canRender() && this.isVisibleInTree()
  }

  requestRender(): void {
    this.needsRender = true
  }

  requestLayout(): void {
    this.needsLayout = true
  }

  requestPaint(): void {
    this.needsPaint = true
  }

  protected _updateGlobalVisible(): void {
    this._parentGlobalVisible = this.getParent<CanvasItem>()?.globalVisible
    this._globalVisible = (this._parentGlobalVisible ?? true)
      && this.visible
      && this.insideTimeRange
  }

  protected _updateGlobalOpacity(): void {
    this._parentGlobalOpacity = this.getParent<CanvasItem>()?.opacity
    const globalOpacity = clamp(this.opacity, 0, 1)
      * (this._parentGlobalOpacity ?? 1)
    if (this._globalOpacity !== globalOpacity) {
      this._globalOpacity = globalOpacity
      this.requestPaint()
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
    this._tree?.log(this.name, 'drawing')
    this._draw()
    return this.context.toBatchables().map((batchable) => {
      return {
        ...batchable,
        uvs: this._transformUvs(batchable),
      }
    })
  }

  protected _relayout(batchables: CanvasBatchable[]): CanvasBatchable[] {
    this._tree?.log(this.name, 'layouting')
    return batchables
  }

  protected _repaint(batchables: CanvasBatchable[]): CanvasBatchable[] {
    this._tree?.log(this.name, 'painting')
    return batchables.map((batchable) => {
      return {
        ...batchable,
        blendMode: this.blendMode,
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
    const needsRender = this.needsRender
    let needsLayout = this.needsLayout
    let needsPaint = this.needsPaint

    let batchables: CanvasBatchable[] | undefined
    if (needsRender) {
      this._rawBatchables = this._redraw()
      needsLayout = true
    }

    if (needsLayout) {
      this._layoutBatchables = this._relayout(this._rawBatchables)
      needsPaint = true
    }

    if (needsPaint) {
      batchables = this._repaint(this._layoutBatchables)
    }

    if (needsRender) {
      if (this._resetContext) {
        this.context.reset()
      }
    }

    if (batchables) {
      this._batchables = batchables
      this.needsRender = false
      this.needsLayout = false
      this.needsPaint = false
    }
  }

  protected _handleViewportTexture(batchable: Batchable2D): Texture2D | undefined {
    const viewport = this.tree?.getPreviousViewport()
    if (viewport) {
      if ('getRect' in this) {
        const { a, d, tx, ty } = viewport.canvasTransform.toObject()
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

    this._batchables.forEach((batchable) => {
      let texture = batchable.texture
      if (texture instanceof ViewportTexture) {
        texture = this._handleViewportTexture(batchable)
      }

      renderer.batch2D.render({
        ...batchable,
        roundPixels: this._tree?.roundPixels,
        texture,
      })
    })

    super._render(renderer)
  }
}
