import type { Batchable2D, ColorValue, WebGLBlendMode, WebGLRenderer } from '../../core'
import type { Texture2D } from '../resources'
import type { CanvasBatchable } from './CanvasContext'
import type { Node } from './Node'
import type { TimelineNodeEvents, TimelineNodeProperties } from './TimelineNode'
import { property } from 'modern-idoc'
import { clamp, Color, customNode, Transform2D } from '../../core'
import { ViewportTexture } from '../resources'
import { CanvasContext } from './CanvasContext'
import { TimelineNode } from './TimelineNode'

export interface CanvasItemProperties extends TimelineNodeProperties {
  modulate: ColorValue
  blendMode: WebGLBlendMode
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
  @property() declare modulate: ColorValue | undefined
  @property() declare blendMode: WebGLBlendMode | undefined
  @property({ internal: true, fallback: true }) declare visible: boolean
  @property({ internal: true, fallback: 1 }) declare opacity: number

  protected _parentGlobalVisible?: boolean
  protected _globalVisible?: boolean
  get globalVisible(): boolean { return this._globalVisible ?? true }

  protected _parentGlobalOpacity?: number
  protected _globalOpacity?: number
  get globalOpacity(): number { return this._globalOpacity ?? 1 }

  protected _modulate = new Color(0xFFFFFFFF)

  // Batch render
  context = new CanvasContext()
  protected _resetContext = true
  protected _redrawing = true
  protected _relayouting = false
  protected _repainting = false
  protected _originalBatchables: CanvasBatchable[] = []
  protected _layoutedBatchables: CanvasBatchable[] = []
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
      case 'modulate':
        this._modulate.value = value
        this.requestRepaint()
        break
      case 'blendMode':
        this.requestRepaint()
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

  requestRedraw(): void {
    this._redrawing = true
  }

  requestRelayout(): void {
    this._relayouting = true
  }

  requestRepaint(): void {
    this._repainting = true
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
      this.requestRepaint()
    }
  }

  protected _draw(): void {
    this.emit('draw')
  }

  protected _redraw(): CanvasBatchable[] {
    this._tree?.log(this.name, 'drawing')
    this._draw()
    return this.context.toBatchables()
  }

  protected _relayout(batchables: CanvasBatchable[]): CanvasBatchable[] {
    this._tree?.log(this.name, 'layouting')
    return batchables
  }

  protected _repaint(batchables: CanvasBatchable[]): CanvasBatchable[] {
    this._tree?.log(this.name, 'painting')
    const globalOpacity = this.globalOpacity
    return batchables.map((batchable) => {
      return {
        ...batchable,
        modulate: this._modulate.toInt8Array().map(v => v * globalOpacity),
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
    const redrawing = this._redrawing
    let relayouting = this._relayouting
    let repainting = this._repainting

    let batchables: CanvasBatchable[] | undefined
    if (redrawing) {
      this._originalBatchables = this._redraw()
      relayouting = true
    }

    if (relayouting) {
      this._layoutedBatchables = this._relayout(this._originalBatchables)
      repainting = true
    }

    if (repainting) {
      batchables = this._repaint(this._layoutedBatchables)
    }

    if (redrawing) {
      if (this._resetContext) {
        this.context.reset()
      }
    }

    if (batchables) {
      this._batchables = batchables
      this._redrawing = false
      this._relayouting = false
      this._repainting = false
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

  protected override _render(renderer: WebGLRenderer): void {
    this._updateBatchables()

    const pixelate = this._tree?.pixelate

    this._batchables.forEach((batchable) => {
      let texture = batchable.texture
      if (texture instanceof ViewportTexture) {
        texture = this._handleViewportTexture(batchable)
      }
      else {
        texture?.upload(renderer)
      }

      renderer.batch2D.render({
        ...batchable,
        size: pixelate ? batchable.size : undefined,
        texture: texture?._glTexture(renderer),
      })
    })

    super._render(renderer)
  }
}
