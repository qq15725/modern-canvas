import type {
  ColorValue,
  EventListenerOptions,
  EventListenerValue,
  PropertyDeclaration,
  WebGLBlendMode,
  WebGLRenderer,
} from '../../core'
import type { CanvasItemStyleProperties, Texture } from '../resources'
import type { CanvasBatchable } from './CanvasContext'
import type { NodeEventMap, NodeProperties } from './Node'
import type { Viewport } from './Viewport'
import { Color, customNode, property, Transform2D } from '../../core'
import { CanvasItemStyle } from '../resources'
import { CanvasContext } from './CanvasContext'
import { Node } from './Node'

export interface CanvasItemProperties extends NodeProperties {
  visible: boolean
  style: Partial<CanvasItemStyleProperties>
  modulate: ColorValue
  blendMode: WebGLBlendMode
  inheritSize: boolean
}

export interface CanvasItemEventMap extends NodeEventMap {
  styleUpdateProperty: (key: PropertyKey, newValue: any, oldValue: any, declaration?: PropertyDeclaration) => void
  draw: () => void
}

export interface CanvasItem {
  on: (<K extends keyof CanvasItemEventMap>(type: K, listener: CanvasItemEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  off: (<K extends keyof CanvasItemEventMap>(type: K, listener: CanvasItemEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  emit: (<K extends keyof CanvasItemEventMap>(type: K, ...args: Parameters<CanvasItemEventMap[K]>) => boolean)
    & ((type: string, ...args: any[]) => boolean)
}

@customNode('CanvasItem')
export class CanvasItem extends Node {
  @property({ default: true }) declare visible: boolean
  @property() declare modulate?: ColorValue
  @property() declare blendMode?: WebGLBlendMode
  @property() declare inheritSize?: boolean

  protected declare _style: CanvasItemStyle
  get style(): CanvasItemStyle { return this._style }
  set style(style) {
    const cb = (...args: any[]): void => {
      this.emit('styleUpdateProperty', ...args)
      this._onUpdateStyleProperty(args[0], args[1], args[2])
    }
    style.on('updateProperty', cb)
    this._style?.off('updateProperty', cb)
    this._style = style
  }

  /** @internal */
  opacity = 1
  size = { width: 0, height: 0 }
  protected _parentOpacity?: number
  protected _modulate = new Color(0xFFFFFFFF)
  protected _backgroundImage?: Texture
  _computedVisible = true

  // Batch render
  context = new CanvasContext()
  protected _resetContext = true
  protected _redrawing = false
  protected _reflowing = false
  protected _repainting = false
  protected _originalBatchables: CanvasBatchable[] = []
  protected _layoutedBatchables: CanvasBatchable[] = []
  protected _batchables: CanvasBatchable[] = []

  constructor(properties?: Partial<CanvasItemProperties>) {
    super()
    this._onUpdateStyleProperty = this._onUpdateStyleProperty.bind(this)
    this.style = new CanvasItemStyle()
    this.setProperties(properties)
  }

  override setProperties(properties?: Record<PropertyKey, any>): this {
    if (properties) {
      const { style, ...restProperties } = properties
      style && this.style.setProperties(style)
      super.setProperties(restProperties)
    }
    return this
  }

  protected override _onUpdateProperty(key: PropertyKey, newValue: any, oldValue: any, declaration?: PropertyDeclaration): void {
    super._onUpdateProperty(key, newValue, oldValue, declaration)

    switch (key) {
      case 'blendMode':
        this.requestRepaint()
        break
      case 'modulate':
        this._modulate.value = newValue
        this.requestRepaint()
        break
      case 'visible':
        this._updateVisible()
        break
    }
  }

  // eslint-disable-next-line unused-imports/no-unused-vars
  protected _onUpdateStyleProperty(key: PropertyKey, newValue: any, oldValue: any, declaration?: PropertyDeclaration): void {
    switch (key) {
      case 'backgroundColor':
        this._updateBackgroundColor()
        break
      case 'backgroundImage':
        this._updateBackgroundImage()
        break
      case 'opacity':
        this._updateOpacity()
        break
      case 'filter':
        this.requestRepaint()
        break
      case 'borderRadius':
        this.requestRedraw()
        break
      case 'visibility':
        this.visible = newValue === 'visible'
        break
      case 'width':
      case 'height':
        this._updateSize()
        break
    }
  }

  protected _updateSize(): void {
    if (this.inheritSize) {
      this.size.width = this.style.width
      || (this._parent as CanvasItem)?.size?.width
      || (this._parent as Viewport)?.width
      this.size.height = this.style.height
      || (this._parent as CanvasItem)?.size?.height
      || (this._parent as Viewport)?.height
    }
    else {
      this.size.width = this.style.width
      this.size.height = this.style.height
    }
  }

  protected _updateBackgroundColor(): void {
    const backgroundColor = this.style.getComputedBackgroundColor()
    if (this._originalBatchables.length) {
      this.requestRepaint()
    }
    else if (backgroundColor.a > 0) {
      this.requestRedraw()
    }
  }

  protected async _updateBackgroundImage(): Promise<void> {
    this._backgroundImage = await this.style.getComputedBackgroundImage()
    this.requestRedraw()
  }

  protected _updateOpacity(): void {
    const parentOpacity = (this._parent as CanvasItem)?.opacity
    if (parentOpacity !== this._parentOpacity) {
      this._parentOpacity = parentOpacity
      const opacity = this.style.getComputedOpacity()
        * ((this._parent as CanvasItem)?.opacity ?? 1)
      if (this.opacity !== opacity) {
        this.opacity = opacity
        this.requestRepaint()
      }
    }
  }

  protected _updateVisible(): void {
    let visible = this.visible
      ?? (this._parent as CanvasItem)?._computedVisible
      ?? true
    if (visible && !this.isInsideTime()) {
      visible = false
    }
    this._computedVisible = visible
  }

  show(): void {
    this.visible = true
  }

  hide(): void {
    this.visible = false
  }

  isVisibleInTree(): boolean {
    return this.opacity > 0 && this._computedVisible
  }

  override canRender(): boolean {
    return super.canRender() && this.isVisibleInTree()
  }

  requestRedraw(): void {
    this._redrawing = true
  }

  requestReflow(): void {
    this._reflowing = true
  }

  requestRepaint(): void {
    this._repainting = true
  }

  protected override _process(delta: number): void {
    this._updateVisible()
    this._updateOpacity()

    if (
      this.inheritSize
      && (!this.size.width
        || !this.size.height
        || this.size.width !== this.style.width
        || this.size.height !== this.style.height)
    ) {
      this._updateSize()
    }

    super._process(delta)
  }

  protected _draw(): void {
    this._drawBackground()
    this._drawContent()
    this._drawBorder()
    this._drawOutline()
  }

  protected _drawBackground(): void {
    const texture = this._backgroundImage
    if (texture?.valid) {
      this.context.fillStyle = texture
      this.context.textureTransform = new Transform2D().scale(
        this.style.width / texture.width,
        this.style.height / texture.height,
      )
      this._fill()
    }
  }

  protected _drawContent(): void {
    this._fill()
  }

  protected _drawBorder(): void {
    if (this.style.borderWidth && this.style.borderStyle !== 'none') {
      this.context.lineWidth = this.style.borderWidth
      this.context.strokeStyle = this.style.borderColor
      this._stroke()
    }
  }

  protected _drawOutline(): void {
    if (this.style.outlineWidth && this.style.outlineColor !== 'none') {
      this.context.lineWidth = this.style.outlineWidth
      this.context.strokeStyle = this.style.outlineColor
      this._stroke()
    }
  }

  protected _drawBoundingRect(): void {
    const { borderRadius } = this.style
    const { width, height } = this.size
    if (width && height) {
      if (borderRadius) {
        this.context.roundRect(0, 0, width, height, borderRadius)
      }
      else {
        this.context.rect(0, 0, width, height)
      }
    }
  }

  protected _fill(): void {
    this._drawBoundingRect()
    this.context.fill()
  }

  protected _stroke(): void {
    this._drawBoundingRect()
    this.context.stroke()
  }

  protected _relayout(batchables: CanvasBatchable[]): CanvasBatchable[] {
    return this._reflow(batchables)
  }

  protected _reflow(batchables: CanvasBatchable[]): CanvasBatchable[] {
    return this._repaint(batchables)
  }

  protected _repaint(batchables: CanvasBatchable[]): CanvasBatchable[] {
    const colorMatrix = this.style.getComputedFilterColorMatrix()
    return batchables.map((batchable) => {
      return {
        ...batchable,
        backgroundColor: this.style.getComputedBackgroundColor().abgr,
        modulate: this._modulate.toArgb(this.opacity, true),
        colorMatrix: colorMatrix.toMatrix4().toArray(true),
        colorMatrixOffset: colorMatrix.toVector4().toArray(),
        blendMode: this.blendMode,
      }
    })
  }

  protected override _render(renderer: WebGLRenderer): void {
    let batchables: CanvasBatchable[] | undefined
    if (this._redrawing) {
      this.emit('draw')
      this._draw()
      this._originalBatchables = this.context.toBatchables()
      this._layoutedBatchables = this._relayout(this._originalBatchables)
      batchables = this._layoutedBatchables
      if (this._resetContext) {
        this.context.reset()
      }
    }
    else if (this._reflowing) {
      this._layoutedBatchables = this._reflow(this._originalBatchables)
      batchables = this._layoutedBatchables
    }
    else if (this._repainting) {
      batchables = this._repaint(this._layoutedBatchables)
    }

    if (batchables) {
      this._batchables = batchables
      this._redrawing = false
      this._reflowing = false
      this._repainting = false
    }

    this._batchables.forEach((batchable) => {
      batchable.texture?.upload(renderer)

      renderer.batch2D.render({
        ...batchable,
        texture: batchable.texture?._glTexture(renderer),
      })
    })

    super._render(renderer)
  }

  override toJSON(): Record<string, any> {
    const json = super.toJSON()
    return {
      ...json,
      props: {
        style: this.style.toJSON(),
        ...json.props,
      },
    }
  }
}
