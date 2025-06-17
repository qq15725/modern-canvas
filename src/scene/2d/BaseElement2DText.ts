import type { Text as TextProperties } from 'modern-idoc'
import type { PropertyDeclaration } from 'modern-idoc'
import type { MeasureResult } from 'modern-text'
import type { BaseElement2D } from './BaseElement2D'
import { isNone, normalizeText } from 'modern-idoc'
import { property } from 'modern-idoc'
import { Text } from 'modern-text'
import { CoreObject, protectedProperty, Transform2D } from '../../core'
import { CanvasTexture } from '../resources'

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
  texture = new CanvasTexture()
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
      && !/^\s*$/.test(this.base.toString())
      && this.texture?.valid,
    )
  }

  draw(): void {
    this.base.render({
      pixelRatio: this.texture.pixelRatio,
      view: this.texture.source,
    })
    this.texture.requestUpload()
    const textWidth = this.measureResult?.boundingBox.width
      ?? this.parent.size.width
    const textHeight = this.measureResult?.boundingBox.height
      ?? this.parent.size.height
    const ctx = this.parent.context
    ctx.fillStyle = this.texture
    ctx.uvTransform = new Transform2D().scale(1 / textWidth, 1 / textHeight)
    ctx.vertTransform = () => {
      const parent = this.parent
      const origin = parent.getTransformOrigin()
      return new Transform2D()
        .translate(-origin.x, -origin.y)
        .scale(
          parent.globalScale.x > 0 ? 1 : -1,
          parent.globalScale.y > 0 ? 1 : -1,
        )
        .translate(origin.x, origin.y)
    }
    ctx.fill()
  }
}
