import type { PropertyDeclaration } from '../../core'
import type { BaseElement2D } from './BaseElement2D'
import { CoreObject, property } from '../../core'
import { DropShadowEffect } from '../effects'

export class BaseElement2DShadow extends CoreObject {
  @property({ default: '#000000' }) declare color: string
  @property({ default: 0 }) declare blur: number
  @property({ default: 0 }) declare offsetY: number
  @property({ default: 0 }) declare offsetX: number

  constructor(
    public parent: BaseElement2D,
  ) {
    super()
  }

  protected _updateProperty(key: PropertyKey, value: any, oldValue: any, declaration?: PropertyDeclaration): void {
    super._updateProperty(key, value, oldValue, declaration)

    switch (key) {
      case 'color':
      case 'blur':
      case 'offsetX':
      case 'offsetY':
        this.updateEffect()
        break
    }
  }

  updateEffect(): void {
    const name = '__$shadow'
    let shadow = this.parent.getNode<DropShadowEffect>(name)
    if (
      this.blur
      || this.offsetX
      || this.offsetY
    ) {
      if (!shadow) {
        shadow = new DropShadowEffect({ name })
        this.parent.appendChild(shadow, 'back')
      }
      shadow.setProperties(this.getProperties())
    }
    else {
      if (shadow) {
        this.parent.removeChild(shadow)
      }
    }
  }
}
