import type {
  ColorValue,
  EventListenerOptions,
  EventListenerValue,
  PropertyDeclaration,
  WebGLBlendMode,
  WebGLRenderer,
} from '../../core'
import type { CanvasItemStyleProperties, Texture2D } from '../resources'
import type { CanvasBatchable } from './CanvasContext'
import type { Node } from './Node'
import type { TimelineNodeEventMap, TimelineNodeProperties } from './TimelineNode'
import { Color, customNode, property, Transform2D } from '../../core'
import { MaskEffect, ShadowEffect } from '../effects'
import { CanvasItemStyle } from '../resources'
import { CanvasContext } from './CanvasContext'
import { TimelineNode } from './TimelineNode'

export interface CanvasItemProperties extends TimelineNodeProperties {
  style: Partial<CanvasItemStyleProperties>
  modulate: ColorValue
  blendMode: WebGLBlendMode
}

export interface CanvasItemEventMap extends TimelineNodeEventMap {
  updateStyleProperty: (key: PropertyKey, value: any, oldValue: any, declaration?: PropertyDeclaration) => void
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

  protected declare _style: CanvasItemStyle
  get style(): CanvasItemStyle { return this._style }
  set style(style) {
    const cb = (...args: any[]): void => {
      this.emit('updateStyleProperty', ...args)
      this._updateStyleProperty(args[0], args[1], args[2], args[3])
    }
    style.on('updateProperty', cb)
    this._style?.off('updateProperty', cb)
    this._style = style
  }

  /** @internal */
  opacity = 1
  visible = true
  protected _parentOpacity?: number
  protected _parentVisible?: boolean
  protected _modulate = new Color(0xFFFFFFFF)
  protected _backgroundImage?: Texture2D

  // Batch render
  context = new CanvasContext()
  protected _resetContext = true
  protected _redrawing = false
  protected _reflowing = false
  protected _repainting = false
  protected _originalBatchables: CanvasBatchable[] = []
  protected _layoutedBatchables: CanvasBatchable[] = []
  protected _batchables: CanvasBatchable[] = []

  constructor(properties?: Partial<CanvasItemProperties>, children: Node[] = []) {
    super()
    this._updateStyleProperty = this._updateStyleProperty.bind(this)
    this.style = new CanvasItemStyle()
    this
      .setProperties(properties)
      .append(children)
  }

  override setProperties(properties?: Record<PropertyKey, any>): this {
    if (properties) {
      const { style, ...restProperties } = properties
      style && this.style.setProperties(style)
      super.setProperties(restProperties)
    }
    return this
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
    }
  }

  // eslint-disable-next-line unused-imports/no-unused-vars
  protected _updateStyleProperty(key: PropertyKey, value: any, oldValue: any, declaration?: PropertyDeclaration): void {
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
      case 'visibility':
        this._updateVisible()
        break
      case 'filter':
        this.requestRepaint()
        break
      case 'boxShadow':
        this._updateBoxShadow()
        break
      case 'maskImage':
        this._updateMaskImage()
        break
      case 'borderRadius':
        this.requestRedraw()
        break
    }
  }

  protected _updateBoxShadow(): void {
    const name = '__$style.shadow'
    if (this.style.boxShadow !== 'none') {
      const node = this.getNode<ShadowEffect>(name)
      if (node) {
        // TODO
      }
      else {
        this.appendChild(new ShadowEffect({ name }), 'back')
      }
    }
    else {
      const node = this.getNode(name)
      if (node) {
        this.removeChild(node)
      }
    }
  }

  protected _updateMaskImage(): void {
    const name = '__$style.maskImage'
    const maskImage = this.style.maskImage
    if (maskImage && maskImage !== 'none') {
      const node = this.getNode<MaskEffect>(name)
      if (node) {
        node.src = maskImage
      }
      else {
        this.appendChild(new MaskEffect({ name, src: maskImage }), 'back')
      }
    }
    else {
      const node = this.getNode(name)
      if (node) {
        this.removeChild(node)
      }
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
    this._backgroundImage = await this.style.loadBackgroundImage()
    this.requestRedraw()
  }

  protected _updateOpacity(): void {
    const opacity = this.style.getComputedOpacity()
      * (this.getParent<CanvasItem>()?.opacity ?? 1)
    if (this.opacity !== opacity) {
      this.opacity = opacity
      this.requestRepaint()
    }
  }

  protected _updateCurrentTime(force = false): void {
    super._updateCurrentTime(force)
    this._updateVisible()
  }

  protected _updateVisible(): void {
    let visible = this.style.visibility === 'visible'
      && (this.getParent<CanvasItem>()?.visible ?? true)
    if (visible && !this.isInsideTimeRange()) {
      visible = false
    }
    this.visible = visible
  }

  show(): void {
    this.style.visibility = 'visible'
  }

  hide(): void {
    this.style.visibility = 'hidden'
  }

  isVisibleInTree(): boolean {
    return this.opacity > 0 && this.visible
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
    const parent = this.getParent<CanvasItem>()

    if (this._parentVisible !== parent?.visible) {
      this._parentVisible = parent?.visible
      this._updateVisible()
    }

    if (this._parentOpacity !== parent?.opacity) {
      this._parentOpacity = parent?.opacity
      this._updateOpacity()
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
      this._fillBoundingRect()
    }
  }

  protected _drawContent(): void {
    this._fillBoundingRect()
  }

  protected _drawBorder(): void {
    if (this.style.borderWidth && this.style.borderStyle !== 'none') {
      this.context.lineWidth = this.style.borderWidth
      this.context.strokeStyle = this.style.borderColor
      this._strokeBoundingRect()
    }
  }

  protected _drawOutline(): void {
    if (this.style.outlineWidth && this.style.outlineColor !== 'none') {
      this.context.lineWidth = this.style.outlineWidth
      this.context.strokeStyle = this.style.outlineColor
      this._strokeBoundingRect()
    }
  }

  protected _drawBoundingRect(): void {
    const { borderRadius, width, height } = this.style
    if (width && height) {
      if (borderRadius) {
        this.context.roundRect(0, 0, width, height, borderRadius)
      }
      else {
        this.context.rect(0, 0, width, height)
      }
    }
  }

  protected _fillBoundingRect(): void {
    this._drawBoundingRect()
    this.context.fill()
  }

  protected _strokeBoundingRect(): void {
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
