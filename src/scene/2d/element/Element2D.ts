import type {
  Background,
  Display,
  Fill,
  Foreground,
  Outline,
  Shadow,
  Shape,
  Text,
} from 'modern-idoc'
import type {
  InputEvent,
  InputEventKey,
  PointerInputEvent,
  Vector2Like } from '../../../core'
import type { Node, Rectangulable, RectangulableEvents, SceneTree } from '../../main'
import type { Node2DEvents, Node2DProperties } from '../Node2D'
import type { Element2DStyleProperties } from './Element2DStyle'
import { clearUndef, getDefaultLayoutStyle, getDefaultTextStyle, isNone } from 'modern-idoc'
import {
  Aabb2D,
  customNode,
  DEG_TO_RAD,
  Obb2D,
  Vector2,
} from '../../../core'
import { parseCssTransform, parseCssTransformOrigin } from '../../../css'
import { ColorFilterEffect, MaskEffect } from '../../effects'
import { Node2D } from '../Node2D'
import { Element2DBackground } from './Element2DBackground'
import { Element2DFill } from './Element2DFill'
import { Element2DForeground } from './Element2DForeground'
import { Element2DOutline } from './Element2DOutline'
import { Element2DShadow } from './Element2DShadow'
import { Element2DShape } from './Element2DShape'
import { Element2DStyle } from './Element2DStyle'
import { Element2DText } from './Element2DText'
import { Flexbox } from './Flexbox'

export interface BaseElement2DEvents extends Node2DEvents, RectangulableEvents {
  updateStyleProperty: [key: string, value: any, oldValue: any]
}

export interface Element2D {
  on: <K extends keyof BaseElement2DEvents & string>(event: K, listener: (...args: BaseElement2DEvents[K]) => void) => this
  once: <K extends keyof BaseElement2DEvents & string>(event: K, listener: (...args: BaseElement2DEvents[K]) => void) => this
  off: <K extends keyof BaseElement2DEvents & string>(event: K, listener: (...args: BaseElement2DEvents[K]) => void) => this
  emit: <K extends keyof BaseElement2DEvents & string>(event: K, ...args: BaseElement2DEvents[K]) => this
}

export interface Element2DProperties extends Node2DProperties {
  // style: Style
  style: Partial<Element2DStyleProperties>
  background: Background
  shape: Shape
  fill: Fill
  outline: Outline
  foreground: Foreground
  text: Text
  shadow: Shadow
}

const layoutStyle = new Set(Object.keys(getDefaultLayoutStyle()))
const textStyles = new Set(Object.keys(getDefaultTextStyle()))

@customNode('Element2D')
export class Element2D extends Node2D implements Rectangulable {
  protected _parentGlobalDisplay?: Display
  protected _globalDisplay?: Display
  get globalDisplay(): Display | undefined { return this._globalDisplay }

  readonly flexbox = new Flexbox(this)

  readonly size = new Vector2().on('update', () => {
    this.onUpdateStyleProperty('transform', this.style.transform, undefined)
    this.onUpdateStyleProperty('transformOrigin', this.style.transformOrigin, undefined)
    this.updateGlobalTransform()
    this.requestDraw()
  })

  protected _allowPointerEvents = true
  protected _overflowHidden = false

  protected _style = new Element2DStyle().on('updateProperty', (...args: any[]) => {
    this.onUpdateStyleProperty(args[0], args[1], args[2])
  })

  get style(): Element2DStyle { return this._style }
  set style(value: Element2DProperties['style']) { this._style.resetProperties().setProperties(value) }

  protected _background = new Element2DBackground(this)
  get background(): Element2DBackground { return this._background }
  set background(value: Element2DProperties['background']) { this._background.resetProperties().setProperties(value) }

  protected _shape = new Element2DShape(this)
  get shape(): Element2DShape { return this._shape }
  set shape(value: Element2DProperties['shape']) { this._shape.resetProperties().setProperties(value) }

  protected _fill = new Element2DFill(this)
  get fill(): Element2DFill { return this._fill }
  set fill(value: Element2DProperties['fill']) { this._fill.resetProperties().setProperties(value) }

  protected _outline = new Element2DOutline(this)
  get outline(): Element2DOutline { return this._outline }
  set outline(value: Element2DProperties['outline']) { this._outline.resetProperties().setProperties(value) }

  protected _foreground = new Element2DForeground(this)
  get foreground(): Element2DForeground { return this._foreground }
  set foreground(value: Element2DProperties['foreground']) { this._foreground.resetProperties().setProperties(value) }

  protected _text = new Element2DText(this)
  get text(): Element2DText { return this._text }
  set text(value: Element2DProperties['text']) { this._text.resetProperties().setProperties(value) }

  protected _shadow = new Element2DShadow(this)
  get shadow(): Element2DShadow { return this._shadow }
  set shadow(value: Element2DProperties['shadow']) { this._shadow.resetProperties().setProperties(value) }

  protected _styleFilter?: ColorFilterEffect

  constructor(properties?: Partial<Element2DProperties>, nodes: Node[] = []) {
    super()
    this
      .setProperties(properties)
      .append(nodes)
  }

  protected override _treeEnter(tree: SceneTree): void {
    super._treeEnter(tree)

    if (this._text.isValid()) {
      this._text.update()
    }
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

  onUpdateStyleProperty(key: string, value: any, oldValue: any): void {
    this.emit('updateStyleProperty', key, value, oldValue)
    this._updateStyleProperty(key, value, oldValue)
  }

  protected _updateStyleProperty(key: string, value: any, oldValue: any): void {
    switch (key) {
      case 'display':
        this.updateGlobalDisplay()
        break
      case 'rotate':
        this.rotation = value * DEG_TO_RAD
        break
      case 'scaleX':
        this.scale.x = value
        if (this.text.isValid() && (value ^ oldValue) < 0) {
          this.requestDraw()
        }
        break
      case 'scaleY':
        this.scale.y = value
        if (this.text.isValid() && (value ^ oldValue) < 0) {
          this.requestDraw()
        }
        break
      case 'skewX':
        this.skew.x = value
        break
      case 'skewY':
        this.skew.y = value
        break
      case 'transform':
        parseCssTransform(
          value ?? '',
          this.size.width,
          this.size.height,
          this.extraTransform.identity(),
        )
        this.updateGlobalTransform()
        break
      case 'transformOrigin': {
        const origin = parseCssTransformOrigin(value ?? '')
        this.pivot.set(
          origin[0] * this.size.width,
          origin[1] * this.size.height,
        )
        break
      }
      case 'opacity':
        this.opacity = value
        break
      case 'visibility':
        this.visible = value === 'visible'
        break
      case 'filter':
        if (value) {
          this._getStyleFilter().filter = value
        }
        else {
          this._styleFilter?.remove()
          this._styleFilter = undefined
        }
        this.requestPaint()
        break
      case 'maskImage':
        this._updateMaskImage(value)
        break
      case 'backgroundColor':
        this.background.color = value
        break
      case 'backgroundImage':
        this.background.image = value
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
      case 'overflow':
        this._overflowHidden = value === 'hidden'
        break
      case 'pointerEvents':
        this._allowPointerEvents = !isNone(value)
        break
      case 'borderRadius':
        this.requestDraw()
        break
    }

    if (textStyles.has(key) || layoutStyle.has(key)) {
      if (this.text.isValid()) {
        this.text.update()
      }
    }

    if (this.globalDisplay === 'flex') {
      this.flexbox.updateStyleProperty(key, value)
    }
    else {
      switch (key) {
        case 'left':
          this.position.x = Number(value)
          break
        case 'top':
          this.position.y = Number(value)
          break
        case 'width':
          this.size.width = Number(value)
          break
        case 'height':
          this.size.height = Number(value)
          break
      }
    }
  }

  updateGlobalDisplay(): void {
    this._parentGlobalDisplay = this.getParent<Element2D>()?.globalDisplay
    this._globalDisplay = this.style.display
      ?? this._parentGlobalDisplay
  }

  override requestLayout(): void {
    super.requestLayout()
    this.flexbox.update()
  }

  protected override _process(delta: number): void {
    this.foreground.process(delta)
    this.fill.process(delta)
    this.text.process(delta)
    this.outline.process(delta)
    this.background.process(delta)

    const parent = this.getParent<Element2D>()

    if (this._parentGlobalDisplay !== parent?.globalDisplay) {
      this.updateGlobalDisplay()
    }

    this.flexbox.update()

    super._process(delta)
  }

  protected _getStyleFilter(): ColorFilterEffect {
    if (!this._styleFilter) {
      this._styleFilter = new ColorFilterEffect({ internalMode: 'front' })
      this.append(this._styleFilter)
    }
    return this._styleFilter
  }

  protected _updateMaskImage(maskImage?: string): void {
    const nodePath = '__$style.maskImage'
    if (maskImage && maskImage !== 'none') {
      const node = this.getNode<MaskEffect>(nodePath)
      if (node) {
        node.image = maskImage
      }
      else {
        this.appendChild(new MaskEffect({ name: nodePath, image: maskImage }), 'back')
      }
    }
    else {
      const node = this.getNode(nodePath)
      if (node) {
        this.removeChild(node)
      }
    }
  }

  override updateGlobalTransform(): void {
    super.updateGlobalTransform()
    this._updateMask()
  }

  protected _getPointArray(): Vector2Like[] {
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

  getRect(): Aabb2D {
    return this.getGlobalAabb()
  }

  getAabb(): Aabb2D {
    return new Aabb2D(
      this._getPointArray().map((p) => {
        return this.transform.apply(p)
      }),
    )
  }

  getGlobalAabb(): Aabb2D {
    return new Aabb2D(
      this._getPointArray().map((p) => {
        return this.globalTransform.apply(p)
      }),
    )
  }

  getObb(): Obb2D {
    const pivot = this.pivot
    const _pivot = this.transform.apply(pivot).sub(pivot)
    return new Obb2D(
      this._getPointArray().map((p) => {
        p.x += _pivot.x
        p.y += _pivot.y
        return p
      }),
      this.rotation,
    )
  }

  getGlobalObb(): Obb2D {
    const pivot = this.pivot
    const _pivot = this.globalTransform.apply(pivot).sub(pivot)
    return new Obb2D(
      this._getPointArray().map((p) => {
        p.x += _pivot.x
        p.y += _pivot.y
        return p
      }),
      this.globalRotation,
    )
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

  protected _updateMask(): void {
    if (this._overflowHidden) {
      this.mask = this.getRect()
    }
    else {
      this.mask = undefined
    }
  }

  protected _draw(): void {
    super._draw()

    if (this._background.isValid()) {
      this._tree?.log(this.name, 'background drawing')
      this._shape.draw(!this._background.fillWithShape)
      this._background.draw()
    }

    if (this._fill.isValid()) {
      this._tree?.log(this.name, 'fill drawing')
      this._shape.draw()
      this._fill.draw()
    }

    if (this._outline.isValid()) {
      this._tree?.log(this.name, 'outline drawing')
      this._shape.draw()
      this._outline.draw()
    }

    if (this._foreground.isValid()) {
      this._tree?.log(this.name, 'foreground drawing')
      this._shape.draw(!this._foreground.fillWithShape)
      this._foreground.draw()
    }

    if (this._text.isValid()) {
      this._tree?.log(this.name, 'text drawing')
      this._text.draw()
    }

    this._drawContent()
  }

  protected _drawContent(): void {
    //
  }

  override input(event: InputEvent, key: InputEventKey): void {
    const array = this.getChildren(true)
    for (let i = array.length - 1; i >= 0; i--) {
      array[i].input(event, key)
    }
    if (this.isVisibleInTree()) {
      this._input(event, key)
    }
  }

  // eslint-disable-next-line unused-imports/no-unused-vars
  protected _positionInput(localPos: Vector2Like, key: InputEventKey): boolean {
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
        if (this._allowPointerEvents) {
          const { screenX, screenY } = event as PointerInputEvent
          if (screenX && screenY) {
            const pos = { x: screenX, y: screenY }
            this.getViewport()?.toCanvasGlobal(pos, pos)
            this.toLocal(pos, pos)
            if (this._positionInput(pos, key)) {
              if (!event.target) {
                event.target = this
              }
              this.emit(key, event as any)
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
