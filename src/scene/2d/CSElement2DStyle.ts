import type { Element2DStyleProperties } from './Element2DStyle'
import { defineProperty } from '../../core'
import { Element2DStyle } from './Element2DStyle'

export interface CSElement2DStyleProperties extends Element2DStyleProperties {
  width: number
  height: number
  left: number
  top: number
}

export interface CSElement2DStyle extends CSElement2DStyleProperties {
  //
}

export class CSElement2DStyle extends Element2DStyle {
  constructor(properties?: Partial<CSElement2DStyleProperties>) {
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
  defineProperty(CSElement2DStyle, key, { default: defaultStyles[key] })
}
