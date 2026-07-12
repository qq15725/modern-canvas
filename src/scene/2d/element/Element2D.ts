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
  WebGLRenderer,
} from '../../../core'
import type { Node, Rectangulable, RectangulableEvents, SceneTree, Viewport } from '../../main'
import type { Node2DEvents, Node2DProperties } from '../Node2D'
import type { Element2DStyleProperties } from './Element2DStyle'
import { clearUndef, getDefaultLayoutStyle, getDefaultTextStyle, isNone, stringifyFilter } from 'modern-idoc'
import { Transform2D, Vector2 } from 'modern-path2d'
import {
  Aabb2D,
  bumpGeometryRevision,
  customNode,
  DEG_TO_RAD,
  geometryRevision,
  Obb2D,
} from '../../../core'
import { parseCssTransformOrigin } from '../../../css'
import { ColorFilterEffect, MaskEffect } from '../../effects'
import { ColorTexture } from '../../resources'
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

// 滚动条（overflow:scroll/auto）常量，单位=屏幕像素（渲染时按相机 zoom 换算成世界尺寸）。
const SB_THICK = 6 // 粗细
const SB_GAP = 2 // 距边内边距
const SB_MIN = 24 // thumb 最小长度
const _sbPoint = { x: 0, y: 0 }

function sbClamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v
}

interface ScrollThumb { x: number, y: number, w: number, h: number, travel: number, span: number, min: number }

export interface ScrollRange {
  x: { min: number, max: number }
  y: { min: number, max: number }
  content: { w: number, h: number }
}

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
  // 滚动条模式（overflow:scroll 常显 / auto 悬停显示）+ 运行时交互态（不序列化）。
  protected _scrollbarMode?: 'scroll' | 'auto'
  protected _pointerInside = false
  protected _scrollbarHoverAxis?: 'x' | 'y'
  protected _scrollbarDrag?: { axis: 'x' | 'y', startScreen: number, startOffset: number, travel: number, span: number, min: number }
  // thumb 的 batchable 按几何缓存复用：合批器的静态帧复用按对象 identity 判断，
  // 每帧 new 会让整个 flush 每帧全量重建；仅几何/透明度变化时才换新对象。
  protected _scrollThumbCache: Record<'v' | 'h', { key: string, batchable: any } | undefined> = { v: undefined, h: undefined }

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

  /**
   * 供文字渲染子（Element2DText）在变形/内容改变、渲染范围可能超出布局框时调用，
   * 按最新的 _getPointArray（已并入变形后字形范围）重算本地/全局 aabb，让选框贴合。
   */
  updateContentAabb(): void {
    this._updateAabb()
    this._updateGlobalAabb()
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
    // Connections cache their route against this; see geometryRevision.
    bumpGeometryRevision()
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
        // hidden/clip 只裁剪；scroll/auto 裁剪 + 显示滚动条（scroll 常显、auto 悬停显示）。
        this._overflowHidden = value === 'hidden' || value === 'clip' || value === 'scroll' || value === 'auto'
        this._scrollbarMode = value === 'scroll' ? 'scroll' : value === 'auto' ? 'auto' : undefined
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

    // isRoutable, not isValid: a connection whose targets left the tree must stop routing.
    if (this._connection.isRoutable()) {
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
    // but we keep them to be safe), so culling only drops clearly off-screen content.
    // A dangling connection (targets gone) has nothing left to draw beyond its aabb,
    // so it goes through normal culling rather than being pinned on screen forever.
    if (
      this._colorFilterEffect
      || this._maskEffect
      || this._overflowHidden
      || this._connection.isRoutable()
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
    // 文字的实际渲染范围（base.boundingBox）可能超出布局框 size——变形把字形移出框、
    // 溢出/超大字形亦然。aabb/选框只按 size 四角算就裹不住露在框外的部分，故并入渲染范围。
    if (this._text.isValid()) {
      const bb = this._text.base.boundingBox
      if (bb && (bb.left < 0 || bb.top < 0 || bb.left + bb.width > width || bb.top + bb.height > height)) {
        const left = Math.min(0, bb.left)
        const top = Math.min(0, bb.top)
        const right = Math.max(width, bb.left + bb.width)
        const bottom = Math.max(height, bb.top + bb.height)
        return [
          { x: left, y: top },
          { x: left, y: bottom },
          { x: right, y: top },
          { x: right, y: bottom },
        ]
      }
    }
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
    const s = this.globalScale
    const _pivot = this.globalTransform.apply(pivot).sub(pivot)
    // 绕 pivot 施加 globalScale 再平移：Obb2D 由这组「未旋转」的点取 AABB 当尺寸、
    // 旋转另行传入，所以点须是缩放后的轴对齐盒。scale=1 时与原实现逐点等价（不改行为），
    // scale≠1 时选框/命中/getTransform 才随缩放正确（globalAabb 一直用完整 transform、已含 scale）。
    return new Obb2D(
      this._getPointArray().map(p => ({
        x: pivot.x + (p.x - pivot.x) * s.x + _pivot.x,
        y: pivot.y + (p.y - pivot.y) * s.y + _pivot.y,
      })),
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

  protected _scrollRangeCache?: { rev: number, value: ScrollRange | undefined }

  /**
   * 内容（子节点本地 AABB 并集）相对自身 box 的可滚动区间。用于滚动条与滚轮：
   * offset>0 表示内容上/左移、露出下/右侧内容。无子节点返回 undefined。
   *
   * 按全局 geometryRevision 缓存（与连线 route 缓存同款）：同一帧内滚轮 handler /
   * render / thumb 命中检测会多次调用，宿主（如 mce）还经 reactive proxy 访问——
   * 子节点上千时每次遍历是数千次 proxy 读，缓存命中则一次都不发生。
   */
  getScrollRange(): ScrollRange | undefined {
    const rev = geometryRevision()
    const cache = this._scrollRangeCache
    if (cache && cache.rev === rev) {
      return cache.value
    }
    const value = this._computeScrollRange()
    this._scrollRangeCache = { rev, value }
    return value
  }

  protected _computeScrollRange(): ScrollRange | undefined {
    const kids = this.getChildren() as Element2D[]
    if (!kids.length) {
      return undefined
    }
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const c of kids) {
      const x = c.position?.x ?? 0
      const y = c.position?.y ?? 0
      const w = c.size?.width ?? 0
      const h = c.size?.height ?? 0
      if (x < minX)
        minX = x
      if (y < minY)
        minY = y
      if (x + w > maxX)
        maxX = x + w
      if (y + h > maxY)
        maxY = y + h
    }
    const fw = this.size.width
    const fh = this.size.height
    return {
      x: { min: Math.min(0, minX), max: Math.max(0, maxX - fw) },
      y: { min: Math.min(0, minY), max: Math.max(0, maxY - fh) },
      content: { w: maxX - Math.min(0, minX), h: maxY - Math.min(0, minY) },
    }
  }

  // thumb 的世界坐标矩形（沿自身世界 AABB 右/下内侧）。zx/zy=世界→屏幕缩放，
  // 用于把「屏幕恒定像素」的粗细/间距换算成世界尺寸。无溢出返回空。
  protected _scrollThumbs(zx: number, zy: number): { v?: ScrollThumb, h?: ScrollThumb } | undefined {
    const range = this.getScrollRange()
    if (!range) {
      return undefined
    }
    const overflowX = range.x.max > range.x.min
    const overflowY = range.y.max > range.y.min
    if (!overflowX && !overflowY) {
      return undefined
    }
    const a = this.globalAabb
    const thickXw = SB_THICK / zx
    const thickYw = SB_THICK / zy
    const gapXw = SB_GAP / zx
    const gapYw = SB_GAP / zy
    const co = this.contentOffset
    const out: { v?: ScrollThumb, h?: ScrollThumb } = {}
    if (overflowY) {
      const trackLen = a.size.y - gapYw * 2 - (overflowX ? thickYw + gapYw : 0)
      const thumbLen = Math.max(SB_MIN / zy, Math.min(trackLen, trackLen * this.size.height / range.content.h))
      const span = range.y.max - range.y.min
      const frac = span > 0 ? (co.y - range.y.min) / span : 0
      out.v = {
        x: a.min.x + a.size.x - gapXw - thickXw,
        y: a.min.y + gapYw + frac * (trackLen - thumbLen),
        w: thickXw,
        h: thumbLen,
        travel: (trackLen - thumbLen) * zy, // 屏幕像素行程
        span,
        min: range.y.min,
      }
    }
    if (overflowX) {
      const trackLen = a.size.x - gapXw * 2 - (overflowY ? thickXw + gapXw : 0)
      const thumbLen = Math.max(SB_MIN / zx, Math.min(trackLen, trackLen * this.size.width / range.content.w))
      const span = range.x.max - range.x.min
      const frac = span > 0 ? (co.x - range.x.min) / span : 0
      out.h = {
        x: a.min.x + gapXw + frac * (trackLen - thumbLen),
        y: a.min.y + a.size.y - gapYw - thickYw,
        w: thumbLen,
        h: thickYw,
        travel: (trackLen - thumbLen) * zx,
        span,
        min: range.x.min,
      }
    }
    return out
  }

  // 当前用于世界↔屏幕换算的视口：渲染期用正在渲染的视口，输入期(getCurrentViewport
  // 为空)回退到根视口——两者的 canvasTransform 都是相机变换。
  protected _scrollViewport(): Viewport | undefined {
    return this.tree?.getCurrentViewport() ?? this.getViewport()
  }

  // 在子节点画完、mask 弹出后叠画滚动条（不被裁剪、在最上层）。
  override render(renderer: WebGLRenderer, next?: () => void): void {
    super.render(renderer, next)
    if (!this._scrollbarMode) {
      return
    }
    // auto：仅悬停在画板上或拖拽中才显示；scroll：有溢出即常显。
    if (this._scrollbarMode === 'auto' && !this._pointerInside && !this._scrollbarDrag) {
      return
    }
    const viewport = this._scrollViewport()
    if (!viewport?.valid) {
      return
    }
    const zx = viewport.canvasTransform.a || 1
    const zy = viewport.canvasTransform.d || 1
    const thumbs = this._scrollThumbs(zx, zy)
    if (!thumbs) {
      return
    }
    if (thumbs.v) {
      this._drawScrollThumb(renderer, 'v', thumbs.v, this._scrollbarHoverAxis === 'y' || this._scrollbarDrag?.axis === 'y')
    }
    if (thumbs.h) {
      this._drawScrollThumb(renderer, 'h', thumbs.h, this._scrollbarHoverAxis === 'x' || this._scrollbarDrag?.axis === 'x')
    }
  }

  protected _drawScrollThumb(renderer: WebGLRenderer, slot: 'v' | 'h', r: ScrollThumb, active: boolean): void {
    const { x, y, w, h } = r
    // 半透明黑（modulate 的 alpha 乘子，0-255）；命中/拖拽时加深。
    const alpha = active ? 150 : 82
    // 几何/透明度未变则复用缓存对象——保住合批器的静态帧复用（悬停静止时零重建）。
    const key = `${x.toFixed(2)},${y.toFixed(2)},${w.toFixed(2)},${h.toFixed(2)},${alpha}`
    let cached = this._scrollThumbCache[slot]
    if (!cached || cached.key !== key) {
      cached = {
        key,
        batchable: {
          vertices: new Float32Array([x, y, x + w, y, x + w, y + h, x, y + h]),
          uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
          indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
          texture: ColorTexture.get('#000000'),
          modulate: [255, 255, 255, alpha],
        },
      }
      this._scrollThumbCache[slot] = cached
    }
    renderer.batch2D.render(cached.batchable)
  }

  // 滚动条的悬停/拖拽输入。返回 true 表示已消费（拖拽中），调用方应 stopPropagation。
  protected _scrollbarInput(event: InputEvent, key: InputEventKey): boolean {
    if (!this._scrollbarMode) {
      return false
    }
    const pe = event as PointerInputEvent

    // 拖拽进行中：任意位置的 move/up 都由本元素处理。
    if (this._scrollbarDrag) {
      const d = this._scrollbarDrag
      if (key === 'pointermove') {
        const cur = d.axis === 'y' ? pe.screenY : pe.screenX
        if (d.travel > 0) {
          this.contentOffset[d.axis] = sbClamp(d.startOffset + (cur - d.startScreen) / d.travel * d.span, d.min, d.min + d.span)
        }
        event.stopPropagation()
        return true
      }
      if (key === 'pointerup') {
        this._scrollbarDrag = undefined
        event.stopPropagation()
        return true
      }
      return false
    }

    const viewport = this._scrollViewport()
    if (!viewport?.valid) {
      return false
    }
    const zx = viewport.canvasTransform.a || 1
    const zy = viewport.canvasTransform.d || 1
    _sbPoint.x = pe.screenX
    _sbPoint.y = pe.screenY
    viewport.toCanvasGlobal(_sbPoint, _sbPoint)
    const a = this.globalAabb
    const wasInside = this._pointerInside
    const prevHover = this._scrollbarHoverAxis
    this._pointerInside = _sbPoint.x >= a.min.x && _sbPoint.x <= a.min.x + a.size.x
      && _sbPoint.y >= a.min.y && _sbPoint.y <= a.min.y + a.size.y

    // 指针在画板外且无悬停态需要清理时早退——thumb 全在 AABB 内侧不可能命中，
    // 免得每次 pointermove 都为每个画板遍历子节点算滚动区间。
    if (!this._pointerInside && !wasInside && !prevHover) {
      return false
    }

    const thumbs = this._pointerInside ? this._scrollThumbs(zx, zy) : undefined
    const hit = (r?: ScrollThumb): boolean =>
      !!r && _sbPoint.x >= r.x && _sbPoint.x <= r.x + r.w && _sbPoint.y >= r.y && _sbPoint.y <= r.y + r.h
    const onV = hit(thumbs?.v)
    const onH = hit(thumbs?.h)
    this._scrollbarHoverAxis = onV ? 'y' : onH ? 'x' : undefined

    // 悬停态变化需重绘（auto 显隐 / thumb 高亮）。
    if (this._pointerInside !== wasInside || this._scrollbarHoverAxis !== prevHover) {
      this.requestDraw()
    }

    if (key === 'pointerdown' && (onV || onH)) {
      const t = (onV ? thumbs!.v! : thumbs!.h!)
      const axis: 'x' | 'y' = onV ? 'y' : 'x'
      this._scrollbarDrag = {
        axis,
        startScreen: axis === 'y' ? pe.screenY : pe.screenX,
        startOffset: this.contentOffset[axis],
        travel: t.travel,
        span: t.span,
        min: t.min,
      }
      event.stopPropagation()
      return true
    }
    return false
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
        // 滚动条优先（overflow:scroll/auto）：拖拽/命中时消费事件，阻止其它交互。
        if (this._scrollbarInput(event, key)) {
          return
        }
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
