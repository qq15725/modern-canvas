import type { IDOCTextStyleDeclaration, IDOCTransformStyleDeclaration, Overflow, Visibility } from 'modern-idoc'
import type { ColorValue, PropertyDeclaration } from '../../core'
import type { Texture2D } from '../resources'
import { getDefaultTextStyle, getDefaultTransformStyle } from 'modern-idoc'
import { assets } from '../../asset'
import {
  clamp,
  Color,
  ColorMatrix,
  defineProperty,
  parseCssFunctions,
  PI_2,
  property,
  Resource,
} from '../../core'

type Align =
  | 'auto'
  | 'flex-start'
  | 'center'
  | 'flex-end'
  | 'stretch'
  | 'baseline'
  | 'space-between'
  | 'space-around'
  | 'space-evenly'

type FlexDirection =
  | 'column'
  | 'column-reverse'
  | 'row'
  | 'row-reverse'

type FlexWrap =
  | 'no-wrap'
  | 'wrap'
  | 'Wrap-reverse'

type Justify =
  | 'flex-start'
  | 'center'
  | 'flex-end'
  | 'space-between'
  | 'space-around'
  | 'space-evenly'

type Position =
  | 'static'
  | 'relative'
  | 'absolute'

type BoxSizing =
  | 'border-box'
  | 'content-box'

export interface IDOCLayoutStyleDeclaration {
  alignContent: Align
  alignItems: Align
  alignSelf: Align
  borderTop: string
  borderLeft: string
  borderRight: string
  borderBottom: string
  borderWidth: number
  border: string
  direction: 'inherit' | 'ltr' | 'rtl'
  display: 'none' | 'flex' | 'contents'
  flex: number
  flexBasis: number | 'auto' | `${number}%`
  flexDirection: FlexDirection
  flexGrow: number
  flexShrink: number
  flexWrap: FlexWrap
  height: number | 'auto' | `${number}%`
  justifyContent: Justify
  gap: number | `${number}%`
  marginTop: number | 'auto' | `${number}%`
  marginLeft: number | 'auto' | `${number}%`
  marginRight: number | 'auto' | `${number}%`
  marginBottom: number | 'auto' | `${number}%`
  margin: number | 'auto' | `${number}%`
  maxHeight: number | `${number}%`
  maxWidth: number | `${number}%`
  minHeight: number | `${number}%`
  minWidth: number | `${number}%`
  paddingTop: number | `${number}%`
  paddingLeft: number | `${number}%`
  paddingRight: number | `${number}%`
  paddingBottom: number | `${number}%`
  padding: number | `${number}%`
  top: number | `${number}%`
  bottom: number | `${number}%`
  left: number | `${number}%`
  right: number | `${number}%`
  position: Position
  boxSizing: BoxSizing
  width: number | 'auto' | `${number}%`
}

export type ElementStyleFilterKey =
  | 'hue-rotate'
  | 'saturate'
  | 'brightness'
  | 'contrast'
  | 'invert'
  | 'sepia'
  | 'opacity'
  | 'grayscale'

export type ElementStyleFilter = Record<ElementStyleFilterKey, number>

export interface ElementStyleProperties extends
  IDOCTextStyleDeclaration,
  Omit<IDOCTransformStyleDeclaration, 'left' | 'top' | 'width' | 'height'>,
  IDOCLayoutStyleDeclaration {
  backgroundColor?: 'none' | ColorValue
  backgroundImage?: string
  filter: string
  boxShadow: 'none' | string
  maskImage: 'none' | string
  opacity: number
  borderWidth: number
  borderRadius: number
  borderColor: 'none' | ColorValue
  borderStyle: string
  outlineWidth: number
  outlineOffset: number
  outlineColor: 'none' | ColorValue
  outlineStyle: string
  visibility: Visibility
  overflow: Overflow
  pointerEvents: PointerEvents
}

export interface ElementStyle extends ElementStyleProperties {
  //
}

type PointerEvents = 'auto' | 'none'

export class ElementStyle extends Resource {
  @property({ default: 'none' }) declare backgroundColor: 'none' | ColorValue
  @property({ default: 'none' }) declare backgroundImage: 'none' | string
  @property({ default: 'none' }) declare filter: 'none' | string
  // @property({ default: 'inherit' }) declare direction: 'inherit' | 'ltr' | 'rtl'
  @property({ default: 'none' }) declare boxShadow: 'none' | string
  @property({ default: 'none' }) declare maskImage: 'none' | string
  @property({ default: 1 }) declare opacity: number
  // @property({ default: 0 }) declare borderWidth: number
  @property({ default: 0 }) declare borderRadius: number
  @property({ default: '#000000' }) declare borderColor: 'none' | ColorValue
  @property({ default: 'none' }) declare borderStyle: 'none' | string
  @property({ default: 0 }) declare outlineWidth: number
  @property({ default: 0 }) declare outlineOffset: number
  @property({ default: '#000000' }) declare outlineColor: 'none' | ColorValue
  @property({ default: 'none' }) declare outlineStyle: 'none' | string
  @property({ default: 'visible' }) declare visibility: Visibility
  @property({ default: 'visible' }) declare overflow: Overflow
  @property({ default: 'auto' }) declare pointerEvents: PointerEvents

  @property() declare alignContent: Align
  @property() declare alignItems: Align
  @property() declare alignSelf: Align
  @property() declare borderTop: string
  @property() declare borderLeft: string
  @property() declare borderRight: string
  @property() declare borderBottom: string
  @property() declare borderWidth: number
  @property() declare border: string
  @property() declare direction: 'inherit' | 'ltr' | 'rtl'
  @property() declare display: 'none' | 'flex' | 'contents'
  @property() declare flex: number
  @property() declare flexBasis: number | 'auto' | `${number}%`
  @property() declare flexDirection: FlexDirection
  @property() declare flexGrow: number
  @property() declare flexShrink: number
  @property() declare flexWrap: FlexWrap
  @property() declare height: number | 'auto' | `${number}%`
  @property() declare justifyContent: Justify
  @property() declare gap: number | `${number}%`
  @property() declare marginTop: number | 'auto' | `${number}%`
  @property() declare marginLeft: number | 'auto' | `${number}%`
  @property() declare marginRight: number | 'auto' | `${number}%`
  @property() declare marginBottom: number | 'auto' | `${number}%`
  @property() declare margin: number | 'auto' | `${number}%`
  @property() declare maxHeight: number | `${number}%`
  @property() declare maxWidth: number | `${number}%`
  @property() declare minHeight: number | `${number}%`
  @property() declare minWidth: number | `${number}%`
  @property() declare paddingTop: number | `${number}%`
  @property() declare paddingLeft: number | `${number}%`
  @property() declare paddingRight: number | `${number}%`
  @property() declare paddingBottom: number | `${number}%`
  @property() declare padding: number | `${number}%`
  @property() declare top: number | `${number}%`
  @property() declare bottom: number | `${number}%`
  @property() declare left: number | `${number}%`
  @property() declare right: number | `${number}%`
  @property() declare position: Position
  @property() declare boxSizing: BoxSizing
  @property() declare width: number | 'auto' | `${number}%`

  protected _backgroundColor = new Color()

  constructor(properties?: Partial<ElementStyleProperties>) {
    super()
    this.setProperties(properties)
  }

  protected override _updateProperty(key: PropertyKey, value: any, oldValue: any, declaration?: PropertyDeclaration): void {
    super._updateProperty(key, value, oldValue, declaration)

    switch (key) {
      case 'backgroundColor':
        this._backgroundColor.value = this.backgroundColor === 'none'
          ? undefined
          : this.backgroundColor
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

  async loadBackgroundImage(): Promise<Texture2D<ImageBitmap> | undefined> {
    if (this.backgroundImage !== 'none') {
      return await assets.texture.load(this.backgroundImage)
    }
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

  protected _defaultFilter: ElementStyleFilter = {
    'brightness': 1,
    'contrast': 1,
    'grayscale': 0,
    'hue-rotate': 0,
    'invert': 0,
    'opacity': 1,
    'saturate': 1,
    'sepia': 0,
  }

  getComputedFilter(): ElementStyleFilter {
    let filter = {} as ElementStyleFilter

    if (this.filter === 'none') {
      return filter
    }

    filter = parseCssFunctions(this.filter)
      .reduce((filter, { name, args }) => {
        (filter as any)[name] = args[0].normalizedIntValue
        return filter
      }, filter)

    Object.keys(this._defaultFilter).forEach((name) => {
      (filter as any)[name] = (filter as any)[name] ?? (this._defaultFilter as any)[name]
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
  defineProperty(ElementStyle, key, { default: (transformStyle as any)[key] })
}

const textStyle = getDefaultTextStyle()
for (const key in textStyle) {
  defineProperty(ElementStyle, key, { default: (textStyle as any)[key] })
}
