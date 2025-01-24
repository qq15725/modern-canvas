import type {
  ColorValue,
  EventListenerOptions,
  EventListenerValue,
  PropertyDeclaration,
  WebGLBlendMode,
  WebGLRenderer } from '../../core'
import type { Texture2D } from '../resources'
import type { CanvasBatchable } from './CanvasContext'
import type { Node } from './Node'
import type { TimelineNodeEventMap, TimelineNodeProperties } from './TimelineNode'
import { clamp, Color, customNode, property, protectedProperty } from '../../core'
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
  @property() declare modulate?: ColorValue
  @property() declare blendMode?: WebGLBlendMode
  @protectedProperty({ default: true }) declare visible: boolean
  @protectedProperty({ default: 1 }) declare opacity: number

  protected _parentGlobalVisible?: boolean
  protected _globalVisible?: boolean
  get globalVisible(): boolean { return this._globalVisible ?? true }

  protected _parentGlobalOpacity?: number
  protected _globalOpacity?: number
  get globalOpacity(): number { return this._globalOpacity ?? 1 }

  protected _modulate = new Color(0xFFFFFFFF)
  protected _backgroundImage?: Texture2D

  // Batch render
  context = new CanvasContext()
  protected _resetContext = true
  protected _redrawing = false
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

  protected override _updateProperty(key: PropertyKey, value: any, oldValue: any, declaration?: PropertyDeclaration): void {
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
    this.requestUpdate()
  }

  requestRelayout(): void {
    this._relayouting = true
    this.requestUpdate()
  }

  requestRepaint(): void {
    this._repainting = true
    this.requestUpdate()
  }

  protected _updateGlobalVisible(): void {
    this._parentGlobalVisible = this.getParent<CanvasItem>()?.globalVisible
    this._globalVisible = this.visible && (this._parentGlobalVisible ?? true)
  }

  protected _updateGlobalOpacity(): void {
    this._parentGlobalOpacity = this.getParent<CanvasItem>()?.opacity
    const globalOpacity = clamp(0, this.opacity, 1)
      * (this._parentGlobalOpacity ?? 1)
    if (this._globalOpacity !== globalOpacity) {
      this._globalOpacity = globalOpacity
      this.requestRepaint()
    }
  }

  protected _relayout(batchables: CanvasBatchable[]): CanvasBatchable[] {
    return this._repaint(batchables)
  }

  protected _repaint(batchables: CanvasBatchable[]): CanvasBatchable[] {
    // const colorMatrix = this.style.getComputedFilterColorMatrix()
    return batchables.map((batchable) => {
      return {
        ...batchable,
        modulate: this._modulate.toArgb(this.globalOpacity, true),
        // backgroundColor: this.style.getComputedBackgroundColor().abgr,
        // colorMatrix: colorMatrix.toMatrix4().toArray(true),
        // colorMatrixOffset: colorMatrix.toVector4().toArray(),
        blendMode: this.blendMode,
      }
    })
  }

  protected _draw(): void {
    //
  }

  protected override _update(): void {
    const parent = this.getParent<CanvasItem>()

    if (this._parentGlobalVisible !== parent?.globalVisible) {
      this._updateGlobalVisible()
    }

    if (this._parentGlobalOpacity !== parent?.globalOpacity) {
      this._updateGlobalOpacity()
    }

    let batchables: CanvasBatchable[] | undefined
    if (this._redrawing) {
      this.emit('draw')
      this._draw()
      this._originalBatchables = this.context.toBatchables()
      batchables = this._relayout(this._originalBatchables)
      if (this._resetContext) {
        this.context.reset()
      }
    }
    else if (this._relayouting) {
      this._layoutedBatchables = this._relayout(this._originalBatchables)
      batchables = this._layoutedBatchables
    }
    else if (this._repainting) {
      batchables = this._repaint(this._layoutedBatchables)
    }

    if (batchables) {
      this._batchables = batchables
      this._redrawing = false
      this._relayouting = false
      this._repainting = false
    }
  }

  protected override _render(renderer: WebGLRenderer): void {
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
