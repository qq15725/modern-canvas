import type { NormalizedFill, PropertyDeclaration, TextContent, Text as TextProperties } from 'modern-idoc'
import type { MeasureResult } from 'modern-text'
import type { Texture2D } from '../../resources'
import type { BaseElement2D } from './BaseElement2D'
import { isNone, normalizeText, normalizeTextContent, property } from 'modern-idoc'
import { Text } from 'modern-text'
import { assets } from '../../../asset'
import { CoreObject } from '../../../core'
import { GradientTexture } from '../../resources'
import { getDrawOptions } from './utils'

export class BaseElement2DText extends CoreObject {
  @property({ fallback: true }) declare enabled: boolean
  @property({ alias: 'base.content', fallback: () => [] }) declare content: Text['content']
  @property({ alias: 'base.effects' }) declare effects: Text['effects']
  @property({ alias: 'base.fill' }) declare fill: Text['fill']
  @property({ alias: 'base.outline' }) declare outline: Text['outline']
  @property({ protected: true, alias: 'base.measureDom' }) declare measureDom: Text['measureDom']
  @property({ protected: true, alias: 'base.fonts' }) declare fonts: Text['fonts']

  readonly base = new Text()
  measureResult?: MeasureResult
  protected _textures: (Texture2D | undefined)[] = []

  constructor(
    public parent: BaseElement2D,
  ) {
    super()
    this.base.on('updateProperty', (...args) => {
      switch (args[0]) {
        case 'content':
        case 'effects':
        case 'fill':
        case 'outline':
          this.setter(args[0], args[1])
          break
      }
      this._updateProperty(...args)
    })
  }

  override setProperties(properties?: TextProperties): this {
    return super.setProperties(
      isNone(properties)
        ? undefined
        : normalizeText(properties),
    )
  }

  protected override _updateProperty(key: string, value: any, oldValue: any, declaration?: PropertyDeclaration): void {
    super._updateProperty(key, value, oldValue, declaration)

    switch (key) {
      case 'enabled':
      case 'content':
      case 'effects':
      case 'measureDom':
      case 'fonts':
        this.parent.requestRedraw()
        break
      case 'fill':
        this._updateTexture(0, value)
        break
      case 'outline':
        this._updateTexture(1, value)
        break
    }
  }

  protected async _updateTexture(index: number, fill: NormalizedFill): Promise<void> {
    this._textures[index] = await this._loadTexture(fill)
    this.parent.requestRedraw()
  }

  protected async _loadTexture(fill: NormalizedFill): Promise<Texture2D | undefined> {
    if (fill.linearGradient || fill.radialGradient) {
      return new GradientTexture(
        (fill.linearGradient ?? fill.radialGradient)!,
        this.parent.size.width,
        this.parent.size.height,
      )
    }
    else if (!isNone(fill.image)) {
      this.parent.tree?.log(`load image ${fill.image}`)
      return await assets.texture.load(fill.image)
    }
    else {
      return undefined
    }
  }

  setContent(content: TextContent): void {
    this.content = normalizeTextContent(content)
  }

  measure(): MeasureResult {
    this.base.style = {
      justifyContent: 'center',
      alignItems: 'center',
      textAlign: 'center',
      ...this.parent.style.toJSON() as any,
    }
    this.base.requestUpdate()
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
    this.base.pathSets.forEach((pathSet) => {
      pathSet.paths.forEach((path) => {
        if (path.style.stroke) {
          if (typeof path.style.stroke === 'object') {
            const outline = path.style.stroke
            if (outline.enabled !== false && (this._textures[0] || outline.color)) {
              const { uvTransform, disableWrapMode } = getDrawOptions(outline, this.parent.size)
              ctx.addPath(path)
              ctx.style = { ...path.style }
              ctx.lineWidth = outline.width || 1
              ctx.uvTransform = uvTransform
              ctx.strokeStyle = this._textures[0] ?? outline.color
              ctx.lineCap = outline.lineCap
              ctx.lineJoin = outline.lineJoin
              ctx.stroke({ disableWrapMode })
            }
          }
          else {
            ctx.addPath(path)
            ctx.style = { ...path.style }
            ctx.stroke()
          }
        }
        if (path.style.fill) {
          if (typeof path.style.fill === 'object') {
            const fill = path.style.fill
            if (fill.enabled !== false && (this._textures[1] || fill.color)) {
              const { uvTransform, disableWrapMode } = getDrawOptions(fill, this.parent.size)
              ctx.addPath(path)
              ctx.style = { ...path.style }
              ctx.uvTransform = uvTransform
              ctx.fillStyle = this._textures[1] ?? fill.color
              ctx.fill({
                disableWrapMode,
              })
            }
          }
          else {
            ctx.addPath(path)
            ctx.style = { ...path.style }
            ctx.fill()
          }
        }
      })
    })
  }
}
