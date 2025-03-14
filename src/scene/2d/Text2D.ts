import type { MeasureResult, TextOptions } from 'modern-text'
import type { PropertyDeclaration } from '../../core'
import type { CanvasBatchable, Node } from '../main'
import type { TextureRect2DProperties } from './TextureRect2D'
import { Text, textDefaultStyle } from 'modern-text'
import { customNode, property, protectedProperty } from '../../core'
import { CanvasTexture } from '../resources'
import { TextureRect2D } from './TextureRect2D'

export interface Text2DProperties extends TextureRect2DProperties, Omit<TextOptions, 'style'> {
  split: boolean
}

const textStyles = new Set(Object.keys(textDefaultStyle))

/**
 * @example
 *
 * new Text2D({
 *   style: {
 *     fontSize: 20,
 *   },
 *   content: 'Text2D',
 * })
 */
@customNode('Text2D')
export class Text2D extends TextureRect2D<CanvasTexture> {
  @property({ default: false }) declare split: boolean
  @property({ default: '' }) declare content: TextOptions['content']
  @property() effects?: TextOptions['effects']
  @protectedProperty() measureDom?: TextOptions['measureDom']
  @protectedProperty() fonts?: TextOptions['fonts']

  override texture = new CanvasTexture()

  text = new Text()
  measureResult?: MeasureResult
  protected _subTextsCount = 0

  constructor(properties?: Partial<Text2DProperties>, children: Node[] = []) {
    super()
    this.setProperties(properties)
    this.append(children)
  }

  protected override _updateProperty(key: PropertyKey, value: any, oldValue: any, declaration?: PropertyDeclaration): void {
    super._updateProperty(key, value, oldValue, declaration)

    switch (key) {
      case 'content':
      case 'effects':
      case 'measureDom':
      case 'fonts':
      case 'split':
        this._updateSplit()
        this.requestRedraw()
        break
    }

    if (this._subTextsCount && key === 'effects') {
      this._getSubTexts().forEach((child) => {
        child.setProperties({ [key]: value })
      })
    }
  }

  protected _updateText(): void {
    this.text.style = this.style.toJSON() as any
    this.text.content = this.content ?? ''
    this.text.effects = this.effects
    this.text.fonts = this.fonts
    this.text.measureDom = this.measureDom
    this.text.requestUpdate()
  }

  protected override _updateStyleProperty(key: PropertyKey, value: any, oldValue: any): void {
    switch (key) {
      case 'left':
      case 'top':
      case 'width':
      case 'height':
        this.requestRedraw()
        break
      default:
        super._updateStyleProperty(key, value, oldValue)
        break
    }

    switch (key) {
      case 'width':
        if (this.split) {
          this._updateSubTexts()
        }
        break
    }

    if (typeof key === 'string' && textStyles.has(key)) {
      if (this._subTextsCount && key !== 'width' && key !== 'height') {
        this._getSubTexts().forEach((child) => {
          child.style.setProperties({ [key]: value })
        })
      }
      this.requestRedraw()
    }
  }

  protected _getSubTexts(): Text2D[] {
    return this.getChildren('front')
      .filter(node => node instanceof Text2D) as Text2D[]
  }

  protected _updateSubTexts(): void {
    const subTexts = this._getSubTexts()
    let i = 0
    if (this.split) {
      this.updateMeasure().measureResult?.paragraphs.forEach((p) => {
        p.fragments.forEach((f) => {
          f.characters.forEach((c) => {
            const child = subTexts[i]
            if (child) {
              child.style.left = c.inlineBox.left
              child.style.top = c.inlineBox.top
            }
            i++
          })
        })
      })
    }
  }

  measure(): MeasureResult {
    this._updateText()
    return this.text.measure()
  }

  updateMeasure(): this {
    this.measureResult = this.measure()
    const textWidth = this.measureResult.boundingBox.width
    const textHeight = this.measureResult.boundingBox.height
    const { left, top, width, height = textHeight } = this.style
    this.position.x = left + Math.min(0, ((width || textWidth) - textWidth) / 2)
    // this.position.x = left
    this.position.y = top + Math.min(0, ((height || textHeight) - textHeight) / 2)
    this.size.width = textWidth
    this.size.height = textHeight
    return this
  }

  protected _updateSplit(): void {
    if (this._subTextsCount) {
      this.getChildren('front').forEach(child => this.removeChild(child))
      this._subTextsCount = 0
    }

    if (this.split) {
      this.measureResult?.paragraphs.forEach((p) => {
        p.fragments.forEach((f) => {
          f.characters.forEach((c) => {
            this.appendChild(
              new Text2D({
                content: c.content,
                style: {
                  ...c.computedStyle as any,
                  left: c.inlineBox.x,
                  top: c.inlineBox.y,
                  width: 0,
                  height: 0,
                  effects: this.effects,
                },
              }),
              'front',
            )
            this._subTextsCount++
          })
        })
      })
    }
  }

  protected override _redraw(): CanvasBatchable[] {
    this.updateMeasure()
    return super._redraw()
  }

  protected override _drawContent(): void {
    if (!this.split) {
      const onText2DRender = (this.getChildren()?.find(child => 'onText2DRender' in child) as any)?.onText2DRender
      if (onText2DRender) {
        onText2DRender()
      }
      else {
        this.text.render({
          pixelRatio: this.texture.pixelRatio,
          view: this.texture.source,
        })
      }
      this.texture.requestUpload()
      super._drawContent()
    }
  }
}
