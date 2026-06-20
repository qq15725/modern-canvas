import type { CssFunction, CssFunctionArg } from '../../core'
import type { Node, TimelineNodeProperties } from '../main'
import { property, RawWeakMap } from 'modern-idoc'
import { Path2D, PathMeasure } from 'modern-path2d'
import { Element2D } from '../2d'
import { clamp, customNode, getDefaultCssPropertyValue, lerp, parseCssProperty } from '../../core'
import { TimelineNode } from '../main'

/** offsetDistance（"100%" / "50%" / 数字）→ 0..1 比例（运动路径进度） */
function parseOffsetDistance(value: unknown): number {
  if (value == null)
    return 0
  const s = String(value).trim()
  const n = Number.parseFloat(s)
  // 数据约定按百分比（"100%" / 100 都按百分比处理）
  return Number.isNaN(n) ? 0 : n / 100
}

/** 解析 offset-rotate：auto=沿切线、reverse=切线+180、auto<deg>=切线+偏移、<deg>=固定角。返回角度(deg) */
function resolveOffsetRotate(value: unknown, angleRad: number): number {
  const tangentDeg = (angleRad * 180) / Math.PI
  if (value == null || value === 'auto')
    return tangentDeg
  const s = String(value).trim()
  if (s === 'reverse')
    return tangentDeg + 180
  if (s.startsWith('auto'))
    return tangentDeg + (Number.parseFloat(s.slice(4)) || 0)
  const n = Number.parseFloat(s)
  return Number.isNaN(n) ? tangentDeg : n
}

/** 从 offsetPath（`path("M ...")` 或裸 d 字符串）取出 svg path data */
function parseOffsetPathData(value: string): string {
  let s = value.trim()
  const m = /^path\((.*)\)$/s.exec(s)
  if (m)
    s = m[1].trim()
  if (s.length >= 2 && (s[0] === '"' || s[0] === '\'') && s[s.length - 1] === s[0])
    s = s.slice(1, -1)
  return s.trim()
}

export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (amount: number) => number {
  const ZERO_LIMIT = 1e-6
  // Calculate the polynomial coefficients,
  // implicit first and last control points are (0,0) and (1,1).
  const ax = 3 * x1 - 3 * x2 + 1
  const bx = 3 * x2 - 6 * x1
  const cx = 3 * x1

  const ay = 3 * y1 - 3 * y2 + 1
  const by = 3 * y2 - 6 * y1
  const cy = 3 * y1

  // `ax t^3 + bx t^2 + cx t` expanded using Horner's rule
  const sampleCurveDerivativeX = (t: number): number => (3 * ax * t + 2 * bx) * t + cx
  const sampleCurveX = (t: number): number => ((ax * t + bx) * t + cx) * t
  const sampleCurveY = (t: number): number => ((ay * t + by) * t + cy) * t
  // Given an x value, find a parametric value it came from.
  function solveCurveX(x: number): number {
    let t2 = x
    let derivative
    let x2

    // https://trac.webkit.org/browser/trunk/Source/WebCore/platform/animation
    // first try a few iterations of Newton's method -- normally very fast.
    // http://en.wikipedia.org/wikiNewton's_method
    for (let i = 0; i < 8; i++) {
      // f(t) - x = 0
      x2 = sampleCurveX(t2) - x
      if (Math.abs(x2) < ZERO_LIMIT) {
        return t2
      }
      derivative = sampleCurveDerivativeX(t2)
      // == 0, failure
      /* istanbul ignore if */
      if (Math.abs(derivative) < ZERO_LIMIT) {
        break
      }
      t2 -= x2 / derivative
    }

    // Fall back to the bisection method for reliability.
    // bisection
    // http://en.wikipedia.org/wiki/Bisection_method
    let t1 = 1
    /* istanbul ignore next */
    let t0 = 0

    /* istanbul ignore next */
    t2 = x
    /* istanbul ignore next */
    while (t1 > t0) {
      x2 = sampleCurveX(t2) - x
      if (Math.abs(x2) < ZERO_LIMIT) {
        return t2
      }
      if (x2 > 0) {
        t1 = t2
      }
      else {
        t0 = t2
      }
      t2 = (t1 + t0) / 2
    }

    // Failure
    return t2
  }

  return (amount: number) => sampleCurveY(solveCurveX(amount))
}

/** CSS 缓动预设：name → cubic-bezier 控制点 [x1, y1, x2, y2] */
export const cssEasingPresets = {
  'linear': [0, 0, 1, 1],
  'ease': [0.25, 0.1, 0.25, 1],
  'ease-in': [0.42, 0, 1, 1],
  'ease-out': [0, 0, 0.58, 1],
  'ease-in-out': [0.42, 0, 0.58, 1],
  'ease-in-quad': [0.55, 0.085, 0.68, 0.53],
  'ease-out-quad': [0.25, 0.46, 0.45, 0.94],
  'ease-in-out-quad': [0.455, 0.03, 0.515, 0.955],
  'ease-in-cubic': [0.55, 0.055, 0.675, 0.19],
  'ease-out-cubic': [0.215, 0.61, 0.355, 1],
  'ease-in-out-cubic': [0.645, 0.045, 0.355, 1],
} as const
export type CssEasing = keyof typeof cssEasingPresets

/** 预先把 CSS 预设编译成缓动函数，避免每次解析关键帧都重建 cubic-bezier */
const cssEasingFunctions: Record<string, (amount: number) => number> = Object.fromEntries(
  Object.entries(cssEasingPresets).map(([name, [x1, y1, x2, y2]]) => [name, cubicBezier(x1, y1, x2, y2)]),
)

export type Easing = CssEasing | `cubic-bezier(${string})`

export interface Keyframe {
  easing?: Easing
  offset?: number
  [property: string]: string | number | null | undefined
}

export interface NormalizedKeyframe {
  easing: (amount: number) => number
  offset: number
  props: Record<string, any>
}

export type AnimationEffectMode = 'parent' | 'sibling'

export interface AnimationProperties extends Omit<TimelineNodeProperties, 'renderMode' | 'processMode'> {
  effectMode: AnimationEffectMode
  loop: boolean
  keyframes: Keyframe[]
}

@customNode<TimelineNodeProperties>('Animation', {
  renderMode: 'disabled',
  processSortMode: 'parent-before',
  duration: 2000,
})
export class Animation extends TimelineNode {
  @property({ fallback: 'parent' }) declare effectMode: AnimationEffectMode
  @property({ default: () => [] }) declare keyframes: Keyframe[]
  @property() declare easing: Easing | undefined

  protected _keyframes: NormalizedKeyframe[] = []
  protected _isFirstUpdatePosition = false
  protected _cachedProps = new RawWeakMap<any, Map<string, any>>()
  protected _stoped = false
  // 运动路径测量缓存（按 svg path data 字符串复用：构造 Path2D + 量取起点开销大）
  protected _pathMeasures = new Map<string, { measure: PathMeasure, startX: number, startY: number }>()

  constructor(properties?: Partial<AnimationProperties>, children: Node[] = []) {
    super()

    this
      .setProperties(properties)
      .append(children)
  }

  protected override _parented(parent: Node): void {
    super._parented(parent)
    this._updateCachedProps()
  }

  protected override _unparented(oldParent: Node): void {
    super._unparented(oldParent)
    this.cancel()
  }

  protected _process(delta: number): void {
    super._process(delta)
    this.commitStyles()
  }

  protected override _updateProperty(key: string, value: any, oldValue: any): void {
    super._updateProperty(key, value, oldValue)

    switch (key) {
      case 'effectMode':
      case 'keyframes':
        this._updateKeyframes()
        break
    }
  }

  protected _getTargets(): Element2D[] {
    let targets
    switch (this.effectMode) {
      case 'sibling':
        targets = this.getParent()?.getChildren(true) ?? []
        break
      case 'parent':
      default:
        targets = [this.getParent()].filter(Boolean)
        break
    }
    return targets.filter(val => val instanceof Element2D)
  }

  protected _updateKeyframes(): void {
    this._pathMeasures.clear() // 关键帧变了，运动路径缓存失效
    const keyframes: NormalizedKeyframe[] = []
    const items = this.keyframes
    for (let len = items.length, i = 0; i < len; i++) {
      const {
        offset = i === 0 ? 0 : i / (len - 1),
        easing = 'linear',
        ...props
      } = items[i]
      keyframes.push({
        offset,
        easing: this._parseEasing(easing),
        props,
      })
    }
    const first = keyframes[0]
    const last = keyframes[keyframes.length - 1]
    if (first && first.offset !== 0) {
      keyframes.unshift({
        offset: 0,
        easing: this._parseEasing('linear'),
        props: {},
      })
    }
    if (last && last.offset !== 1) {
      keyframes.push({
        offset: 1,
        easing: this._parseEasing('linear'),
        props: {},
      })
    }
    this._keyframes = keyframes
    this._updateCachedProps()
  }

  commitStyles(): void {
    if (!this.keyframes.length)
      return

    this._updateCurrentTime()

    if (!this.isInsideTimeRange()) {
      if (!this._isFirstUpdatePosition)
        return
      this._isFirstUpdatePosition = false
    }
    else if (!this._isFirstUpdatePosition) {
      this._isFirstUpdatePosition = true
      this._updateCachedProps()
    }

    const targets = this._getTargets()
    const offset = 1 / targets.length
    const progress = this.currentTimeProgress

    targets.forEach((target, i) => {
      const tiem = offset === 1
        ? progress
        : clamp(Math.max(0, progress - offset * i) / offset, 0, 1)

      const startProps = this._cachedProps.get(target)
      if (!startProps)
        return

      const keyframes = this._parseKeyframes(tiem, startProps)
      if (!keyframes?.length)
        return

      this._commitStyle(tiem, target, startProps, keyframes[0], keyframes[1])
    })
  }

  protected _updateCachedProps(): void {
    this.cancel()
    // 运动路径动画用 transform 实现位移：缓存原始 transform，使其随其它属性一起被还原（cancel）
    const hasOffsetPath = this._keyframes.some(k => 'offsetPath' in k.props)
    this._getTargets().forEach((target) => {
      const startProps = new Map<string, any>()
      const keyframes = this._keyframes
      for (let len = keyframes.length, i = 0; i < len; i++) {
        Object.keys(keyframes[i].props).forEach((name) => {
          startProps.set(name, (target.style as any)[name])
        })
      }
      if (hasOffsetPath)
        startProps.set('transform', (target.style as any).transform)
      this._cachedProps.set(target, startProps)
    })
  }

  protected _parseEasing(easing: Easing | undefined): (amount: number) => number {
    if (!easing)
      return cssEasingFunctions.linear
    // 仅支持 CSS 预设名 与 cubic-bezier(...)
    if (easing in cssEasingFunctions)
      return cssEasingFunctions[easing]
    const matched = /cubic-bezier\((.+)\)/.exec(easing)
    if (matched) {
      const args = matched[1].split(',').map(v => Number(v))
      if (args.length === 4 && args.every(n => !Number.isNaN(n)))
        return cubicBezier(args[0], args[1], args[2], args[3])
    }
    // 未知 / 非法 easing 兜底为 linear，避免产出 NaN 让整个动画静默失效
    return cssEasingFunctions.linear
  }

  protected _parseKeyframes(currentTime: number, startProps: Map<string, any>): [NormalizedKeyframe, NormalizedKeyframe] | null {
    let previous: NormalizedKeyframe | undefined
    const keyframes = this._keyframes
    for (let len = keyframes.length, i = 0; i < len; i++) {
      const current = keyframes[i]
      const {
        offset: currentOffset,
        easing: currentEasing,
      } = current
      const currentProps = { ...current.props }
      if (previous && currentTime <= currentOffset) {
        const {
          offset: previousOffset,
          easing: previousEasing,
        } = previous
        const previousProps = { ...previous.props }
        startProps.forEach((value, key) => {
          if (!(key in previousProps) || previousProps[key] === null)
            previousProps[key] = value
          if (!(key in currentProps) || currentProps[key] === null)
            currentProps[key] = value
        })
        return [
          { offset: previousOffset, easing: previousEasing, props: previousProps },
          { offset: currentOffset, easing: currentEasing, props: currentProps },
        ]
      }
      previous = current
    }
    return null
  }

  protected _commitStyle(
    currentTime: number,
    target: Element2D,
    startProps: Map<string, any>,
    previous: NormalizedKeyframe,
    current: NormalizedKeyframe,
  ): void {
    const { offset: previousOffset, easing, props: previousProps } = previous
    const { offset, props: currentProps } = current

    const total = offset - previousOffset
    const weight = easing((currentTime - previousOffset) / total)
    const context = {
      width: target.size.x,
      height: target.size.y,
      fontSize: target.style.fontSize,
    }

    // 运动路径：offsetPath/offsetDistance/offsetRotate 不是真实 style，按路径采样合成 transform 位移(+旋转)
    const offsetPath = currentProps.offsetPath ?? previousProps.offsetPath
    const hasOffsetPath = offsetPath != null
    if (hasOffsetPath) {
      this._commitOffsetPath(target, String(offsetPath), startProps, previousProps, currentProps, weight)
    }

    startProps.forEach((_, name) => {
      // offset-* 由 _commitOffsetPath 处理；transform 在路径动画里由其独占，避免被插值清掉
      if (name === 'offsetPath' || name === 'offsetDistance' || name === 'offsetRotate')
        return
      if (hasOffsetPath && name === 'transform')
        return
      target.onUpdateStyleProperty(
        name,
        this._getDiffValue(
          name,
          previousProps[name],
          currentProps[name],
          weight,
          context,
        ),
        undefined,
      )
    })
  }

  /** 按运动路径采样：在 offsetPath 上取 offsetDistance 处的点，合成为 transform 的位移(+offsetRotate 旋转) */
  protected _commitOffsetPath(
    target: Element2D,
    offsetPath: string,
    startProps: Map<string, any>,
    previousProps: Record<string, any>,
    currentProps: Record<string, any>,
    weight: number,
  ): void {
    const d = parseOffsetPathData(offsetPath)
    if (!d)
      return
    let cached = this._pathMeasures.get(d)
    if (!cached) {
      const measure = new PathMeasure(new Path2D(d) as any)
      const start = measure.getPosTanAtProgress(0).position
      cached = { measure, startX: start.x, startY: start.y }
      this._pathMeasures.set(d, cached)
    }
    const from = parseOffsetDistance(previousProps.offsetDistance ?? currentProps.offsetDistance)
    const to = parseOffsetDistance(currentProps.offsetDistance ?? previousProps.offsetDistance)
    const t = clamp(lerp(from, to, weight), 0, 1)
    const { position, angle } = cached.measure.getPosTanAtProgress(t)
    // path data 以元素中心为起点（M w/2 h/2），故位移 = 当前点 - 起点
    const dx = position.x - cached.startX
    const dy = position.y - cached.startY
    const rotate = resolveOffsetRotate(currentProps.offsetRotate ?? previousProps.offsetRotate, angle)
    const base = startProps.get('transform')
    target.onUpdateStyleProperty(
      'transform',
      `${base ? `${base} ` : ''}translate(${dx}px, ${dy}px) rotate(${rotate}deg)`,
      undefined,
    )
  }

  protected _getDiffValue(
    name: string,
    previous: string | undefined,
    current: string | undefined,
    weight: number,
    context: Record<string, any>,
  ): any {
    let from: CssFunctionArg | CssFunction[]
    let to: CssFunctionArg | CssFunction[]

    if (previous === 'none')
      previous = undefined

    if (current === 'none')
      current = undefined

    if (previous === undefined || current === undefined) {
      if (previous !== undefined) {
        from = parseCssProperty(name, String(previous), context)
        to = getDefaultCssPropertyValue(from)
      }
      else if (current !== undefined) {
        to = parseCssProperty(name, String(current), context)
        from = getDefaultCssPropertyValue(to)
      }
      else {
        return undefined
      }
    }
    else {
      from = parseCssProperty(name, String(previous), context)
      to = parseCssProperty(name, String(current), context)
    }
    if (Array.isArray(from) && Array.isArray(to)) {
      const names = new Set<string>()
      const _from: Record<string, CssFunctionArg[]> = {}
      const _to: Record<string, CssFunctionArg[]> = {}
      from.forEach(({ name, args }) => {
        _from[name] = args
        names.add(name)
      })
      to.forEach(({ name, args }) => {
        _to[name] = args
        names.add(name)
      })
      let value = ''
      names.forEach((name) => {
        const length = Math.max(_from[name]?.length ?? 0, _to[name]?.length ?? 0)
        const fromArgs = _from[name]
        const toArgs = _to[name]
        value += `${name}(${
          Array.from({ length }, (_, i) => {
            const fromArg = fromArgs?.[i]
            const toArg = toArgs?.[i]
            const from = fromArg?.normalizedIntValue ?? 0
            const to = toArg?.normalizedIntValue ?? 0
            return Number.isNaN(from) || Number.isNaN(to)
              ? (toArg?.value ?? 0)
              : lerp(from, to, weight)
          })
            .join(', ')
        }) `
      })
      return value
    }
    else if (!Array.isArray(from) && !Array.isArray(to)) {
      return Number.isNaN(from.normalizedIntValue) || Number.isNaN(to.normalizedIntValue)
        ? to.value
        : lerp(from.normalizedIntValue, to.normalizedIntValue, weight)
    }
  }

  isPlaying(): boolean {
    return !this.paused && this.isInsideTimeRange()
  }

  play(): boolean {
    const timeline = this._timeline
    if (!timeline) {
      return false
    }
    if (this._stoped) {
      this._stoped = false
      timeline.currentTime = this.globalStartTime
    }
    else {
      timeline.currentTime = this.globalStartTime + this.currentTime
    }
    this.paused = false
    return true
  }

  pause(): boolean {
    this.paused = true
    return true
  }

  stop(): boolean {
    this._stoped = true
    this.paused = true
    this._currentTime = 0
    return true
  }

  cancel(): void {
    this._getTargets().forEach((target) => {
      this._cachedProps.get(target)?.forEach((value, key) => {
        target.onUpdateStyleProperty(key, value, undefined)
      })
      this._cachedProps.delete(target)
    })
  }
}
