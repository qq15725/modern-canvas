import type { BaseElement2DStyleProperties } from './BaseElement2DStyle'
import { BaseElement2DStyle } from './BaseElement2DStyle'

export interface FlexElement2DStyleProperties extends
  BaseElement2DStyleProperties {
  //
}

export interface FlexElement2DStyle extends FlexElement2DStyleProperties {
  //
}

export class FlexElement2DStyle extends BaseElement2DStyle {
  constructor(properties?: Partial<FlexElement2DStyleProperties>) {
    super()
    this.setProperties(properties)
  }
}
