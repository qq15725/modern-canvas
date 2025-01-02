import { _Object, property } from '../../core'
import * as modules from './modules'

export type Overflow = 'hidden' | 'visible'

export interface Style2DOptions {
  // shadow
  shadowColor?: string
  shadowOffsetX?: number
  shadowOffsetY?: number
  shadowBlur?: number
  //
  opacity?: number
  borderRadius?: number
  overflow?: Overflow
}

export class Style2D extends _Object {
  // shadow
  @property({ default: '#000000' }) declare shadowColor: string
  @property({ default: 0 }) declare shadowOffsetX: number
  @property({ default: 0 }) declare shadowOffsetY: number
  @property({ default: 0 }) declare shadowBlur: number
  //
  @property({ default: 1 }) declare opacity: number
  @property({ default: 0 }) declare borderRadius: number
  @property({ default: 'visible' }) declare overflow: Overflow

  constructor(options?: Style2DOptions) {
    super()
    this.setProperties(options)
  }

  protected override _onUpdateProperty(key: PropertyKey, value: any, oldValue: any): void {
    super._onUpdateProperty(key, value, oldValue)

    switch (key) {
      case 'fontSize':
        if (value <= 0)
          this.fontSize = 14
        break
      case 'fontWeight':
        if (!value)
          this.fontWeight = 'normal'
        break
      case 'lineHeight':
        if (!value)
          this.lineHeight = 1
        break
    }
  }
}

Object.values(modules).forEach((Module) => {
  new Module().install(Style2D)
})
