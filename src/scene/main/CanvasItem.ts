import type { EventListenerOptions, EventListenerValue, PropertyDeclaration } from 'modern-idoc'
import type {
  ColorValue,
  WebGLBlendMode,
  WebGLRenderer,
} from '../../core'
import type { CanvasBatchable } from './CanvasContext'
import type { Node } from './Node'
import type { TimelineNodeEventMap, TimelineNodeProperties } from './TimelineNode'
import { property } from 'modern-idoc'
import { clamp, Color, customNode } from '../../core'
import { CanvasContext } from './CanvasContext'
import { TimelineNode } from './TimelineNode'

export interface CanvasItemProperties extends TimelineNodeProperties {
  modulate: ColorValue
  blendMode: WebGLBlendMode
}

export interface CanvasItemEventMap extends TimelineNodeEventMap {
  draw: () => void
}

export interface CanvasItem {
  on: (<K extends keyof CanvasItemEventMap>(type: K, listener: CanvasItemEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  once: (<K extends keyof CanvasItemEventMap>(type: K, listener: CanvasItemEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  off: (<K extends keyof CanvasItemEventMap>(type: K, listener?: CanvasItemEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  emit: (<K extends keyof CanvasItemEventMap>(type: K, ...args: Parameters<CanvasItemEventMap[K]>) => boolean)
    & ((type: string, ...args: any[]) => boolean)
}

@customNode('CanvasItem')
export class CanvasItem extends TimelineNode {
  @property() declare modulate: ColorValue | undefined
  @property() declare blendMode: WebGLBlendMode | undefined
  @property({ protected: true, fallback: true }) declare visible: boolean
  @property({ protected: true, fallback: 1 }) declare opacity: number

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

  protected override _updateProperty(key: string, value: any, oldValue: any, declaration?: PropertyDeclaration): void {
    super._updateProperty(key, value, oldValue, declaration)

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
    this.log(this.name, 'drawing')
    this._draw()
    return this.context.toBatchables()
  }

  protected _relayout(batchables: CanvasBatchable[]): CanvasBatchable[] {
    this.log(this.name, 'layouting')
    return batchables
  }

  protected _repaint(batchables: CanvasBatchable[]): CanvasBatchable[] {
    this.log(this.name, 'painting')
    return batchables.map((batchable) => {
      return {
        ...batchable,
        modulate: this._modulate.toArgb(this.globalOpacity, true),
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

  protected override _render(renderer: WebGLRenderer): void {
    this._updateBatchables()

    this._batchables.forEach((batchable) => {
      batchable.texture?.upload(renderer)

      renderer.batch2D.render({
        ...batchable,
        texture: batchable.texture?._glTexture(renderer),
      })
    })

    super._render(renderer)
  }
}
