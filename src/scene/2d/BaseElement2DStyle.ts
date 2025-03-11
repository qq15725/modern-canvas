import type { ElementStyleDeclaration, StyleDeclaration } from 'modern-idoc'
import type { ColorValue, PropertyDeclaration } from '../../core'
import type { Texture2D } from '../resources'
import { getDefaultStyle } from 'modern-idoc'
import { assets } from '../../asset'
import {
  Color,
  defineProperty,
  Resource,
} from '../../core'

export interface BaseElement2DStyleProperties extends Omit<StyleDeclaration, 'left' | 'top' | 'width' | 'height' | 'backgroundColor' | 'borderColor' | 'outlineColor'> {
  left: number
  top: number
  width: number
  height: number
  backgroundColor: 'none' | ColorValue
  borderColor: 'none' | ColorValue
  outlineColor: 'none' | ColorValue
}

export interface BaseElement2DStyle extends BaseElement2DStyleProperties {
  //
}

export class BaseElement2DStyle extends Resource {
  protected _backgroundColor = new Color()

  constructor(properties?: Partial<BaseElement2DStyleProperties>) {
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

  getComputedBackgroundColor(): Color {
    return this._backgroundColor
  }

  async loadBackgroundImage(): Promise<Texture2D<ImageBitmap> | undefined> {
    if (this.backgroundImage && this.backgroundImage !== 'none') {
      return await assets.texture.load(this.backgroundImage)
    }
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
