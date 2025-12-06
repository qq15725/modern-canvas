import type { FullStyle } from 'modern-idoc'
import { defineProperty, getDefaultStyle } from 'modern-idoc'
import { Resource } from '../../../core'

export interface Element2DStyleProperties extends Omit<FullStyle, 'left' | 'top' | 'width' | 'height'> {
  left: number
  top: number
  width: number
  height: number
}

export interface Element2DStyle extends Element2DStyleProperties {
  //
}

export class Element2DStyle extends Resource {
  constructor(properties?: Partial<Element2DStyleProperties>) {
    super()
    this.setProperties(properties)
  }
}

const defaultStyles = {
  ...getDefaultStyle(),
  left: 0,
  top: 0,
  width: 0,
  height: 0,
}

for (const key in defaultStyles) {
  defineProperty(Element2DStyle, key, { fallback: (defaultStyles as any)[key] })
}
