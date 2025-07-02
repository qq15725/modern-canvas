import type { PropertyDeclaration } from 'modern-idoc'
import type { MeasureResult, TextOptions } from 'modern-text'
import type { EventListenerOptions, EventListenerValue } from '../../core'
import type { CanvasBatchable, Node } from '../main'
import type { Element2DEventMap } from './Element2D'
import type { TextureRect2DProperties } from './TextureRect2D'
import { property } from 'modern-idoc'
import { Text, textDefaultStyle } from 'modern-text'
import { customNode } from '../../core'
import { CanvasTexture } from '../resources'
import { TextureRect2D } from './TextureRect2D'

export interface Text2DEventMap extends Element2DEventMap {
  updateBase: (base: Text) => void
}

export interface Text2D {
  on: (<K extends keyof Text2DEventMap>(type: K, listener: Text2DEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  once: (<K extends keyof Text2DEventMap>(type: K, listener: Text2DEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  off: (<K extends keyof Text2DEventMap>(type: K, listener?: Text2DEventMap[K], options?: EventListenerOptions) => this)
    & ((type: string, listener: EventListenerValue, options?: EventListenerOptions) => this)
  emit: (<K extends keyof Text2DEventMap>(type: K, ...args: Parameters<Text2DEventMap[K]>) => boolean)
    & ((type: string, ...args: any[]) => boolean)
}

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
  @property() accessor split: boolean = false
  @property({ alias: 'base.content' }) accessor content!: Text['content']
  @property({ alias: 'base.effects' }) accessor effects: Text['effects']
  @property({ protected: true, alias: 'base.measureDOM' }) accessor measureDOM: Text['measureDOM']
  @property({ protected: true, alias: 'base.fonts' }) accessor fonts: Text['fonts']

  override texture = new CanvasTexture()

  base = new Text()
  measureResult?: MeasureResult
  protected _subTextsCount = 0

  constructor(properties?: Partial<Text2DProperties>, children: Node[] = []) {
    super()
    this.setProperties(properties)
    this.append(children)
    if (properties?.plugins) {
      properties.plugins.forEach((plugin) => {
        this.base.use(plugin)
      })
    }
  }

  protected override _updateProperty(key: string, value: any, oldValue: any, declaration?: PropertyDeclaration): void {
    super._updateProperty(key, value, oldValue, declaration)

    switch (key) {
      case 'content':
      case 'effects':
      case 'measureDOM':
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

  protected _updateBase(): void {
    this.base.style = this.style.toJSON() as any
    this.emit('updateBase', this.base)
    this.base.requestUpdate()
  }

  protected override _updateStyleProperty(key: string, value: any, oldValue: any): void {
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
    return this.children.front
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
    this._updateBase()
    return this.base.measure()
  }

  updateMeasure(): this {
    this.measureResult = this.measure()
    const { boundingBox } = this.measureResult
    const { left, top } = this.style
    this.position.x = left + Math.min(0, boundingBox.left)
    this.position.y = top + Math.min(0, boundingBox.top)
    this.size.width = boundingBox.width
    this.size.height = boundingBox.height
    return this
  }

  protected _updateSplit(): void {
    if (this._subTextsCount) {
      this.children.front.forEach(child => this.removeChild(child))
      this._subTextsCount = 0
    }

    if (this.split) {
      this.measure().paragraphs.forEach((p) => {
        p.fragments.forEach((f) => {
          f.characters.forEach((c) => {
            this.append(
              new Text2D({
                internalMode: 'front',
                style: {
                  ...c.computedStyle as any,
                  left: c.inlineBox.x,
                  top: c.inlineBox.y,
                  width: 0,
                  height: 0,
                },
                content: c.content,
                effects: this.effects,
                fonts: this.fonts,
              }),
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
      this.base.render({
        pixelRatio: this.texture.pixelRatio,
        view: this.texture.source,
      })
      this.texture.requestUpload()
      super._drawContent()
    }
  }
}
