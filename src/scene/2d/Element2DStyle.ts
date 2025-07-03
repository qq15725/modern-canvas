import type { BaseElement2DStyleProperties } from './BaseElement2DStyle'
import { defineProperty } from 'modern-idoc'
import { BaseElement2DStyle } from './BaseElement2DStyle'

export interface Element2DStyleProperties extends BaseElement2DStyleProperties {
  width: number
  height: number
  left: number
  top: number
}

export interface Element2DStyle extends Element2DStyleProperties {
  //
}

export class Element2DStyle extends BaseElement2DStyle {
  constructor(properties?: Partial<Element2DStyleProperties>) {
    super()
    this.setProperties(properties)
  }
}

const defaultStyles: Record<string, any> = {
  left: 0,
  top: 0,
  width: 0,
  height: 0,
}

for (const key in defaultStyles) {
  defineProperty(Element2DStyle.prototype, key, { fallback: defaultStyles[key] })
}
