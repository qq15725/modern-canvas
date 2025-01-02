import type { IDOCStyleDeclaration, IDOCTextContent } from 'modern-idoc'
import type { MeasureResult } from 'modern-text'
import type { Element2DOptions } from './Element2D'
import { measureText, renderText, textDefaultStyle } from 'modern-text'
import { customNode, InternalMode, property, Texture } from '../core'
import { Transform2D } from '../math'
import { Element2D } from './Element2D'

export interface Text2DOptions extends Element2DOptions {
  pixelRatio?: number
  split?: boolean
  content?: IDOCTextContent
  effects?: Partial<IDOCStyleDeclaration>[]
}

const textStyles = new Set(Object.keys(textDefaultStyle))

@customNode('Text2D')
export class Text2D extends Element2D {
  @property({ default: 2 }) declare pixelRatio: number
  @property({ default: false }) declare split: boolean
  @property({ default: '' }) declare content: IDOCTextContent
  @property() effects?: Partial<IDOCStyleDeclaration>[]

  readonly texture = new Texture(document.createElement('canvas'))
  protected _subTextsCount = 0

  constructor(options?: Text2DOptions) {
    super()
    this.setProperties(options)
  }

  protected override _onUpdateProperty(key: PropertyKey, value: any, oldValue: any): void {
    super._onUpdateProperty(key, value, oldValue)

    switch (key) {
      case 'content':
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

  protected override _onUpdateStyleProperty(key: PropertyKey, value: any, oldValue: any): void {
    if (key === 'height')
      return

    super._onUpdateStyleProperty(key, value, oldValue)

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
    return this.getChildren(InternalMode.FRONT)
      .filter(node => node instanceof Text2D) as Text2D[]
  }

  protected _updateSubTexts(): void {
    const subTexts = this._getSubTexts()
    const result = this.measure()
    let i = 0
    if (this.split) {
      result.paragraphs.forEach((p) => {
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
    const result = measureText({
      content: this.content,
      style: {
        ...this.style.toJSON(),
        height: undefined,
      },
    })
    if (!this.style.width)
      this.style.width = result.boundingBox.width
    if (!this.style.height)
      this.style.height = result.boundingBox.height
    return result
  }

  protected _updateSplit(): void {
    if (this._subTextsCount) {
      this.getChildren(InternalMode.FRONT).forEach(child => this.removeChild(child))
      this._subTextsCount = 0
    }

    const result = this.measure()

    if (this.split) {
      result.paragraphs.forEach((p) => {
        p.fragments.forEach((f) => {
          f.characters.forEach((c) => {
            this.addChild(
              new Text2D({
                pixelRatio: this.pixelRatio,
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
              InternalMode.FRONT,
            )
            this._subTextsCount++
          })
        })
      })
    }
  }

  protected override _drawContent(): void {
    if (!this.split) {
      const onText2DRender = (this.children?.find(child => 'onText2DRender' in child) as any)?.onText2DRender
      if (onText2DRender) {
        onText2DRender()
      }
      else {
        renderText({
          view: this.texture.source,
          pixelRatio: this.pixelRatio,
          content: this.content,
          effects: this.effects,
          style: this.style.toJSON(),
        })
      }
      this.texture.requestUpload()
      this.context.fillStyle = this.texture
      this.context.textureTransform = new Transform2D().scale(
        1 / this.pixelRatio,
        1 / this.pixelRatio,
      )
      super._drawContent()
    }
  }
}
