import type { PropertyDeclaration } from 'modern-idoc'
import type { CssFunction, CssFunctionArg } from '../../core'
import type { Node, TimelineNodeProperties } from '../main'
import { property, RawWeakMap } from 'modern-idoc'
import { clamp, customNode, getDefaultCssPropertyValue, lerp, parseCssProperty } from '../../core'
import { CanvasItem, TimelineNode } from '../main'

export const linear = (amount: number): number => amount
export const ease = cubicBezier(0.25, 0.1, 0.25, 1)
export const easeIn = cubicBezier(0.42, 0, 1, 1)
export const easeOut = cubicBezier(0, 0, 0.58, 1)
export const easeInOut = cubicBezier(0.42, 0, 0.58, 1)
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
export const timingFunctions = {
  linear,
  ease,
  easeIn,
  easeOut,
  easeInOut,
}
export type TimingFunctions = typeof timingFunctions

export type Easing = keyof TimingFunctions | `cubic-bezier(${string})`

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
  processMode: 'pausable',
  processSortMode: 'parent_before',
  duration: 2000,
})
export class Animation extends TimelineNode {
  @property() declare effectMode: AnimationEffectMode = 'parent'
  @property() declare loop: boolean = false
  @property() declare keyframes: Keyframe[] = []
  @property() declare easing: Easing | undefined

  protected _keyframes: NormalizedKeyframe[] = []
  protected _isFirstUpdatePosition = false
  protected _cachedProps = new RawWeakMap<any, Map<string, any>>()
  protected _stoped = false

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

  protected _process(): void {
    if (this.canProcess()) {
      this.commitStyles()
    }
  }

  protected override _updateProperty(key: string, value: any, oldValue: any, declaration?: PropertyDeclaration): void {
    super._updateProperty(key, value, oldValue, declaration)

    switch (key) {
      case 'effectMode':
      case 'keyframes':
        this._updateKeyframes()
        break
    }
  }

  protected _getTargets(): any[] {
    let targets
    switch (this.effectMode) {
      case 'sibling':
        targets = this.getParent()?.children.internal.filter(val => val instanceof CanvasItem) ?? []
        break
      case 'parent':
      default:
        targets = [this.getParent()].filter(Boolean)
        break
    }
    return targets.map((target: any) => target.style)
  }

  protected _updateKeyframes(): void {
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
        : clamp(0, Math.max(0, progress - offset * i) / offset, 1)

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
    this._getTargets().forEach((target) => {
      const startProps = new Map<string, any>()
      const keyframes = this._keyframes
      for (let len = keyframes.length, i = 0; i < len; i++) {
        Object.keys(keyframes[i].props).forEach((name) => {
          startProps.set(name, (target as any)[name])
        })
      }
      this._cachedProps.set(target, startProps)
    })
  }

  protected _parseEasing(easing: Easing | undefined): (amount: number) => number {
    if (!easing)
      return timingFunctions.linear
    if (easing in timingFunctions)
      return (timingFunctions as any)[easing]
    const args = easing.replace(/cubic-bezier\((.+)\)/, '$1').split(',').map(v => Number(v))
    return cubicBezier(args[0], args[1], args[2], args[3])
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
    target: any,
    startProps: Map<string, any>,
    previous: NormalizedKeyframe,
    current: NormalizedKeyframe,
  ): void {
    const { offset: previousOffset, easing, props: previousProps } = previous
    const { offset, props: currentProps } = current

    const total = offset - previousOffset
    const weight = easing((currentTime - previousOffset) / total)
    const context = {
      width: target.width,
      height: target.height,
      fontSize: target.fontSize,
    }

    startProps.forEach((_, name) => {
      target[name] = this._getDiffValue(
        name,
        previousProps[name],
        currentProps[name],
        weight,
        context,
      )
    })
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
    if (this._stoped) {
      this._stoped = false
      this.startTime = this.timelineCurrentTime
    }
    else {
      this.startTime = this.timelineCurrentTime - this.currentTime
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
        (target as any)[key] = value
      })
      this._cachedProps.delete(target)
    })
  }
}
