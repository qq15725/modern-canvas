import type { PropertyDeclaration } from '../../core'
import type { BaseElement2D } from './BaseElement2D'
import { CoreObject, property } from '../../core'
import { OutlineEffect } from '../effects'

export class BaseElement2DOutline extends CoreObject {
  @property({ default: '#000000' }) declare color: string
  @property({ default: 0 }) declare width: number
  @property({ default: 'solid' }) declare style: 'dashed' | 'solid' | string
  @property() declare image?: string
  @property({ default: 1 }) declare opacity: number

  constructor(
    public parent: BaseElement2D,
  ) {
    super()
  }

  protected _updateProperty(key: PropertyKey, value: any, oldValue: any, declaration?: PropertyDeclaration): void {
    super._updateProperty(key, value, oldValue, declaration)

    switch (key) {
      case 'color':
      case 'width':
      case 'style':
      case 'image':
      case 'opacity':
        this.updateEffect()
        break
    }
  }

  updateEffect(): void {
    const name = '__$outline'
    let effect = this.parent.getNode<OutlineEffect>(name)
    if (this.width) {
      if (!effect) {
        effect = new OutlineEffect({ name })
        this.parent.appendChild(effect, 'back')
      }
      effect.setProperties(this.getProperties())
    }
    else {
      if (effect) {
        this.parent.removeChild(effect)
      }
    }
  }
}
