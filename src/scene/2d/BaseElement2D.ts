import type {
  BackgroundProperty,
  FillProperty,
  ForegroundProperty,
  GeometryProperty,
  OutlineProperty,
  ShadowProperty,
  StyleProperty, TextProperty,
} from 'modern-idoc'
import type {
  ColorValue,
  EventListenerOptions,
  EventListenerValue,
  InputEvent,
  InputEventKey,
  PointerInputEvent,
  PropertyDeclaration,
  WebGLBlendMode,
} from '../../core'
import type { CanvasBatchable, CanvasItemEventMap, Node, Rectangulable } from '../main'
import type { Node2DProperties } from './Node2D'
import {
  customNode,
  DEG_TO_RAD,
  Rect2,
  Vector2,
} from '../../core'
import { parseCSSFilter, parseCSSTransform, parseCSSTransformOrigin } from '../../css'
import { MaskEffect } from '../effects'
import { BaseElement2DBackground } from './BaseElement2DBackground'
import { BaseElement2DFill } from './BaseElement2DFill'
import { BaseElement2DForeground } from './BaseElement2DForeground'
import { BaseElement2DGeometry } from './BaseElement2DGeometry'
import { BaseElement2DOutline } from './BaseElement2DOutline'
import { BaseElement2DShadow } from './BaseElement2DShadow'
import { BaseElement2DStyle } from './BaseElement2DStyle'
import { BaseElement2DText } from './BaseElement2DText'
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
  modulate: ColorValue
  blendMode: WebGLBlendMode
  style: StyleProperty
  background: BackgroundProperty
  geometry: GeometryProperty
  fill: FillProperty
  outline: OutlineProperty
  foreground: ForegroundProperty
  text: TextProperty
  shadow: ShadowProperty
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

  protected _background = new BaseElement2DBackground(this)
  get background(): BaseElement2DBackground { return this._background }
  set background(value: BackgroundProperty) { this._background.setProperties(value) }

  protected _geometry = new BaseElement2DGeometry(this)
  get geometry(): BaseElement2DGeometry { return this._geometry }
  set geometry(value: GeometryProperty) { this._geometry.setProperties(value) }

  protected _fill = new BaseElement2DFill(this)
  get fill(): BaseElement2DFill { return this._fill }
  set fill(value: FillProperty) { this._fill.setProperties(value) }

  protected _outline = new BaseElement2DOutline(this)
  get outline(): BaseElement2DOutline { return this._outline }
  set outline(value: OutlineProperty) { this._outline.setProperties(value) }

  protected _foreground = new BaseElement2DForeground(this)
  get foreground(): BaseElement2DForeground { return this._foreground }
  set foreground(value: ForegroundProperty) { this._foreground.setProperties(value) }

  protected _text = new BaseElement2DText(this)
  get text(): BaseElement2DText { return this._text }
  set text(value: TextProperty) { this._text.setProperties(value) }

  protected _shadow = new BaseElement2DShadow(this)
  get shadow(): BaseElement2DShadow { return this._shadow }
  set shadow(value: ShadowProperty) { this._shadow.setProperties(value) }

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
      const {
        style,
        text,
        geometry,
        background,
        fill,
        outline,
        foreground,
        shadow,
        ...restProperties
      } = properties
      style && this.style.setProperties(style)
      background && this.background.setProperties(background)
      geometry && this.geometry.setProperties(geometry)
      fill && this.fill.setProperties(fill)
      outline && this.outline.setProperties(outline)
      text && this.text.setProperties(text)
      foreground && this.foreground.setProperties(foreground)
      shadow && this.shadow.setProperties(shadow)
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
      case 'opacity':
        this.opacity = this.style.opacity
        break
      case 'visibility':
        this.visible = this.style.visibility === 'visible'
        break
      case 'filter':
        this.requestRepaint()
        break
      case 'maskImage':
        this._updateMaskImage()
        break
      case 'borderRadius':
        this.requestRedraw()
        break
      case 'backgroundColor':
        this.background.color = this.style.backgroundColor
        break
      case 'backgroundImage':
        this.background.src = this.style.backgroundImage
        break
      case 'borderStyle':
      case 'outlineStyle':
        this.outline.style = value
        break
      case 'borderWidth':
      case 'outlineWidth':
        this.outline.width = value
        break
      case 'borderColor':
      case 'outlineColor':
        this.outline.color = value
        break
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

    if (this.text.canDraw()) {
      this.text.updateMeasure()
    }

    if (this.background.canDraw()) {
      this._tree?.log(this.name, 'draw background')
      this.geometry.drawRect()
      this.background.draw()
    }

    if (this.fill.canDraw()) {
      this._tree?.log(this.name, 'draw fill')
      this.geometry.draw()
      this.fill.draw()
    }

    if (this.outline.canDraw()) {
      this._tree?.log(this.name, 'draw outline')
      this.geometry.draw()
      this.outline.draw()
    }

    if (this.foreground.canDraw()) {
      this._tree?.log(this.name, 'draw foreground')
      this.geometry.drawRect()
      this.foreground.draw()
    }

    if (this.text.canDraw()) {
      this._tree?.log(this.name, 'draw text')
      this.geometry.drawRect()
      this.text.draw()
    }

    this._drawContent()
  }

  protected _drawContent(): void {
    //
  }

  protected _repaint(batchables: CanvasBatchable[]): CanvasBatchable[] {
    const colorMatrix = parseCSSFilter(this.style.filter)
    return super._repaint(batchables).map((batchable) => {
      return {
        ...batchable,
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
        text: this.text.toJSON(),
        geometry: this.geometry.toJSON(),
        fill: this.fill.toJSON(),
        outline: this.outline.toJSON(),
        shadow: this.shadow.toJSON(),
        ...json.props,
      },
    }
  }
}
