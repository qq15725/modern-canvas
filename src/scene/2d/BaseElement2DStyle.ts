import type { ElementStyleDeclaration, StyleDeclaration } from 'modern-idoc'
import { getDefaultStyle } from 'modern-idoc'
import {
  defineProperty,
  Resource,
} from '../../core'

export interface BaseElement2DStyleProperties extends Omit<StyleDeclaration, 'left' | 'top' | 'width' | 'height'> {
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

const defaultStyles: ElementStyleDeclaration = getDefaultStyle()

// @ts-expect-error del
delete defaultStyles.top
// @ts-expect-error del
delete defaultStyles.left
delete defaultStyles.width
delete defaultStyles.height

for (const key in defaultStyles) {
  defineProperty(BaseElement2DStyle, key, {
    default: defaultStyles[key as keyof typeof defaultStyles],
  })
}
