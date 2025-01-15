import type { IDOCTextStyleDeclaration, IDOCTransformStyleDeclaration, Overflow, Visibility } from 'modern-idoc'
import type { ColorValue } from '../../../core'
import type { Texture2D } from '../textures'
import { getDefaultTextStyle, getDefaultTransformStyle } from 'modern-idoc'
import { assets } from '../../../asset'
import {
  clamp,
  Color,
  ColorMatrix,
  defineProperty,
  DEG_TO_RAD,
  parseCssFunctions,
  PI_2,
  property,
  Resource,
  Transform2D,
} from '../../../core'

export type CanvasItemStyleFilterKey =
  | 'hue-rotate'
  | 'saturate'
  | 'brightness'
  | 'contrast'
  | 'invert'
  | 'sepia'
  | 'opacity'
  | 'grayscale'

export type CanvasItemStyleFilter = Record<CanvasItemStyleFilterKey, number>

export interface CanvasItemStyleProperties extends IDOCTextStyleDeclaration, IDOCTransformStyleDeclaration {
  direction: 'inherit' | 'ltr' | 'rtl'
  backgroundColor?: ColorValue
  backgroundImage?: string
  filter: string
  shadowColor: ColorValue
  shadowOffsetX: number
  shadowOffsetY: number
  shadowBlur: number
  opacity: number
  borderWidth: number
  borderRadius: number
  borderColor: ColorValue
  borderStyle: string
  outlineWidth: number
  outlineOffset: number
  outlineColor: ColorValue
  outlineStyle: string
  visibility: Visibility
  overflow: Overflow
  pointerEvents: PointerEvents
}

export interface CanvasItemStyle extends CanvasItemStyleProperties {
  //
}

const style2DFilterDefault: CanvasItemStyleFilter = {
  'brightness': 1,
  'contrast': 1,
  'grayscale': 0,
  'hue-rotate': 0,
  'invert': 0,
  'opacity': 1,
  'saturate': 1,
  'sepia': 0,
}

export type PointerEvents = 'auto' | 'none'

export class CanvasItemStyle extends Resource {
  @property() declare backgroundColor?: string
  @property() declare backgroundImage?: string
  @property({ default: '' }) declare filter: string
  @property({ default: 'inherit' }) declare direction: 'inherit' | 'ltr' | 'rtl'
  @property({ default: '#000000' }) declare shadowColor: string
  @property({ default: 0 }) declare shadowOffsetX: number
  @property({ default: 0 }) declare shadowOffsetY: number
  @property({ default: 0 }) declare shadowBlur: number
  @property({ default: 1 }) declare opacity: number
  @property({ default: 0 }) declare borderWidth: number
  @property({ default: 0 }) declare borderRadius: number
  @property({ default: '#000000' }) declare borderColor: string
  @property({ default: 'none' }) declare borderStyle: string
  @property({ default: 0 }) declare outlineWidth: number
  @property({ default: 0 }) declare outlineOffset: number
  @property({ default: '#000000' }) declare outlineColor: string
  @property({ default: 'none' }) declare outlineStyle: string
  @property({ default: 'visible' }) declare visibility: Visibility
  @property({ default: 'visible' }) declare overflow: Overflow
  @property({ default: 'auto' }) declare pointerEvents: PointerEvents

  protected _backgroundColor = new Color()

  constructor(properties?: Partial<CanvasItemStyleProperties>) {
    super()
    this.setProperties(properties)
  }

  protected override _onUpdateProperty(key: PropertyKey, value: any, oldValue: any): void {
    super._onUpdateProperty(key, value, oldValue)

    switch (key) {
      case 'backgroundColor':
        this._backgroundColor.value = this.backgroundColor
        break
    }
  }

  canPointeEvents(): boolean {
    return this.pointerEvents !== 'none'
  }

  getComputedOpacity(): number {
    return clamp(0, this.opacity, 1)
  }

  getComputedBackgroundColor(): Color {
    return this._backgroundColor
  }

  async getComputedBackgroundImage(): Promise<Texture2D<ImageBitmap> | undefined> {
    if (this.backgroundImage) {
      return await assets.texture.load(this.backgroundImage)
    }
  }

  getComputedTransform(): Transform2D {
    const {
      scaleX, scaleY,
      left, top,
      width, height,
      rotate,
    } = this

    const transform = new Transform2D()
    const transform3d = new Transform2D(false)
    const transform2d = new Transform2D(false)
      .scale(scaleX, scaleY)
      .translate(left, top)
      .rotate(rotate * DEG_TO_RAD)

    let _transform = this.transform
    if (!_transform || _transform === 'none') {
      _transform = ''
    }

    parseCssFunctions(_transform, { width, height })
      .forEach(({ name, args }) => {
        const values = args.map(arg => arg.normalizedIntValue)
        transform.identity()
        switch (name) {
          case 'translate':
            transform.translate((values[0]) * width, (values[1] ?? values[0]) * this.height)
            break
          case 'translateX':
            transform.translateX(values[0] * width)
            break
          case 'translateY':
            transform.translateY(values[0] * height)
            break
          case 'translateZ':
            transform.translateZ(values[0])
            break
          case 'translate3d':
            transform.translate3d(
              values[0] * width,
              (values[1] ?? values[0]) * height,
              values[2] ?? values[1] ?? values[0],
            )
            break
          case 'scale':
            transform.scale(values[0], values[1] ?? values[0])
            break
          case 'scaleX':
            transform.scaleX(values[0])
            break
          case 'scaleY':
            transform.scaleY(values[0])
            break
          case 'scale3d':
            transform.scale3d(values[0], values[1] ?? values[0], values[2] ?? values[1] ?? values[0])
            break
          case 'rotate':
            transform.rotate(values[0] * PI_2)
            break
          case 'rotateX':
            transform.rotateX(values[0] * PI_2)
            break
          case 'rotateY':
            transform.rotateY(values[0] * PI_2)
            break
          case 'rotateZ':
            transform.rotateZ(values[0] * PI_2)
            break
          case 'rotate3d':
            transform.rotate3d(
              values[0] * PI_2,
              (values[1] ?? values[0]) * PI_2,
              (values[2] ?? values[1] ?? values[0]) * PI_2,
              (values[3] ?? values[2] ?? values[1] ?? values[0]) * PI_2,
            )
            break
          case 'skew':
            transform.skew(values[0], values[0] ?? values[1])
            break
          case 'skewX':
            transform.skewX(values[0])
            break
          case 'skewY':
            transform.skewY(values[0])
            break
          case 'matrix':
            transform.set(values)
            break
        }
        transform3d.multiply(transform)
      })

    transform2d.update()
    transform3d.update()

    const t2d = transform2d.toArray()
    const t3d = transform3d.toArray()
    const t3dT2d = [
      (t3d[0] * t2d[0]) + (t3d[3] * t2d[1]),
      (t3d[1] * t2d[0]) + (t3d[4] * t2d[1]),
      (t3d[2] * t2d[0]) + (t3d[5] * t2d[1]) + t2d[2],
      (t3d[0] * t2d[3]) + (t3d[3] * t2d[4]),
      (t3d[1] * t2d[3]) + (t3d[4] * t2d[4]),
      (t3d[2] * t2d[3]) + (t3d[5] * t2d[4]) + t2d[5],
      0, 0, 1,
    ]
    const [originX, originY] = this.getComputedTransformOrigin()
    const offsetX = originX * width
    const offsetY = originY * height
    t3dT2d[2] += (t3dT2d[0] * -offsetX) + (t3dT2d[1] * -offsetY) + offsetX
    t3dT2d[5] += (t3dT2d[3] * -offsetX) + (t3dT2d[4] * -offsetY) + offsetY
    return new Transform2D().set(t3dT2d)
  }

  getComputedTransformOrigin(): number[] {
    const [originX, originY = originX] = this.transformOrigin.split(' ')
    return [originX, originY].map((val) => {
      val = val.trim()
      switch (val) {
        case 'left':
        case 'top':
          return 0
        case 'center':
          return 0.5
        case 'right':
        case 'bottom':
          return 1
        default:
          return Number(val)
      }
    })
  }

  getComputedFilter(): CanvasItemStyleFilter {
    const filter = parseCssFunctions(this.filter).reduce((filter, { name, args }) => {
      (filter as any)[name] = args[0].normalizedIntValue
      return filter
    }, {} as CanvasItemStyleFilter)

    Object.keys(style2DFilterDefault).forEach((name) => {
      (filter as any)[name] = (filter as any)[name] ?? (style2DFilterDefault as any)[name]
    })

    return filter
  }

  getComputedFilterColorMatrix(): ColorMatrix {
    const m = new ColorMatrix()
    const filter = this.getComputedFilter()
    for (const name in filter) {
      const value = (filter as any)[name]
      switch (name) {
        case 'hue-rotate':
          m.hueRotate(value * PI_2)
          break
        case 'saturate':
          m.saturate(value)
          break
        case 'brightness':
          m.brightness(value)
          break
        case 'contrast':
          m.contrast(value)
          break
        case 'invert':
          m.invert(value)
          break
        case 'sepia':
          m.sepia(value)
          break
        case 'opacity':
          m.opacity(value)
          break
        case 'grayscale':
          m.grayscale(value)
          break
      }
    }
    return m
  }
}

const transformStyle = getDefaultTransformStyle()
for (const key in transformStyle) {
  defineProperty(CanvasItemStyle, key, { default: (transformStyle as any)[key] })
}

const textStyle = getDefaultTextStyle()
for (const key in textStyle) {
  defineProperty(CanvasItemStyle, key, { default: (textStyle as any)[key] })
}
