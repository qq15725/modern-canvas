import type { NormalizedShadow, PropertyDeclaration, Shadow } from 'modern-idoc'
import type { BaseElement2D } from './BaseElement2D'
import { isNone, normalizeShadow } from 'modern-idoc'
import { property } from 'modern-idoc'
import { CoreObject } from '../../core'
import { DropShadowEffect } from '../effects'

export class BaseElement2DShadow extends CoreObject {
  @property({ default: '#000000' }) declare color: NormalizedShadow['color']
  @property({ default: 0 }) declare blur: NormalizedShadow['blur']
  @property({ default: 0 }) declare offsetY: NormalizedShadow['offsetX']
  @property({ default: 0 }) declare offsetX: NormalizedShadow['offsetY']

  constructor(
    public parent: BaseElement2D,
  ) {
    super()
  }

  override setProperties(properties?: Shadow): this {
    return super.setProperties(
      isNone(properties)
        ? undefined
        : normalizeShadow(properties),
    )
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
    let effect = this.parent.getNode<DropShadowEffect>(name)
    if (
      this.blur
      || this.offsetX
      || this.offsetY
    ) {
      if (!effect) {
        effect = new DropShadowEffect({ name })
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
