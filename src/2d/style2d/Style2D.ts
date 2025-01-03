import type { Overflow } from 'modern-idoc'
import type {
  Style2DBackgroundExtend,
  Style2DBackgroundProperties,
  Style2DFilterExtend,
  Style2DFilterProperties,
  Style2DTextExtend,
  Style2DTextProperties,
  Style2DTransformExtend,
  Style2DTransformProperties,
} from './modules'
import { _Object, property } from '../../core'
import {
  Style2DBackgroundModule,
  Style2DFilterModule,
  Style2DTextModule,
  Style2DTransformModule,
} from './modules'

export interface Style2DOptions extends
  Partial<Style2DBackgroundProperties>,
  Partial<Style2DFilterProperties>,
  Partial<Style2DTextProperties>,
  Partial<Style2DTransformProperties> {
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

export interface Style2D extends
  Style2DBackgroundExtend,
  Style2DFilterExtend,
  Style2DTextExtend,
  Style2DTransformExtend {
  //
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

[
  Style2DBackgroundModule,
  Style2DFilterModule,
  Style2DTextModule,
  Style2DTransformModule,
].forEach((Module) => {
  new Module().install(Style2D)
})
