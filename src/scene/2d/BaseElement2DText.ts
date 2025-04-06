import type { TextProperty } from 'modern-idoc'
import type { MeasureResult, TextOptions } from 'modern-text'
import type { PropertyDeclaration } from '../../core'
import type { BaseElement2D } from './BaseElement2D'
import { normalizeText } from 'modern-idoc'
import { Text } from 'modern-text'
import { CoreObject, property, protectedProperty, Transform2D } from '../../core'
import { CanvasTexture } from '../resources'

export class BaseElement2DText extends CoreObject {
  @property({ default: '' }) declare content: TextOptions['content']
  @property() effects?: TextOptions['effects']
  @protectedProperty() measureDom?: TextOptions['measureDom']
  @protectedProperty() fonts?: TextOptions['fonts']

  constructor(
    public parent: BaseElement2D,
  ) {
    super()
  }

  texture = new CanvasTexture()
  baseText = new Text()
  measureResult?: MeasureResult

  override setProperties(properties?: TextProperty): this {
    return super.setProperties(normalizeText(properties))
  }

  protected override _updateProperty(key: PropertyKey, value: any, oldValue: any, declaration?: PropertyDeclaration): void {
    super._updateProperty(key, value, oldValue, declaration)

    switch (key) {
      case 'content':
      case 'effects':
      case 'measureDom':
      case 'fonts':
      case 'split':
        this.parent.requestRedraw()
        break
    }
  }

  protected _updateText(): void {
    this.baseText.style = {
      justifyContent: 'center',
      alignItems: 'center',
      textAlign: 'center',
      ...this.parent.style.toJSON() as any,
    }
    this.baseText.content = this.content ?? ''
    this.baseText.effects = this.effects
    this.baseText.fonts = this.fonts
    this.baseText.measureDom = this.measureDom
    this.baseText.requestUpdate()
  }

  measure(): MeasureResult {
    this._updateText()
    return this.baseText.measure()
  }

  updateMeasure(): this {
    this.measureResult = this.measure()
    const textWidth = this.measureResult.boundingBox.width
    const textHeight = this.measureResult.boundingBox.height
    const { left, top, width, height = textHeight } = this.parent.style
    this.parent.position.x = left + Math.min(0, ((width || textWidth) - textWidth) / 2)
    this.parent.position.y = top + Math.min(0, ((height || textHeight) - textHeight) / 2)
    this.parent.size.width = textWidth
    this.parent.size.height = textHeight
    return this
  }

  canDraw(): boolean {
    return Boolean(
      this.content && this.texture?.valid,
    )
  }

  draw(): void {
    const ctx = this.parent.context
    this.baseText.render({
      pixelRatio: this.texture.pixelRatio,
      view: this.texture.source,
    })
    this.texture.requestUpload()
    const { width, height } = this.parent.size
    ctx.fillStyle = this.texture
    ctx.textureTransform = new Transform2D().scale(1 / width, 1 / height)
    ctx.fill()
  }
}
