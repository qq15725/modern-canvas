import type { MeasureResult, TextOptions } from 'modern-text'
import type { PropertyDeclaration } from '../../core'
import type { BaseElement2D } from './BaseElement2D'
import { Text } from 'modern-text'
import { CoreObject, property, protectedProperty, Transform2D } from '../../core'
import { CanvasTexture } from '../resources'

export type BaseElement2DTextProperties = TextOptions

export class BaseElement2DText extends CoreObject {
  @property({ default: '' }) declare content: TextOptions['content']
  @property() effects?: TextOptions['effects']
  @protectedProperty() measureDom?: TextOptions['measureDom']
  @protectedProperty() fonts?: TextOptions['fonts']

  constructor(
    public parent: BaseElement2D,
    properties?: Partial<BaseElement2DTextProperties>,
  ) {
    super()

    this.setProperties(properties)
  }

  texture = new CanvasTexture()
  text = new Text()
  measureResult?: MeasureResult

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
    this.text.style = this.parent.style.toJSON() as any
    this.text.content = this.content ?? ''
    this.text.effects = this.effects
    this.text.fonts = this.fonts
    this.text.measureDom = this.measureDom
    this.text.requestUpdate()
  }

  measure(): MeasureResult {
    this._updateText()
    return this.text.measure()
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
    this.text.render({
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
