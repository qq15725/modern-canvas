import type {
  Background,
  Chart,
  CommentThread,
  Connection,
  Display,
  Fill,
  Foreground,
  NormalizedFilter,
  Outline,
  Shadow,
  Shape,
  Table,
  Text,
} from 'modern-idoc'
import type { Path2D, Vector2Like } from 'modern-path2d'
import type {
  InputEvent,
  InputEventKey,
  PointerInputEvent,
} from '../../../core'
import type { Node, Rectangulable, RectangulableEvents, SceneTree, Viewport } from '../../main'
import type { Node2DEvents, Node2DProperties } from '../Node2D'
import type { Element2DStyleProperties } from './Element2DStyle'
import { clearUndef, getDefaultLayoutStyle, getDefaultTextStyle, isNone, stringifyFilter } from 'modern-idoc'
import { Transform2D, Vector2 } from 'modern-path2d'
import {
  Aabb2D,
  customNode,
  DEG_TO_RAD,
  Obb2D,
} from '../../../core'
import { parseCssTransformOrigin } from '../../../css'
import { ColorFilterEffect, MaskEffect } from '../../effects'
import { Node2D } from '../Node2D'
import { Element2DBackground } from './Element2DBackground'
import { Element2DChart } from './Element2DChart'
import { Element2DComments } from './Element2DComments'
import { Element2DConnection } from './Element2DConnection'
import { Element2DFill } from './Element2DFill'
import { Element2DForeground } from './Element2DForeground'
import { Element2DOutline } from './Element2DOutline'
import { Element2DShadow } from './Element2DShadow'
import { Element2DShape } from './Element2DShape'
import { Element2DStyle } from './Element2DStyle'
import { Element2DTable } from './Element2DTable'
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
  connection: Connection
  table: Table
  chart: Chart
  comments: CommentThread[]
  /** 元素级结构化滤镜（Effect.filter），转成 CSS filter 后与 style.filter 合并 */
  filter: NormalizedFilter
}

const layoutStyle = new Set(Object.keys(getDefaultLayoutStyle()))
const textStyles = new Set(Object.keys(getDefaultTextStyle()))
// 纯平移 style：只改元素在父级中的位置，不影响其内部文字排版。它们虽属 layoutStyle，
// 但不应触发 text.update()——否则拖拽（每帧改 left/top）会每帧重跑文字排版+重栅格纹理，
// 拖动时白白消耗。只排除 left/top（拖拽实际改动的键），right/bottom 保守起见仍触发更新。
const positionStyle = new Set(['left', 'top'])

// reusable scratch for viewport culling (avoids per-frame allocation)
const _cullVec = new Vector2()
const _cullCorners: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 1]]

@customNode('Element2D')
export class Element2D extends Node2D implements Rectangulable {
  readonly flexbox = new Flexbox(this)
  readonly aabb = new Aabb2D()
  readonly globalAabb = new Aabb2D()

  protected _parentGlobalDisplay?: Display
  protected _globalDisplay?: Display
  get globalDisplay(): Display | undefined { return this._globalDisplay }

  readonly size = new Vector2(0, 0, () => {
    this.onUpdateStyleProperty('transformOrigin', this.style.transformOrigin, undefined)
    this.onUpdateStyleProperty('transform', this.style.transform, undefined)
    this.updateGlobalTransform()
    this.requestDraw()
  })

  protected _allowPointerEvents = true
  protected _overflowHidden = false

  protected _style = new Element2DStyle().on('updateProperty', (...args: any[]) => {
    this.onUpdateStyleProperty(args[0], args[1], args[2])
  })

  get style(): Element2DStyle { return this._style }
  set style(value: Element2DProperties['style'] | undefined) {
    this._beginBatch()
    try {
      this._style.resetProperties().setProperties(value)
    }
    finally {
      this._endBatch()
    }
  }

  protected _background = new Element2DBackground(this)
  get background(): Element2DBackground { return this._background }
  set background(value: Element2DProperties['background'] | undefined) { this._background.resetProperties().setProperties(value) }

  protected _shape = new Element2DShape(this)
  get shape(): Element2DShape { return this._shape }
  set shape(value: Element2DProperties['shape'] | undefined) { this._shape.resetProperties().setProperties(value as Record<string, any>) }

  protected _fill = new Element2DFill(this)
  get fill(): Element2DFill { return this._fill }
  set fill(value: Element2DProperties['fill'] | undefined) { this._fill.resetProperties().setProperties(value) }

  protected _outline = new Element2DOutline(this)
  get outline(): Element2DOutline { return this._outline }
  set outline(value: Element2DProperties['outline'] | undefined) { this._outline.resetProperties().setProperties(value) }

  protected _foreground = new Element2DForeground(this)
  get foreground(): Element2DForeground { return this._foreground }
  set foreground(value: Element2DProperties['foreground'] | undefined) { this._foreground.resetProperties().setProperties(value) }

  protected _text = new Element2DText(this)
  get text(): Element2DText { return this._text }
  set text(value: Element2DProperties['text'] | undefined) { this._text.resetProperties().setProperties(value) }

  protected _shadow = new Element2DShadow(this)
  get shadow(): Element2DShadow { return this._shadow }
  set shadow(value: Element2DProperties['shadow'] | undefined) { this._shadow.resetProperties().setProperties(value) }

  protected _connection = new Element2DConnection(this)
  get connection(): Element2DConnection { return this._connection }
  set connection(value: Element2DProperties['connection'] | undefined) { this._connection.resetProperties().setProperties(value) }

  protected _table = new Element2DTable(this)
  get table(): Element2DTable { return this._table }
  set table(value: Element2DProperties['table'] | undefined) { this._table.resetProperties().setProperties(value as Record<string, any>) }

  protected _chart = new Element2DChart(this)
  get chart(): Element2DChart { return this._chart }
  set chart(value: Element2DProperties['chart'] | undefined) { this._chart.resetProperties().setProperties(value as Record<string, any>) }

  protected _comments = new Element2DComments(this)
  get comments(): Element2DComments { return this._comments }
  set comments(value: Element2DProperties['comments'] | undefined) { this._comments.resetProperties().setProperties(value) }

  /** Last routed connection path; identity-compared to skip re-layout when unchanged. */
  protected _lastRoutePath?: Path2D
  // batch depth for setProperties / style setter — defers the heavy text relayout
  // so setting many text/layout style props at once relayouts the text only once
  protected _batchDepth = 0
  protected _pendingTextUpdate = false
  protected _colorFilterEffect?: ColorFilterEffect
  protected _maskEffect?: MaskEffect

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
      this._beginBatch()
      try {
        const {
          style,
          text,
          shape,
          background,
          fill,
          outline,
          foreground,
          shadow,
          connection,
          table,
          chart,
          comments,
          filter,
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
        connection && this.connection.setProperties(connection)
        table && this.table.setProperties(table)
        chart && this.chart.setProperties(chart)
        comments && this.comments.setProperties(comments)
        this._updateElementFilter(filter)
        super.setProperties(restProperties)
      }
      finally {
        this._endBatch()
      }
    }
    return this
  }

  override _updateTransform(): void {
    super._updateTransform()
    this._updateAabb()
  }

  protected _updateAabb(): void {
    const { a, b, c, d, tx, ty } = this.transform
    const x: number[] = []
    const y: number[] = []
    this._getPointArray().forEach((p) => {
      x.push((a * p.x) + (c * p.y) + tx)
      y.push((b * p.x) + (d * p.y) + ty)
    })
    const min = { x: Math.min(...x), y: Math.min(...y) }
    const max = { x: Math.max(...x), y: Math.max(...y) }
    this.aabb.min.set(min.x, min.y)
    this.aabb.size.set(max.x - min.x, max.y - min.y)
  }

  override updateGlobalTransform(): void {
    super.updateGlobalTransform()
    this._updateGlobalAabb()
  }

  protected _updateGlobalAabb(): void {
    const { a, b, c, d, tx, ty } = this.globalTransform
    const x: number[] = []
    const y: number[] = []
    this._getPointArray().forEach((p) => {
      x.push((a * p.x) + (c * p.y) + tx)
      y.push((b * p.x) + (d * p.y) + ty)
    })
    const min = { x: Math.min(...x), y: Math.min(...y) }
    const max = { x: Math.max(...x), y: Math.max(...y) }
    this.globalAabb.min.set(min.x, min.y)
    this.globalAabb.size.set(max.x - min.x, max.y - min.y)
    this._updateMask()
  }

  protected _updateMask(): void {
    if (this._overflowHidden) {
      this._mask = this.globalAabb
    }
    else {
      this._mask = undefined
    }
  }

  protected _updateGlobalDisplay(): void {
    this._parentGlobalDisplay = this.getParent<Element2D>()?.globalDisplay
    this._globalDisplay = this.style.display
      ?? this._parentGlobalDisplay
  }

  /**
   * 批量修改：fn 内对 style 的多次改动只在结束时合并触发一次 text.update()（文字重栅格）。
   * 否则逐个改 width/height/fontSize 会各自重栅一次（如 resize 时每帧重栅 3 次）。
   */
  batch(fn: () => void): void {
    this._beginBatch()
    try {
      fn()
    }
    finally {
      this._endBatch()
    }
  }

  protected _beginBatch(): void {
    this._batchDepth++
  }

  protected _endBatch(): void {
    if (--this._batchDepth > 0) {
      return
    }
    this._batchDepth = 0
    if (this._pendingTextUpdate) {
      this._pendingTextUpdate = false
      if (this.text.isValid()) {
        this.text.update()
      }
    }
  }

  onUpdateStyleProperty(key: string, value: any, oldValue: any): void {
    this.emit('updateStyleProperty', key, value, oldValue)
    this._updateStyleProperty(key, value, oldValue)
  }

  protected _updateStyleProperty(key: string, value: any, oldValue: any): void {
    switch (key) {
      case 'display':
        this._updateGlobalDisplay()
        break
      case 'rotate':
        this.rotation = (value || 0) * DEG_TO_RAD
        this.updateGlobalTransform()
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
        this.extraTransform.identity()
        this.extraTransform.translate(-this.pivot.x, -this.pivot.y)
        this.extraTransform.prependCssTransform(value ?? '', {
          width: this.size.width,
          height: this.size.height,
        })
        this.extraTransform.translate(this.pivot.x, this.pivot.y)
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
        this._updateStyleFilter(value)
        break
      case 'maskImage':
        this._updateStyleMaskImage(value)
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
        this._updateMask()
        break
      case 'pointerEvents':
        this._allowPointerEvents = !isNone(value)
        break
      case 'borderRadius':
        this.requestDraw()
        break
    }

    if ((textStyles.has(key) || layoutStyle.has(key)) && !positionStyle.has(key)) {
      if (this.text.isValid()) {
        if (this._batchDepth > 0) {
          this._pendingTextUpdate = true
        }
        else {
          this.text.update()
        }
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

  override requestLayout(): void {
    super.requestLayout()
    this.flexbox.update()
  }

  protected override _process(delta: number): void {
    super._process(delta)

    this.foreground.process(delta)
    this.fill.process(delta)
    this.text.process(delta)
    this.outline.process(delta)
    this.background.process(delta)

    if (this._connection.isValid()) {
      this._updateConnection()
    }

    const parent = this.getParent<Element2D>()

    if (this._parentGlobalDisplay !== parent?.globalDisplay) {
      this._updateGlobalDisplay()
    }

    this.flexbox.update()
  }

  protected _updateConnection(): void {
    const path = this._connection.route()
    if (!path || !path.getLength())
      return

    // route() returns the same instance while endpoints/mode are unchanged —
    // skip the per-frame reroute + relayout + redraw when nothing moved
    if (path === this._lastRoutePath)
      return
    this._lastRoutePath = path

    // size the element to the route's own bounding box (orthogonal/curved routes
    // can extend past the endpoints), so the local path draws 1:1 under the transform
    const bbox = path.getBoundingBox()
    const w = Math.max(bbox.width, 1)
    const h = Math.max(bbox.height, 1)

    // write directly to avoid triggering the style→position feedback loop
    this.position.x = bbox.x
    this.position.y = bbox.y
    this.size.width = w
    this.size.height = h
    this.updateGlobalTransform()

    // clone before transforming so the connection's cached path stays in world space
    const local = path.clone().applyTransform(new Transform2D().translate(-bbox.x, -bbox.y))
    this._shape.setLocalPath(local)
  }

  /** 上一次渲染时的视口裁剪结果（true=离屏被裁剪）。供非渲染阶段（如 Video2D 解码门控）读取。 */
  protected _renderCulled = false

  protected override _cullsRender(): boolean {
    this._renderCulled = this._computeCullsRender()
    return this._renderCulled
  }

  protected _computeCullsRender(): boolean {
    // conservative: never cull nodes whose visible area can exceed their AABB
    // (filters/masks spill outside it; connection routes are sized to their bbox
    // but we keep them to be safe), so culling only drops clearly off-screen content
    if (
      this._colorFilterEffect
      || this._maskEffect
      || this._overflowHidden
      || this._connection.isValid()
    ) {
      return false
    }
    const viewport = this.tree?.getCurrentViewport()
    if (!viewport?.valid) {
      return false
    }
    return !this._intersectsViewport(viewport)
  }

  protected _intersectsViewport(viewport: Viewport): boolean {
    // the viewport's screen rect → world-space AABB (globalAabb is in world space)
    const t = viewport.canvasTransform
    const vw = viewport.width
    const vh = viewport.height
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    for (const [ux, uy] of _cullCorners) {
      t.applyAffineInverse({ x: ux * vw, y: uy * vh }, _cullVec)
      minX = Math.min(minX, _cullVec.x)
      maxX = Math.max(maxX, _cullVec.x)
      minY = Math.min(minY, _cullVec.y)
      maxY = Math.max(maxY, _cullVec.y)
    }
    // generous margin (one viewport span each axis) so panning never clips visibly
    const mx = maxX - minX
    const my = maxY - minY
    const { min, size } = this.globalAabb
    return !(
      min.x > maxX + mx
      || min.x + size.x < minX - mx
      || min.y > maxY + my
      || min.y + size.y < minY - my
    )
  }

  // style.filter（CSS 字符串）
  protected _styleFilter?: string
  // element.filter（结构化 Filter）转成的 CSS 字符串
  protected _elementFilter?: string

  protected _updateStyleFilter(value?: string): void {
    this._styleFilter = isNone(value) ? undefined : value
    this._applyColorFilter()
  }

  /** 元素级结构化滤镜 Effect.filter → CSS filter，与 style.filter 合并 */
  protected _updateElementFilter(filter?: NormalizedFilter): void {
    const css = filter ? stringifyFilter(filter) : ''
    this._elementFilter = css || undefined
    this._applyColorFilter()
  }

  protected _applyColorFilter(): void {
    const filter = [this._styleFilter, this._elementFilter].filter(Boolean).join(' ').trim()
    if (filter) {
      if (!this._colorFilterEffect) {
        this._colorFilterEffect = new ColorFilterEffect({
          name: 'styleFilter',
          internalMode: 'front',
        })
        this.append(this._colorFilterEffect)
      }
      this._colorFilterEffect.filter = filter
    }
    else {
      this._colorFilterEffect?.remove()
      this._colorFilterEffect = undefined
      this.requestRender()
    }
  }

  protected _updateStyleMaskImage(value?: string): void {
    if (!isNone(value)) {
      if (!this._maskEffect) {
        this._maskEffect = new MaskEffect({
          name: 'styleMaskImage',
          internalMode: 'back',
        })
        this.append(this._maskEffect)
      }
      this._maskEffect.image = value
    }
    else {
      this._maskEffect?.remove()
      this._maskEffect = undefined
      this.requestRender()
    }
  }

  protected _getPointArray(): Vector2Like[] {
    const { width, height } = this.size
    return [
      { x: 0, y: 0 },
      { x: 0, y: height },
      { x: width, y: 0 },
      { x: width, y: height },
    ]
  }

  getRect(): Aabb2D {
    return this.globalAabb
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

  protected _draw(): void {
    super._draw()

    if (this._background.isValid()) {
      this._shape.draw(!this._background.fillWithShape)
      this._background.draw()
    }

    if (this._fill.isValid()) {
      this._shape.draw()
      this._fill.draw()
    }

    if (this._outline.isValid()) {
      this._shape.draw()
      this._outline.draw()
    }

    if (this._foreground.isValid()) {
      this._shape.draw(!this._foreground.fillWithShape)
      this._foreground.draw()
    }

    if (this._text.isValid()) {
      this._text.draw()
    }

    if (this._chart.isValid()) {
      this._chart.draw()
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
    // Cheap AABB reject first. Shapes (and connection routes) live inside the size
    // box; stroke/tolerance can spill out by up to half the outline width, so widen
    // the bounds by that much before the precise geometry test.
    const slack = (Number(this._outline.width) || 0) / 2 + 1
    if (
      localPos.x < -slack || localPos.x >= width + slack
      || localPos.y < -slack || localPos.y >= height + slack
    ) {
      return false
    }
    // With real geometry (a filled/outlined shape or a connection route), hit-test
    // the actual path; otherwise fall back to the plain rectangle.
    if (this._shape.isValid() || this._shape.localPath) {
      return this._shape.isPointInside(localPos, {
        strokeWidth: Number(this._outline.width) || 1,
      })
    }
    return localPos.x >= 0 && localPos.x < width && localPos.y >= 0 && localPos.y < height
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
      connection: notEmptyObjectOrUndef(this.connection.toJSON()),
      table: notEmptyObjectOrUndef(this.table.toJSON()),
      chart: notEmptyObjectOrUndef(this.chart.toJSON()),
      comments: this.comments.isValid() ? this.comments.toJSON() : undefined,
    })
  }

  protected override _destroy(): void {
    super._destroy()
    this.flexbox.destroy()
    this.aabb.destroy()
    this.globalAabb.destroy()
    this.size.destroy()
    this.style.destroy()
    this.background.destroy()
    this.shape.destroy()
    this.fill.destroy()
    this.outline.destroy()
    this.text.destroy()
    this.foreground.destroy()
    this.shadow.destroy()
    this.connection.destroy()
    this.comments.destroy()
    this._colorFilterEffect = undefined
    this._maskEffect = undefined
  }
}
