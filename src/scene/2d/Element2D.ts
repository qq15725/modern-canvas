import type {
  ColorValue,
  EventListenerOptions,
  EventListenerValue,
  InputEvent,
  InputEventKey,
  PointerInputEvent,
  PropertyDeclaration,
  WebGLBlendMode } from '../../core'
import type { CanvasBatchable, CanvasItemEventMap, Node, Rectangulable } from '../main'
import type { Element2DStyleProperties } from './Element2DStyle'
import type { Node2DProperties } from './Node2D'
import { customNode, DEG_TO_RAD,
  Rect2,
  Transform2D,
  Vector2,
} from '../../core'
import { parseCSSFilter, parseCSSTransform, parseCSSTransformOrigin } from '../../css'
import { MaskEffect, ShadowEffect } from '../effects'
import { Element2DStyle } from './Element2DStyle'
import { Node2D } from './Node2D'

export interface Element2DEventMap extends CanvasItemEventMap {
  updateStyleProperty: (key: PropertyKey, value: any, oldValue: any, declaration?: PropertyDeclaration) => void
}

export interface Element2D {
  on: (<K extends keyof Element2DEventMap>(type: K, listener: Element2DEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  once: (<K extends keyof Element2DEventMap>(type: K, listener: Element2DEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  off: (<K extends keyof Element2DEventMap>(type: K, listener?: Element2DEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  emit: (<K extends keyof Element2DEventMap>(type: K, ...args: Parameters<Element2DEventMap[K]>) => boolean)
    & ((type: string, ...args: any[]) => boolean)
}

export interface Element2DProperties extends Node2DProperties {
  style: Partial<Element2DStyleProperties>
  modulate: ColorValue
  blendMode: WebGLBlendMode
}

@customNode('Element2D')
export class Element2D extends Node2D implements Rectangulable {
  size = new Vector2()

  protected declare _style: Element2DStyle
  get style(): Element2DStyle { return this._style }
  set style(style) {
    const cb = (...args: any[]): void => {
      this.emit('updateStyleProperty', ...args)
      this._updateStyleProperty(args[0], args[1], args[2], args[3])
    }
    style.on('updateProperty', cb)
    this._style?.off('updateProperty', cb)
    this._style = style
  }

  constructor(properties?: Partial<Element2DProperties>, nodes: Node[] = []) {
    super()

    this._updateStyleProperty = this._updateStyleProperty.bind(this)

    this.style = new Element2DStyle()

    this
      .setProperties(properties)
      .append(nodes)
  }

  override setProperties(properties?: Record<PropertyKey, any>): this {
    if (properties) {
      const { style, ...restProperties } = properties
      style && this.style.setProperties(style)
      super.setProperties(restProperties)
    }
    return this
  }

  // eslint-disable-next-line unused-imports/no-unused-vars
  protected _updateStyleProperty(key: PropertyKey, value: any, oldValue: any, declaration?: PropertyDeclaration): void {
    switch (key) {
      case 'width':
      case 'height':
        if (this.mask instanceof Element2D) {
          this.mask.size.x = this.size.x
          this.mask.size.y = this.size.y
        }
        break
    }

    switch (key) {
      case 'rotate':
        this.rotation = this.style.rotate * DEG_TO_RAD
        this.requestRelayout()
        break
      case 'scaleX':
        this.scale.x = this.style.scaleX
        this.requestRelayout()
        break
      case 'scaleY':
        this.scale.y = this.style.scaleY
        this.requestRelayout()
        break
      case 'skewX':
        this.skew.x = this.style.skewX
        this.requestRelayout()
        break
      case 'skewY':
        this.skew.y = this.style.skewY
        this.requestRelayout()
        break
      case 'transform':
      case 'transformOrigin':
        this.requestRelayout()
        break
      /** draw */
      case 'backgroundColor':
        this._updateBackgroundColor()
        break
      case 'backgroundImage':
        this._updateBackgroundImage()
        break
      case 'opacity':
        this.opacity = this.style.opacity
        break
      case 'visibility':
        this.visible = this.style.visibility === 'visible'
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
    const nodePath = '__$style.shadow'
    if (this.style.boxShadow !== 'none') {
      const node = this.getNode<ShadowEffect>(nodePath)
      if (node) {
        // TODO
      }
      else {
        this.appendChild(new ShadowEffect(), 'back')
      }
    }
    else {
      const node = this.getNode(nodePath)
      if (node) {
        this.removeChild(node)
      }
    }
  }

  protected _updateMaskImage(): void {
    const nodePath = '__$style.maskImage'
    const maskImage = this.style.maskImage
    if (maskImage && maskImage !== 'none') {
      const node = this.getNode<MaskEffect>(nodePath)
      if (node) {
        node.src = maskImage
      }
      else {
        this.appendChild(new MaskEffect({ src: maskImage }), 'back')
      }
    }
    else {
      const node = this.getNode(nodePath)
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

  protected override _updateTransform(): void {
    super._updateTransform()
    const { width, height } = this.size
    const cssTransform = parseCSSTransform(this.style.transform, width, height)
    cssTransform.multiply(this.transform, this.transform)
    const t3dT2dArr = this.transform.toArray()
    const [originX, originY] = parseCSSTransformOrigin(this.style.transformOrigin)
    const offsetX = originX * width
    const offsetY = originY * height
    t3dT2dArr[2] += (t3dT2dArr[0] * -offsetX) + (t3dT2dArr[1] * -offsetY) + offsetX
    t3dT2dArr[5] += (t3dT2dArr[3] * -offsetX) + (t3dT2dArr[4] * -offsetY) + offsetY
    this.transform.set(t3dT2dArr)
  }

  protected override _updateGlobalTransform(): void {
    super._updateGlobalTransform()
    this._updateOverflow()
    // this.requestRedraw()
  }

  getRect(): Rect2 {
    const [a, c, tx, b, d, ty] = this.transform.toArray()
    const { width, height } = this.size
    return new Rect2(
      tx,
      ty,
      (a * width) + (c * height),
      (b * width) + (d * height),
    )
  }

  protected _updateOverflow(): void {
    if (this.style.overflow === 'hidden') {
      const rect = this.getRect()
      this.mask = {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      }
    }
    else {
      this.mask = undefined
    }
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
      const { width, height } = this.size
      this.context.fillStyle = texture
      this.context.textureTransform = new Transform2D().scale(
        width / texture.width,
        height / texture.height,
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

  protected _fillBoundingRect(): void {
    this._drawBoundingRect()
    this.context.fill()
  }

  protected _strokeBoundingRect(): void {
    this._drawBoundingRect()
    this.context.stroke()
  }

  protected _repaint(batchables: CanvasBatchable[]): CanvasBatchable[] {
    const colorMatrix = parseCSSFilter(this.style.filter)
    return batchables.map((batchable) => {
      return {
        ...batchable,
        backgroundColor: this.style.getComputedBackgroundColor().abgr,
        modulate: this._modulate.toArgb(this.globalOpacity, true),
        colorMatrix: colorMatrix.toMatrix4().toArray(true),
        colorMatrixOffset: colorMatrix.toVector4().toArray(),
        blendMode: this.blendMode,
      }
    })
  }

  canPointerEvents(): boolean {
    return this.style.pointerEvents !== 'none'
  }

  override input(event: InputEvent, key: InputEventKey): void {
    for (let i = this._children.length - 1; i >= 0; i--) {
      this._children[i].input(event, key)
    }
    if (this.isVisibleInTree()) {
      switch (key) {
        case 'pointerdown':
        case 'pointermove':
        case 'pointerup': {
          if (this.canPointerEvents()) {
            const { screenX, screenY } = event as PointerInputEvent
            if (screenX && screenY) {
              const { width, height } = this.size
              const [x, y] = this.globalTransform.inverse().applyToPoint(screenX, screenY)
              if (x >= 0 && x < width && y >= 0 && y < height) {
                if (!event.target) {
                  event.target = this
                }
                this.emit(key, event)
                this._input(event, key)
              }
            }
          }
          break
        }
        default:
          this._input(event, key)
          break
      }
    }
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
