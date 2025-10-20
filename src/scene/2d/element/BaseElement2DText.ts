import type { NormalizedFill, NormalizedOutline, TextContent, Text as TextProperties } from 'modern-idoc'
import type { MeasureResult } from 'modern-text'
import type { CanvasContext } from '../../main'
import type { Texture2D } from '../../resources'
import type { BaseElement2D } from './BaseElement2D'
import { isNone, normalizeText, normalizeTextContent, property } from 'modern-idoc'
import { BoundingBox } from 'modern-path2d'
import { Character, Text } from 'modern-text'
import { assets } from '../../../asset'
import { CoreObject, Transform2D } from '../../../core'
import { CanvasTexture, GradientTexture } from '../../resources'
import { getDrawOptions } from './utils'

export class BaseElement2DText extends CoreObject {
  @property({ fallback: true }) declare enabled: boolean
  @property({ fallback: () => [] }) declare content: Text['content']
  @property({ alias: 'parent.style.json' }) declare style: Text['style']
  @property() declare effects: Text['effects']
  @property() declare fill: Text['fill']
  @property() declare outline: Text['outline']
  @property({ alias: 'base.measureDom' }) declare measureDom: Text['measureDom']
  @property({ alias: 'base.fonts' }) declare fonts: Text['fonts']

  readonly base: Text
  measureResult?: MeasureResult
  protected _texture = new CanvasTexture()
  protected _textureMap = new Map<string, {
    texture: Texture2D | undefined
    box: any
  }>()

  constructor(
    public parent: BaseElement2D,
  ) {
    super()

    this.base = new Text()
    this.base.setPropertyAccessor(this)
  }

  override setProperties(properties?: TextProperties): this {
    return super.setProperties(
      isNone(properties)
        ? undefined
        : normalizeText(properties),
    )
  }

  protected override _updateProperty(key: string, value: any, oldValue: any): void {
    super._updateProperty(key, value, oldValue)

    switch (key) {
      case 'enabled':
        this.parent.requestRedraw()
        break
      case 'effects':
      case 'measureDom':
      case 'fonts':
        this.update()
        this.parent.requestRedraw()
        break
      case 'fill':
      case 'outline':
      case 'content':
        this.update()
        this._updateTextureMap()
        this.parent.requestRedraw()
        break
    }
  }

  update(): void {
    this.base.fonts = this.base.fonts ?? this.parent.tree?.fonts
    this.base.update()
  }

  protected _updateTextureMap(): void {
    this._textureMap.clear()
    const pGlyphBoxs: BoundingBox[] = []
    this.base.paragraphs.forEach((p, pIndex) => {
      const fGlyphBoxs: BoundingBox[] = []
      p.fragments.forEach((f, fIndex) => {
        if (f.characters.length) {
          const fGlyphBox = BoundingBox.from(
            ...f.characters.map(c => c.compatibleGlyphBox),
          )
          this._updateTexture(`${pIndex}.${fIndex}.fill`, f.fill, fGlyphBox)
          this._updateTexture(`${pIndex}.${fIndex}.outline`, f.outline, fGlyphBox)
          fGlyphBoxs.push(fGlyphBox)
        }
      })
      if (fGlyphBoxs.length) {
        const pGlyphBox = BoundingBox.from(...fGlyphBoxs)
        this._updateTexture(`${pIndex}.fill`, p.fill, pGlyphBox)
        this._updateTexture(`${pIndex}.outline`, p.outline, pGlyphBox)
        pGlyphBoxs.push(pGlyphBox)
      }
    })
    if (pGlyphBoxs.length) {
      const glyphBox = BoundingBox.from(...pGlyphBoxs)
      this._updateTexture('fill', this.fill, glyphBox)
      this._updateTexture('outline', this.outline, glyphBox)
    }
  }

  protected async _updateTexture(key: string, fill: NormalizedFill | undefined, box: any): Promise<void> {
    if (fill && Object.keys(fill).length > 0) {
      this._textureMap.set(key, {
        texture: await this._loadTexture(fill, box),
        box,
      })
      this.parent.requestRedraw()
    }
  }

  protected async _loadTexture(fill: NormalizedFill, box: any): Promise<Texture2D | undefined> {
    if (fill.linearGradient || fill.radialGradient) {
      return new GradientTexture(
        (fill.linearGradient ?? fill.radialGradient)!,
        box.width,
        box.height,
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
    this.update()
    return this.base.measure()
  }

  updateMeasure(): this {
    this.measureResult = this.measure()
    return this
  }

  isValid(): boolean {
    return Boolean(
      this.enabled
      && !/^\s*$/.test(this.base.toString()),
    )
  }

  protected _createVertTransform(): Transform2D | undefined {
    const parent = this.parent
    if (parent.scale.x > 0 && parent.scale.y > 0) {
      return undefined
    }
    const scale = parent.scale.x * parent.scale.y
    const origin = parent.getTransformOrigin()
    return new Transform2D()
      .translate(-origin.x, -origin.y)
      .scale(scale > 0 ? 1 : -1, 1)
      .translate(origin.x, origin.y)
  }

  protected _useDrawByTexture(): boolean {
    return !!this.effects?.length
      || this.content.some((p) => {
        return p.fragments.some(f => !!f.highlightImage)
      })
  }

  protected _drawByVertices(ctx: CanvasContext): void {
    this.base.pathSets.forEach((pathSet) => {
      pathSet.paths.forEach((path) => {
        const meta = path.getMeta()

        if (meta instanceof Character) {
          const fIndex = meta.parent.index
          const pIndex = meta.parent.parent.index

          if (path.style.fill && !isNone(path.style.fill)) {
            if (typeof path.style.fill === 'object') {
              const fill = path.style.fill as NormalizedFill
              const texture
                = this._textureMap.get(`${pIndex}.${fIndex}.fill`)
                  ?? this._textureMap.get(`${pIndex}.fill`)
                  ?? this._textureMap.get('fill')

              if (
                fill.enabled !== false
                && (texture || fill.color)
              ) {
                const { uvTransform, disableWrapMode } = getDrawOptions(
                  fill,
                  texture?.box ?? {
                    width: this.parent.size.width,
                    height: this.parent.size.height,
                  },
                )
                ctx.addPath(path)
                ctx.style = { ...path.style }
                ctx.uvTransform = uvTransform
                ctx.fillStyle = texture?.texture ?? fill.color
                ctx.vertTransform = this._createVertTransform()
                ctx.fill({ disableWrapMode })
              }
            }
            else {
              ctx.addPath(path)
              ctx.style = { ...path.style }
              ctx.vertTransform = this._createVertTransform()
              ctx.fill()
            }
          }

          if (path.style.stroke && !isNone(path.style.stroke)) {
            if (typeof path.style.stroke === 'object') {
              const outline = path.style.stroke as NormalizedOutline
              const texture
                = this._textureMap.get(`${pIndex}.${fIndex}.outline`)
                  ?? this._textureMap.get(`${pIndex}.outline`)
                  ?? this._textureMap.get('outline')
              if (
                outline.enabled !== false
                && (texture || outline.color)
                && (outline.width === undefined || outline.width)
              ) {
                const { uvTransform, disableWrapMode } = getDrawOptions(
                  outline,
                  texture?.box ?? {
                    width: this.parent.size.width,
                    height: this.parent.size.height,
                  },
                )
                ctx.addPath(path)
                ctx.style = { ...path.style }
                ctx.lineWidth = outline.width || 1
                ctx.uvTransform = uvTransform
                ctx.strokeStyle = texture?.texture ?? outline.color
                ctx.lineCap = outline.lineCap
                ctx.lineJoin = outline.lineJoin
                ctx.vertTransform = this._createVertTransform()
                ctx.stroke({ disableWrapMode })
              }
            }
            else {
              ctx.addPath(path)
              ctx.style = { ...path.style }
              ctx.vertTransform = this._createVertTransform()
              ctx.stroke()
            }
          }
        }
        else {
          ctx.addPath(path)
          ctx.style = { ...path.style }
          ctx.vertTransform = this._createVertTransform()
          ctx.fill()
        }
      })
    })
  }

  protected _drawByTexture(ctx: CanvasContext): void {
    this._texture.width = Math.round(this.base.boundingBox.width)
    this._texture.height = Math.round(this.base.boundingBox.height)
    this.base.render({ view: this._texture.source })
    ctx.fillStyle = this._texture
    ctx.vertTransform = this._createVertTransform()
    ctx.fill()
  }

  draw(): void {
    const ctx = this.parent.context
    if (this._useDrawByTexture()) {
      this._drawByTexture(ctx)
    }
    else {
      this._drawByVertices(ctx)
    }
  }
}
