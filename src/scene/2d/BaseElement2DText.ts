import type { PropertyDeclaration, Text as TextProperties } from 'modern-idoc'
import type { MeasureResult } from 'modern-text'
import type { BaseElement2D } from './BaseElement2D'
import { isNone, normalizeText, property } from 'modern-idoc'
import { Text } from 'modern-text'
import { CoreObject, protectedProperty } from '../../core'

export class BaseElement2DText extends CoreObject {
  @property({ default: true }) declare enabled: boolean
  @property({ alias: 'base.content' }) declare content: Text['content']
  @property({ alias: 'base.effects' }) declare effects?: Text['effects']
  @protectedProperty({ alias: 'base.measureDOM' }) declare measureDOM?: Text['measureDOM']
  @protectedProperty({ alias: 'base.fonts' }) declare fonts?: Text['fonts']

  constructor(
    public parent: BaseElement2D,
  ) {
    super()
  }

  base = new Text()
  measureResult?: MeasureResult

  override setProperties(properties?: TextProperties): this {
    return super.setProperties(
      isNone(properties)
        ? undefined
        : normalizeText(properties),
    )
  }

  protected override _updateProperty(key: PropertyKey, value: any, oldValue: any, declaration?: PropertyDeclaration): void {
    super._updateProperty(key, value, oldValue, declaration)

    switch (key) {
      case 'content':
      case 'effects':
      case 'measureDOM':
      case 'fonts':
      case 'split':
      case 'enabled':
        this.parent.requestRedraw()
        break
    }
  }

  protected _updateText(): void {
    this.base.style = {
      justifyContent: 'center',
      alignItems: 'center',
      textAlign: 'center',
      ...this.parent.style.toJSON() as any,
    }
    this.base.requestUpdate()
  }

  measure(): MeasureResult {
    this._updateText()
    return this.base.measure()
  }

  updateMeasure(): this {
    this.measureResult = this.measure()
    return this
  }

  canDraw(): boolean {
    return Boolean(
      this.enabled
      && !/^\s*$/.test(this.base.toString()),
    )
  }

  draw(): void {
    const ctx = this.parent.context
    this.base.update()
    this.base.paragraphs.forEach((p) => {
      p.fragments.forEach((f) => {
        f.characters.forEach((c) => {
          ctx.fillStyle = c.computedStyle.color
          ctx.addPath(c.path)
          ctx.style.fillRule = 'evenodd'
          ctx.closePath()
          ctx.fill()
        })
      })
    })
  }
}
