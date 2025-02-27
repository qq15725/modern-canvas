import type { ElementStyleDeclaration, TextStyleDeclaration } from 'modern-idoc'
import type { ColorValue, PropertyDeclaration } from '../../core'
import type { Texture2D } from '../resources'
import { getDefaultTextStyle, getDefaultTransformStyle } from 'modern-idoc'
import { assets } from '../../asset'
import {
  Color,
  defineProperty,
  Resource,
} from '../../core'

export interface BaseElement2DStyleProperties extends
  TextStyleDeclaration,
  Omit<ElementStyleDeclaration, 'left' | 'top' | 'width' | 'height' | 'backgroundColor' | 'borderColor'> {
  backgroundColor: 'none' | ColorValue
  maskImage: 'none' | string
  borderColor: 'none' | ColorValue
  outlineWidth: number
  outlineOffset: number
  outlineColor: 'none' | ColorValue
  outlineStyle: string
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
    if (this.backgroundImage !== 'none') {
      return await assets.texture.load(this.backgroundImage)
    }
  }
}

const defaultStyles: Record<string, any> = {
  ...getDefaultTransformStyle(),
  ...getDefaultTextStyle(),
  backgroundColor: 'none',
  backgroundImage: 'none',
  filter: 'none',
  boxShadow: 'none',
  maskImage: 'none',
  opacity: 1,
  borderWidth: 0,
  borderRadius: 0,
  borderColor: '#000000',
  borderStyle: 'none',
  outlineWidth: 0,
  outlineOffset: 0,
  outlineColor: '#000000',
  outlineStyle: 'none',
  visibility: 'visible',
  overflow: 'visible',
  pointerEvents: 'auto',
}

delete defaultStyles.top
delete defaultStyles.left
delete defaultStyles.width
delete defaultStyles.height

for (const key in defaultStyles) {
  defineProperty(BaseElement2DStyle, key, { default: defaultStyles[key] })
}
