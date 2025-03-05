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
    this._globalVisible = (this._parentGlobalVisible ?? true)
      && this.visible
      && this.insideTimeRange
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
    this._tree?.log(this.name, 'relayouting')
    return this._repaint(batchables)
  }

  protected _repaint(batchables: CanvasBatchable[]): CanvasBatchable[] {
    this._tree?.log(this.name, 'repainting')
    return batchables.map((batchable) => {
      return {
        ...batchable,
        modulate: this._modulate.toArgb(this.globalOpacity, true),
        blendMode: this.blendMode,
      }
    })
  }

  protected _draw(): void {
    this._tree?.log(this.name, 'redrawing')
  }

  protected override _update(): void {
    const parent = this.getParent<CanvasItem>()

    if (this._parentGlobalVisible !== parent?.globalVisible) {
      this._updateGlobalVisible()
    }

    if (this._parentGlobalOpacity !== parent?.globalOpacity) {
      this._updateGlobalOpacity()
    }

    const redrawing = this._redrawing
    let relayouting = this._relayouting
    let repainting = this._repainting

    let batchables: CanvasBatchable[] | undefined
    if (redrawing) {
      this.emit('draw')
      this._draw()
      this._originalBatchables = this.context.toBatchables()
      relayouting = true
    }

    if (relayouting) {
      if (this._originalBatchables.length) {
        this._layoutedBatchables = this._relayout(this._originalBatchables)
      }
      repainting = true
    }

    if (repainting && this._layoutedBatchables.length) {
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
