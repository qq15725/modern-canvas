import type {
  ColorValue,
  EventListenerOptions,
  EventListenerValue,
  InputEvent,
  InputEventKey,
  PointerInputEvent, PropertyDeclaration,
  WebGLBlendMode,
} from '../../core'
import type { CanvasBatchable, CanvasItemEventMap, Node, Rectangulable } from '../main'
import type { BaseElement2DStyleProperties } from './BaseElement2DStyle'
import type { Node2DProperties } from './Node2D'
import {
  customNode,
  DEG_TO_RAD,
  Rect2,
  Transform2D,
  Vector2,
} from '../../core'
import { parseCSSFilter, parseCSSTransform, parseCSSTransformOrigin } from '../../css'
import { DropShadowEffect, MaskEffect } from '../effects'
import { BaseElement2DStyle } from './BaseElement2DStyle'
import { Node2D } from './Node2D'

export interface BaseElement2DEventMap extends CanvasItemEventMap {
  updateStyleProperty: (key: PropertyKey, value: any, oldValue: any, declaration?: PropertyDeclaration) => void
}

export interface BaseElement2D {
  on: (<K extends keyof BaseElement2DEventMap>(type: K, listener: BaseElement2DEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  once: (<K extends keyof BaseElement2DEventMap>(type: K, listener: BaseElement2DEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  off: (<K extends keyof BaseElement2DEventMap>(type: K, listener?: BaseElement2DEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  emit: (<K extends keyof BaseElement2DEventMap>(type: K, ...args: Parameters<BaseElement2DEventMap[K]>) => boolean)
    & ((type: string, ...args: any[]) => boolean)
}

export interface BaseElement2DProperties extends Node2DProperties {
  style: Partial<BaseElement2DStyleProperties>
  modulate: ColorValue
  blendMode: WebGLBlendMode
}

@customNode('BaseElement2D')
export class BaseElement2D extends Node2D implements Rectangulable {
  size = new Vector2()

  protected declare _style: BaseElement2DStyle
  get style(): BaseElement2DStyle { return this._style }
  set style(style) {
    const cb = (...args: any[]): void => {
      this.emit('updateStyleProperty', ...args)
      this._updateStyleProperty(args[0], args[1], args[2], args[3])
    }
    style.on('updateProperty', cb)
    this._style?.off('updateProperty', cb)
    this._style = style
  }

  constructor(properties?: Partial<BaseElement2DProperties>, nodes: Node[] = []) {
    super()

    this._updateStyleProperty = this._updateStyleProperty.bind(this)

    this.style = new BaseElement2DStyle()

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
        if (this.mask instanceof BaseElement2D) {
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
      const node = this.getNode<DropShadowEffect>(nodePath)
      if (node) {
        // TODO
      }
      else {
        this.appendChild(new DropShadowEffect({ name: nodePath }), 'back')
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
        this.appendChild(new MaskEffect({ name: nodePath, src: maskImage }), 'back')
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
    const { width, height } = this.size
    const [originX, originY] = parseCSSTransformOrigin(this.style.transformOrigin)
    const offsetX = originX * width
    const offsetY = originY * height
    this.transform
      .identity()
      .translate(-offsetX, -offsetY)
      .scale(this.scale.x, this.scale.y)
      .skew(this.skew.x, this.skew.y)
      .rotate(this.rotation)
    parseCSSTransform(this.style.transform, width, height, this.transform)
    this.transform.translate(offsetX + this.position.x, offsetY + this.position.y)
  }

  protected override _updateGlobalTransform(): void {
    super._updateGlobalTransform()
    this._updateOverflow()
    // this.requestRedraw()
  }

  getRect(): Rect2 {
    const { width: w, height: h } = this.size
    const x1 = 0
    const y1 = 0
    const x2 = x1 + w
    const y2 = y1 + h
    const [a, c, tx, b, d, ty] = this.globalTransform.toArray()
    const points = [
      [x1, y1],
      [x1, y2],
      [x2, y1],
      [x2, y2],
    ].map((p) => {
      return [
        (a * p[0]) + (c * p[1]) + tx,
        (b * p[0]) + (d * p[1]) + ty,
      ]
    })
    const xx = points.map(p => p[0])
    const yy = points.map(p => p[1])
    const minX = Math.min(...xx)
    const maxX = Math.max(...xx)
    const minY = Math.min(...yy)
    const maxY = Math.max(...yy)
    return new Rect2(
      minX,
      minY,
      maxX - minX,
      maxY - minY,
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
    super._draw()
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
        1 / width,
        1 / height,
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
    return super._repaint(batchables).map((batchable) => {
      return {
        ...batchable,
        backgroundColor: this.style.getComputedBackgroundColor().abgr,
        colorMatrix: colorMatrix.toMatrix4().toArray(true),
        colorMatrixOffset: colorMatrix.toVector4().toArray(),
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
      this._input(event, key)
    }
  }

  protected _pointerEntering = false
  protected _pointerEntered(): void {
    this._pointerEntering = true
  }

  protected _pointerExited(): void {
    if (this._pointerEntering) {
      //
    }
  }

  // eslint-disable-next-line unused-imports/no-unused-vars
  protected _pointerInput(point: { x: number, y: number }, key: InputEventKey): boolean {
    const { width, height } = this.size
    return point.x >= 0
      && point.x < width
      && point.y >= 0
      && point.y < height
  }

  protected override _input(event: InputEvent, key: InputEventKey): void {
    switch (key) {
      case 'pointerdown':
      case 'pointermove':
      case 'pointerup': {
        if (this.canPointerEvents()) {
          const { screenX, screenY } = event as PointerInputEvent
          if (screenX && screenY) {
            const [x, y] = this.globalTransform.inverse().applyToPoint(screenX, screenY)
            if (this._pointerInput({ x, y }, key)) {
              if (!event.target) {
                event.target = this
              }
              this.emit(key, event)
            }
          }
        }
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
