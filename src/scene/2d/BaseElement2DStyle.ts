import type { NormalizedElementStyle, NormalizedStyle } from 'modern-idoc'
import { defineProperty, getDefaultStyle } from 'modern-idoc'
import { Resource } from '../../core'

export interface BaseElement2DStyleProperties extends Omit<NormalizedStyle, 'left' | 'top' | 'width' | 'height'> {
  left: number
  top: number
  width: number
  height: number
}

export interface BaseElement2DStyle extends BaseElement2DStyleProperties {
  //
}

export class BaseElement2DStyle extends Resource {
  constructor(properties?: Partial<BaseElement2DStyleProperties>) {
    super()
    this.setProperties(properties)
  }
}
const defaultStyles: NormalizedElementStyle = getDefaultStyle()
for (const key in defaultStyles) {
  const fallback = defaultStyles[key as keyof typeof defaultStyles]
  defineProperty(BaseElement2DStyle, key, {
    fallback,
  })
}
