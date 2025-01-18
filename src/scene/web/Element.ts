import type {
  Node as YogaNode,
} from 'yoga-layout/load'
import type {
  ColorValue,
  PropertyDeclaration,
  WebGLBlendMode, WebGLRenderer } from '../../core'
import type { CanvasBatchable, NodeProperties } from '../main'
import type { Texture2D } from '../resources'
import type { ElementStyleProperties } from './ElementStyle'
import {
  Align,
  BoxSizing,
  Direction,
  Display,
  Edge,
  FlexDirection,
  Gutter,
  Justify,
  loadYoga,
  Overflow,
  PositionType,
  Wrap,
} from 'yoga-layout/load'
import { Color,
  customNode,
  DEG_TO_RAD,
  parseCssFunctions,
  PI_2,
  property,
  Rect2,
  Transform2D,
} from '../../core'
import { MaskEffect, ShadowEffect } from '../effects'
import { CanvasContext, Node } from '../main'
import { ElementStyle } from './ElementStyle'

const alignMap: Record<string, any> = {
  'auto': Align.Auto,
  'flex-start': Align.FlexStart,
  'center': Align.Center,
  'flex-end': Align.FlexEnd,
  'stretch': Align.Stretch,
  'baseline': Align.Baseline,
  'space-between': Align.SpaceBetween,
  'space-around': Align.SpaceAround,
  'space-evenly': Align.SpaceEvenly,
}

const displayMap: Record<string, any> = {
  none: Display.None,
  flex: Display.Flex,
  contents: Display.Contents,
}

const directionMap: Record<string, any> = {
  inherit: Direction.Inherit,
  ltr: Direction.LTR,
  rtl: Direction.RTL,
}

const flexDirectionMap: Record<string, any> = {
  'column': FlexDirection.Column,
  'column-reverse': FlexDirection.ColumnReverse,
  'row': FlexDirection.Row,
  'row-reverse': FlexDirection.RowReverse,
}

const flexWrapMap: Record<string, any> = {
  'no-wrap': Wrap.NoWrap,
  'wrap': Wrap.Wrap,
  'Wrap-reverse': Wrap.WrapReverse,
}

const justifyMap: Record<string, any> = {
  'flex-start': Justify.FlexStart,
  'center': Justify.Center,
  'flex-end': Justify.FlexEnd,
  'space-between': Justify.SpaceBetween,
  'space-around': Justify.SpaceAround,
  'space-evenly': Justify.SpaceEvenly,
}

const overflowMap: Record<string, any> = {
  visible: Overflow.Visible,
  hidden: Overflow.Hidden,
  scroll: Overflow.Scroll,
}

const positionTypeMap: Record<string, any> = {
  static: PositionType.Static,
  relative: PositionType.Relative,
  absolute: PositionType.Absolute,
}

const boxSizingMap: Record<string, any> = {
  'border-box': BoxSizing.BorderBox,
  'content-box': BoxSizing.ContentBox,
}

export interface ElementProperties extends NodeProperties {
  style: Partial<ElementStyleProperties>
  modulate: ColorValue
  blendMode: WebGLBlendMode
}

@customNode('Element')
export class Element extends Node {
  @property() declare modulate?: ColorValue
  @property() declare blendMode?: WebGLBlendMode

  static layoutEngine?: any

  static async loadLayoutEngine(): Promise<void> {
    this.layoutEngine = await loadYoga()
  }

  protected declare _style: ElementStyle
  get style(): ElementStyle { return this._style }
  set style(style) {
    const cb = (...args: any[]): void => {
      this.emit('updateStyleProperty', ...args)
      this._updateStyleProperty(args[0], args[1], args[2], args[3])
    }
    style.on('updateProperty', cb)
    this._style?.off('updateProperty', cb)
    this._style = style
  }

  _layout: YogaNode = Element.layoutEngine!.Node.create()

  transform = new Transform2D()
  protected _parentTransformDirtyId?: number

  opacity = 1
  visible = true
  protected _parentOpacity?: number
  protected _parentVisible?: boolean
  protected _modulate = new Color(0xFFFFFFFF)
  protected _backgroundImage?: Texture2D

  context = new CanvasContext()
  protected _resetContext = true
  protected _redrawing = false
  protected _reflowing = false
  protected _repainting = false
  protected _originalBatchables: CanvasBatchable[] = []
  protected _layoutedBatchables: CanvasBatchable[] = []
  protected _batchables: CanvasBatchable[] = []

  constructor(properties?: Partial<ElementProperties>, children: Node[] = []) {
    super()
    this._updateStyleProperty = this._updateStyleProperty.bind(this)
    this.style = new ElementStyle()
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

  protected override _parented(parent: Node): void {
    super._parented(parent)

    if ((parent as Element)._layout && this._layout) {
      (parent as Element)._layout!.insertChild(
        this._layout,
        (parent as Element)._layout.getChildCount(),
      )
    }
  }

  protected override _unparented(oldParent: Node): void {
    super._unparented(oldParent)

    if ((oldParent as Element)._layout && this._layout) {
      (oldParent as Element)._layout!.removeChild(this._layout)
    }
  }

  protected override _updateProperty(key: PropertyKey, value: any, oldValue: any, declaration?: PropertyDeclaration): void {
    super._updateProperty(key, value, oldValue, declaration)

    switch (key) {
      case 'modulate':
        this._modulate.value = value
        this.requestRepaint()
        break
      case 'blendMode':
        return this.requestRepaint()
    }
  }

  // eslint-disable-next-line unused-imports/no-unused-vars
  protected _updateStyleProperty(key: PropertyKey, value: any, oldValue: any, declaration?: PropertyDeclaration): void {
    switch (key) {
      /** layout */
      case 'alignContent':
        this._layout.setAlignContent(alignMap[this.style.alignContent])
        break
      case 'alignItems':
        this._layout.setAlignItems(alignMap[this.style.alignItems])
        break
      case 'alignSelf':
        this._layout.setAlignSelf(alignMap[this.style.alignSelf])
        break
      case 'aspectRatio':
        // this._layout.setIsReferenceBaseline(this.style.isReferenceBaseline)
        this._layout.setAspectRatio(value)
        break
      case 'borderTop':
        this._layout.setBorder(Edge.Top, this.style.borderWidth)
        break
      case 'borderBottom':
        this._layout.setBorder(Edge.Bottom, this.style.borderWidth)
        break
      case 'borderLeft':
        this._layout.setBorder(Edge.Left, this.style.borderWidth)
        break
      case 'borderRight':
        this._layout.setBorder(Edge.Right, this.style.borderWidth)
        break
      case 'border':
        this._layout.setBorder(Edge.All, this.style.borderWidth)
        break
      case 'direction':
        this._layout.setDirection(directionMap[this.style.direction])
        break
      case 'display':
        this._layout.setDisplay(displayMap[this.style.display])
        break
      case 'flex':
        this._layout.setFlex(this.style.flex)
        break
      case 'flexBasis':
        this._layout.setFlexBasis(this.style.flexBasis)
        break
      case 'flexDirection':
        this._layout.setFlexDirection(flexDirectionMap[this.style.flexDirection])
        break
      case 'flexGrow':
        this._layout.setFlexGrow(this.style.flexGrow)
        break
      case 'flexShrink':
        this._layout.setFlexShrink(this.style.flexShrink)
        break
      case 'flexWrap':
        this._layout.setFlexWrap(flexWrapMap[this.style.flexWrap])
        break
      case 'height':
        this._layout.setHeight(this.style.height)
        break
      case 'justifyContent':
        this._layout.setJustifyContent(justifyMap[this.style.justifyContent])
        break
      case 'gap':
        this._layout.setGap(Gutter.All, this.style.gap)
        break
      case 'marginTop':
        this._layout.setMargin(Edge.Top, this.style.marginTop)
        break
      case 'marginBottom':
        this._layout.setMargin(Edge.Top, this.style.marginBottom)
        break
      case 'marginLeft':
        this._layout.setMargin(Edge.Left, this.style.marginLeft)
        break
      case 'marginRight':
        this._layout.setMargin(Edge.Top, this.style.marginRight)
        break
      case 'margin':
        this._layout.setMargin(Edge.All, this.style.margin)
        break
      case 'maxHeight':
        this._layout.setMaxHeight(this.style.maxHeight)
        break
      case 'maxWidth':
        this._layout.setMaxWidth(this.style.maxWidth)
        break
      //   setDirtiedFunc(dirtiedFunc: DirtiedFunction | null): void;
      //   setMeasureFunc(measureFunc: MeasureFunction | null): void;
      case 'minHeight':
        this._layout.setMinHeight(this.style.minHeight)
        break
      case 'minWidth':
        this._layout.setMinWidth(this.style.minWidth)
        break
      case 'overflow':
        this._layout.setOverflow(overflowMap[this.style.overflow])
        break
      case 'paddingTop':
        this._layout.setPadding(Edge.Top, this.style.paddingTop)
        break
      case 'paddingBottom':
        this._layout.setPadding(Edge.Bottom, this.style.paddingBottom)
        break
      case 'paddingLeft':
        this._layout.setPadding(Edge.Left, this.style.paddingLeft)
        break
      case 'paddingRight':
        this._layout.setPadding(Edge.Right, this.style.paddingRight)
        break
      case 'padding':
        this._layout.setPadding(Edge.All, this.style.padding)
        break
      case 'top':
        this._layout.setPosition(Edge.Top, this.style.top)
        break
      case 'bottom':
        this._layout.setPosition(Edge.Bottom, this.style.bottom)
        break
      case 'left':
        this._layout.setPosition(Edge.Left, this.style.left)
        break
      case 'right':
        this._layout.setPosition(Edge.Right, this.style.right)
        break
      case 'position':
        this._layout.setPositionType(positionTypeMap[this.style.position])
        break
      case 'boxSizing':
        this._layout.setBoxSizing(boxSizingMap[this.style.boxSizing])
        break
      case 'width':
        this._layout.setWidth(this.style.width)
        break
      case 'scaleX':
      case 'scaleY':
      case 'rotate':
      case 'transform':
      case 'transformOrigin':
        this._updateTransform()
        break
      /** draw */
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
    const nodePath = '__$style.shadow'
    if (this.style.boxShadow !== 'none') {
      const node = this.getNode<ShadowEffect>(nodePath)
      if (node) {
        // TODO
      }
      else {
        this.addChild(new ShadowEffect(), 'back')
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
        this.addChild(new MaskEffect({ src: maskImage }), 'back')
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

  protected _updateOpacity(): void {
    const opacity = this.style.getComputedOpacity()
      * (this.getParent<Element>()?.opacity ?? 1)
    if (this.opacity !== opacity) {
      this.opacity = opacity
      this.requestRepaint()
    }
  }

  protected _updateVisible(): void {
    this.visible = this.style.visibility === 'visible'
    && (this.getParent<Element>()?.visible ?? true)
  }

  protected _updateTransform(): void {
    this.calculateLayout(undefined, undefined, Direction.LTR)

    const layout = this._layout.getComputedLayout()
    const { left, top, width, height } = layout

    const {
      scaleX, scaleY,
      rotate,
    } = this.style

    const t3d = new Transform2D(false)
    const t2d = new Transform2D(false)
      .scale(scaleX, scaleY)
      .translate(left, top)
      .rotate(rotate * DEG_TO_RAD)

    const _t3d = new Transform2D()
    parseCssFunctions(
      (!this.style.transform || this.style.transform === 'none')
        ? ''
        : this.style.transform,
      { width, height },
    )
      .forEach(({ name, args }) => {
        const values = args.map(arg => arg.normalizedIntValue)
        _t3d.identity()
        switch (name) {
          case 'translate':
            _t3d.translate((values[0]) * width, (values[1] ?? values[0]) * height)
            break
          case 'translateX':
            _t3d.translateX(values[0] * width)
            break
          case 'translateY':
            _t3d.translateY(values[0] * height)
            break
          case 'translateZ':
            _t3d.translateZ(values[0])
            break
          case 'translate3d':
            _t3d.translate3d(
              values[0] * width,
              (values[1] ?? values[0]) * height,
              values[2] ?? values[1] ?? values[0],
            )
            break
          case 'scale':
            _t3d.scale(values[0], values[1] ?? values[0])
            break
          case 'scaleX':
            _t3d.scaleX(values[0])
            break
          case 'scaleY':
            _t3d.scaleY(values[0])
            break
          case 'scale3d':
            _t3d.scale3d(values[0], values[1] ?? values[0], values[2] ?? values[1] ?? values[0])
            break
          case 'rotate':
            _t3d.rotate(values[0] * PI_2)
            break
          case 'rotateX':
            _t3d.rotateX(values[0] * PI_2)
            break
          case 'rotateY':
            _t3d.rotateY(values[0] * PI_2)
            break
          case 'rotateZ':
            _t3d.rotateZ(values[0] * PI_2)
            break
          case 'rotate3d':
            _t3d.rotate3d(
              values[0] * PI_2,
              (values[1] ?? values[0]) * PI_2,
              (values[2] ?? values[1] ?? values[0]) * PI_2,
              (values[3] ?? values[2] ?? values[1] ?? values[0]) * PI_2,
            )
            break
          case 'skew':
            _t3d.skew(values[0], values[0] ?? values[1])
            break
          case 'skewX':
            _t3d.skewX(values[0])
            break
          case 'skewY':
            _t3d.skewY(values[0])
            break
          case 'matrix':
            _t3d.set(values)
            break
        }
        t3d.multiply(_t3d)
      })

    t2d.update()
    t3d.update()

    const t2dArr = t2d.toArray()
    const t3dArr = t3d.toArray()
    const t3dT2dArr = [
      (t3dArr[0] * t2dArr[0]) + (t3dArr[3] * t2dArr[1]),
      (t3dArr[1] * t2dArr[0]) + (t3dArr[4] * t2dArr[1]),
      (t3dArr[2] * t2dArr[0]) + (t3dArr[5] * t2dArr[1]) + t2dArr[2],
      (t3dArr[0] * t2dArr[3]) + (t3dArr[3] * t2dArr[4]),
      (t3dArr[1] * t2dArr[3]) + (t3dArr[4] * t2dArr[4]),
      (t3dArr[2] * t2dArr[3]) + (t3dArr[5] * t2dArr[4]) + t2dArr[5],
      0, 0, 1,
    ]
    const [originX, originY] = this.style.getComputedTransformOrigin()
    const offsetX = originX * width
    const offsetY = originY * height
    t3dT2dArr[2] += (t3dT2dArr[0] * -offsetX) + (t3dT2dArr[1] * -offsetY) + offsetX
    t3dT2dArr[5] += (t3dT2dArr[3] * -offsetX) + (t3dT2dArr[4] * -offsetY) + offsetY

    // parent transform
    const parent = this.getParent<Element>()
    const parentTransform = parent?.transform
    this._parentTransformDirtyId = parentTransform?.dirtyId
    let transform
    if (parentTransform) {
      const pt = parentTransform.toArray()
      transform = [
        (t3dT2dArr[0] * pt[0]) + (t3dT2dArr[3] * pt[1]),
        (t3dT2dArr[1] * pt[0]) + (t3dT2dArr[4] * pt[1]),
        (t3dT2dArr[2] * pt[0]) + (t3dT2dArr[5] * pt[1]) + pt[2],
        (t3dT2dArr[0] * pt[3]) + (t3dT2dArr[3] * pt[4]),
        (t3dT2dArr[1] * pt[3]) + (t3dT2dArr[4] * pt[4]),
        (t3dT2dArr[2] * pt[3]) + (t3dT2dArr[5] * pt[4]) + pt[5],
        0, 0, 1,
      ]
    }
    else {
      transform = t3dT2dArr
    }
    this.transform.set(transform)
    this._updateOverflow()
    this.requestRedraw()
  }

  getRect(): Rect2 {
    const [a, c, tx, b, d, ty] = this.transform.toArray()
    const width = this._layout.getComputedWidth() ?? 0
    const height = this._layout.getComputedHeight() ?? 0
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
    const parent = this.getParent<Element>()

    if (this._parentVisible !== parent?.visible) {
      this._parentVisible = parent?.visible
      this._updateVisible()
    }

    if (this._parentOpacity !== parent?.opacity) {
      this._parentOpacity = parent?.opacity
      this._updateOpacity()
    }

    if (
      this._layout.hasNewLayout()
      || parent?.transform?.dirtyId !== this._parentTransformDirtyId
    ) {
      this._layout.markLayoutSeen()
      this._updateTransform()
    }

    super._process(delta)
  }

  protected _transformVertices(vertices: number[]): number[] {
    const [a, c, tx, b, d, ty] = this.transform.toArray()
    const newVertices = vertices.slice()
    for (let len = vertices.length, i = 0; i < len; i += 2) {
      const x = vertices[i]
      const y = vertices[i + 1]
      newVertices[i] = (a * x) + (c * y) + tx
      newVertices[i + 1] = (b * x) + (d * y) + ty
    }
    return newVertices
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
        this._layout.getComputedWidth() / texture.width,
        this._layout.getComputedHeight() / texture.height,
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
    const width = this._layout.getComputedWidth()
    const height = this._layout.getComputedHeight()
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
    return this._repaint(
      batchables.map((batchable) => {
        return {
          ...batchable,
          vertices: this._transformVertices(batchable.vertices),
        }
      }),
    )
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

  calculateLayout(width?: number | 'auto', height?: number | 'auto', direction?: Direction): void {
    const parent = this.getParent<Element>()
    if (parent?.calculateLayout) {
      parent.calculateLayout(width, height, direction)
    }
    else {
      this._layout.calculateLayout(width, height, direction)
    }
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
