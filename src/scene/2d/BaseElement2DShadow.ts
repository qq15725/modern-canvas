import type { NormalizedShadow, PropertyDeclaration, Shadow } from 'modern-idoc'
import type { BaseElement2D } from './BaseElement2D'
import { isNone, normalizeShadow, property } from 'modern-idoc'
import { CoreObject } from '../../core'
import { DropShadowEffect } from '../effects'

export class BaseElement2DShadow extends CoreObject {
  @property({ fallback: true }) declare enabled: boolean
  @property({ fallback: '#000000FF' }) declare color: NormalizedShadow['color']
  @property({ fallback: 0 }) declare blur: NormalizedShadow['blur']
  @property({ fallback: 0 }) declare offsetY: NormalizedShadow['offsetX']
  @property({ fallback: 0 }) declare offsetX: NormalizedShadow['offsetY']

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

  protected _updateProperty(key: string, value: any, oldValue: any, declaration?: PropertyDeclaration): void {
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
