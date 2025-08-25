import type {
  Background,
  EventListenerOptions,
  EventListenerValue,
  Fill,
  Foreground,
  Outline,
  PropertyDeclaration,
  Shadow,
  Shape,
  Style,
  Text,
} from 'modern-idoc'
import type {
  ColorValue,
  InputEvent,
  InputEventKey,
  PointerInputEvent,
  Transform2D,
  Vector2Data,
  WebGLBlendMode,
} from '../../../core'
import type { CanvasBatchable, CanvasItemEventMap, Node, Rectangulable } from '../../main'
import type { Node2DProperties } from '../Node2D'
import { clearUndef } from 'modern-idoc'
import {
  customNode,
  DEG_TO_RAD,
  Rect2,
  Vector2,
} from '../../../core'
import { parseCSSTransform, parseCSSTransformOrigin } from '../../../css'
import { MaskEffect } from '../../effects'
import { Node2D } from '../Node2D'
import { BaseElement2DBackground } from './BaseElement2DBackground'
import { BaseElement2DFill } from './BaseElement2DFill'
import { BaseElement2DForeground } from './BaseElement2DForeground'
import { BaseElement2DOutline } from './BaseElement2DOutline'
import { BaseElement2DShadow } from './BaseElement2DShadow'
import { BaseElement2DShape } from './BaseElement2DShape'
import { BaseElement2DStyle } from './BaseElement2DStyle'
import { BaseElement2DText } from './BaseElement2DText'

export interface BaseElement2DEventMap extends CanvasItemEventMap {
  updateStyleProperty: (key: string, value: any, oldValue: any, declaration?: PropertyDeclaration) => void
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
  style: Style
  background: Background
  shape: Shape
  fill: Fill
  outline: Outline
  foreground: Foreground
  text: Text
  shadow: Shadow
}

@customNode('BaseElement2D')
export class BaseElement2D extends Node2D implements Rectangulable {
  readonly size = new Vector2().on('update', () => {
    this.updateGlobalTransform()
    this.requestRedraw()
  })

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
  set background(value: Background) { this._background.resetProperties().setProperties(value) }

  protected _shape = new BaseElement2DShape(this)
  get shape(): BaseElement2DShape { return this._shape }
  set shape(value: Shape) { this._shape.resetProperties().setProperties(value) }

  protected _fill = new BaseElement2DFill(this)
  get fill(): BaseElement2DFill { return this._fill }
  set fill(value: Fill) { this._fill.resetProperties().setProperties(value) }

  protected _outline = new BaseElement2DOutline(this)
  get outline(): BaseElement2DOutline { return this._outline }
  set outline(value: Outline) { this._outline.resetProperties().setProperties(value) }

  protected _foreground = new BaseElement2DForeground(this)
  get foreground(): BaseElement2DForeground { return this._foreground }
  set foreground(value: Foreground) { this._foreground.resetProperties().setProperties(value) }

  protected _text = new BaseElement2DText(this)
  get text(): BaseElement2DText { return this._text }
  set text(value: Text) { this._text.resetProperties().setProperties(value) }

  protected _shadow = new BaseElement2DShadow(this)
  get shadow(): BaseElement2DShadow { return this._shadow }
  set shadow(value: Shadow) { this._shadow.resetProperties().setProperties(value) }

  constructor(properties?: Partial<BaseElement2DProperties>, nodes: Node[] = []) {
    super()
    this._updateStyleProperty = this._updateStyleProperty.bind(this)
    this.style = new BaseElement2DStyle()
    this
      .setProperties(properties)
      .append(nodes)
  }

  override setProperties(properties?: Record<string, any>): this {
    if (properties) {
      const {
        style,
        text,
        shape,
        background,
        fill,
        outline,
        foreground,
        shadow,
        ...restProperties
      } = properties
      style && this.style.setProperties(style)
      background && this.background.setProperties(background)
      shape && this.shape.setProperties(shape)
      fill && this.fill.setProperties(fill)
      outline && this.outline.setProperties(outline)
      text && this.text.setProperties(text)
      foreground && this.foreground.setProperties(foreground)
      shadow && this.shadow.setProperties(shadow)
      super.setProperties(restProperties)
    }
    return this
  }

  protected _updateStyleProperty(key: string, value: any, oldValue: any, _declaration?: PropertyDeclaration): void {
    switch (key) {
      case 'rotate':
        this.rotation = this.style.rotate * DEG_TO_RAD
        break
      case 'scaleX':
        this.scale.x = this.style.scaleX
        if (this.text.canDraw() && (value ^ oldValue) < 0) {
          this.requestRedraw()
        }
        break
      case 'scaleY':
        this.scale.y = this.style.scaleY
        if (this.text.canDraw() && (value ^ oldValue) < 0) {
          this.requestRedraw()
        }
        break
      case 'skewX':
        this.skew.x = this.style.skewX
        break
      case 'skewY':
        this.skew.y = this.style.skewY
        break
      case 'transform':
      case 'transformOrigin':
        this.updateGlobalTransform()
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
      case 'backgroundColor':
        this.background.color = this.style.backgroundColor
        break
      case 'backgroundImage':
        this.background.image = this.style.backgroundImage
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
      case 'borderRadius':
      default:
        this.requestRedraw()
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

  override getTransformOrigin(): Vector2 {
    const { width, height } = this.size
    const [originX, originY] = parseCSSTransformOrigin(this.style.transformOrigin)
    return new Vector2(originX * width, originY * height)
  }

  override updateTransform(cb?: (transform: Transform2D) => void): void {
    const { width, height } = this.size

    super.updateTransform((transform) => {
      parseCSSTransform(this.style.transform ?? '', width, height, transform)

      cb?.(transform)
    })
  }

  override updateGlobalTransform(): void {
    super.updateGlobalTransform()
    this._updateOverflow()
  }

  getRect(): Rect2 {
    return this.getGlobalAabb()
  }

  protected _getPointArray(): Vector2Data[] {
    const { width, height } = this.size
    const x1 = 0
    const y1 = 0
    const x2 = x1 + width
    const y2 = y1 + height
    return [
      { x: x1, y: y1 },
      { x: x1, y: y2 },
      { x: x2, y: y1 },
      { x: x2, y: y2 },
    ]
  }

  getAabb(): Rect2 {
    return new Rect2(
      this._getPointArray().map((p) => {
        return this.transform.apply(p)
      }),
    )
  }

  getGlobalAabb(): Rect2 {
    return new Rect2(
      this._getPointArray().map((p) => {
        return this.globalTransform.apply(p)
      }),
    )
  }

  getObb(): { rect: Rect2, rotation: number } {
    const origin = this.getTransformOrigin()
    const _origin = this.transform.apply(origin).sub(origin)
    return {
      rect: new Rect2(
        this._getPointArray().map((p) => {
          p.x += _origin.x
          p.y += _origin.y
          return p
        }),
      ),
      rotation: this.rotation,
    }
  }

  getGlobalObb(): { rect: Rect2, rotation: number } {
    const origin = this.getTransformOrigin()
    const _origin = this.globalTransform.apply(origin).sub(origin)

    return {
      rect: new Rect2(
        this._getPointArray().map((p) => {
          p.x += _origin.x
          p.y += _origin.y
          return p
        }),
      ),
      rotation: this.globalRotation,
    }
  }

  // protected _rectsOverlap(r1: any, r2: any): boolean {
  //   return (
  //     r1.x < r2.x + r2.width
  //     && r1.x + r1.width > r2.x
  //     && r1.y < r2.y + r2.height
  //     && r1.y + r1.height > r2.y
  //   )
  // }

  // TODO
  // override isVisibleInTree(): boolean {
  //   if (this._tree) {
  //     const root = this._tree.root
  //     const camera = root.worldTransform.inverse()
  //     const { x, y, width, height } = root
  //     const p1 = camera.apply(x, y)
  //     const p2 = camera.apply(x + width, y)
  //     const p3 = camera.apply(x + width, y + height)
  //     const p4 = camera.apply(x, y + height)
  //     const pts = [p1, p2, p3, p4]
  //     const xs = pts.map(p => p[0])
  //     const ys = pts.map(p => p[1])
  //     const minX = Math.min(...xs)
  //     const maxX = Math.max(...xs)
  //     const minY = Math.min(...ys)
  //     const maxY = Math.max(...ys)
  //     const rect2 = {
  //       x: minX,
  //       y: minY,
  //       width: maxX - minX,
  //       height: maxY - minY,
  //     }
  //     if (!this._rectsOverlap(rect2, this.getRect())) {
  //       return false
  //     }
  //   }
  //   return super.isVisibleInTree()
  // }

  protected _updateOverflow(): void {
    if (this.style.overflow === 'hidden') {
      this.mask = this.getRect().toJSON()
    }
    else {
      this.mask = undefined
    }
  }

  protected _draw(): void {
    super._draw()

    if (this._text.canDraw()) {
      this._text.updateMeasure()
    }

    if (this._background.canDraw()) {
      this._tree?.log(this.name, 'background drawing')
      if (this._background.fillWithShape) {
        this._shape.draw()
      }
      else {
        this._shape.drawRect()
      }
      this._background.draw()
    }

    if (this._fill.canDraw()) {
      this._tree?.log(this.name, 'fill drawing')
      this._shape.draw()
      this._fill.draw()
    }

    if (this._outline.canDraw()) {
      this._tree?.log(this.name, 'outline drawing')
      this._shape.draw()
      this._outline.draw()
    }

    if (this._foreground.canDraw()) {
      this._tree?.log(this.name, 'foreground drawing')
      if (this._foreground.fillWithShape) {
        this._shape.draw()
      }
      else {
        this._shape.drawRect()
      }
      this._foreground.draw()
    }

    if (this._text.canDraw()) {
      this._tree?.log(this.name, 'text drawing')
      this._text.draw()
    }

    this._drawContent()
  }

  protected _drawContent(): void {
    //
  }

  protected _repaint(batchables: CanvasBatchable[]): CanvasBatchable[] {
    // TODO style.filter 支持
    // const colorMatrix = parseCSSFilter(this.style.filter)
    return super._repaint(batchables).map((batchable) => {
      return {
        ...batchable,
        // colorMatrix: colorMatrix.toMatrix4().toArray(true),
        // colorMatrixOffset: colorMatrix.toVector4().toArray(),
      }
    })
  }

  canPointerEvents(): boolean {
    return this.style.pointerEvents !== 'none'
  }

  override input(event: InputEvent, key: InputEventKey): void {
    const array = this._children.internal
    for (let i = array.length - 1; i >= 0; i--) {
      array[i].input(event, key)
    }
    if (this.isVisibleInTree()) {
      this._input(event, key)
    }
  }

  // eslint-disable-next-line unused-imports/no-unused-vars
  protected _positionInput(localPos: Vector2Data, key: InputEventKey): boolean {
    const { width, height } = this.size
    return localPos.x >= 0
      && localPos.x < width
      && localPos.y >= 0
      && localPos.y < height
  }

  protected override _input(event: InputEvent, key: InputEventKey): void {
    switch (key) {
      case 'pointerdown':
      case 'pointermove':
      case 'pointerup': {
        if (this.canPointerEvents()) {
          const { screenX, screenY } = event as PointerInputEvent
          if (screenX && screenY) {
            const pos = new Vector2(screenX, screenY)
            const viewport = this.getViewport()
            if (viewport) {
              viewport.toCanvasGlobal(pos, pos)
            }
            this.toLocal(pos, pos)
            if (this._positionInput(pos, key)) {
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
    const notEmptyObjectOrUndef = (obj: Record<string, any>): Record<string, any> | undefined => {
      return Object.keys(obj).length > 0 ? obj : undefined
    }

    return clearUndef({
      ...super.toJSON(),
      style: notEmptyObjectOrUndef(this.style.toJSON()),
      background: notEmptyObjectOrUndef(this.background.toJSON()),
      shape: notEmptyObjectOrUndef(this.shape.toJSON()),
      fill: notEmptyObjectOrUndef(this.fill.toJSON()),
      outline: notEmptyObjectOrUndef(this.outline.toJSON()),
      text: notEmptyObjectOrUndef(this.text.toJSON()),
      foreground: notEmptyObjectOrUndef(this.foreground.toJSON()),
      shadow: notEmptyObjectOrUndef(this.shadow.toJSON()),
    })
  }
}
