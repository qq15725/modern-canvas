import type { Fonts } from 'modern-font'
import type {
  NormalizedFill,
  NormalizedOutline,
  NormalizedText,
  TextContent,
  Text as TextProperties,
} from 'modern-idoc'
import type { MeasureResult } from 'modern-text'
import type { RectangleLike } from '../../../core'
import type { CanvasContext, TransformVertex } from '../../main'
import type { Texture2D } from '../../resources'
import type { Element2D } from './Element2D'
import { isNone, normalizeFill, normalizeText, normalizeTextContent, property } from 'modern-idoc'
import { BoundingBox } from 'modern-path2d'
import { Character, Text } from 'modern-text'
import { assets } from '../../../asset'
import { CoreObject, Transform2D } from '../../../core'
import { CanvasTexture, GradientTexture } from '../../resources'
import { getFillDrawOptions } from './utils'

export type TextDrawMode = 'auto' | 'texture' | 'path'

export class Element2DText extends CoreObject {
  @property({ fallback: true }) declare enabled: boolean
  @property({ fallback: () => [] }) declare content: NormalizedText['content']
  @property({ alias: '_parent.style.json' }) declare style: NormalizedText['style']
  @property() declare effects: NormalizedText['effects']
  @property() declare fill: NormalizedText['fill']
  @property() declare outline: NormalizedText['outline']
  @property({ alias: 'base.measureDom' }) declare measureDom: HTMLElement
  @property({ alias: 'base.fonts' }) declare fonts: Fonts
  @property({ fallback: 'auto' }) declare drawMode: TextDrawMode

  readonly base: Text

  get textContent(): string { return this._textContent }
  set textContent(val) { this.setContent(val) }

  protected _textContent = ''
  protected _autoDrawMode?: TextDrawMode // TODO
  protected _texture = new CanvasTexture({
    mipmap: true,
  })

  protected _textureMap = new Map<string, {
    texture: Texture2D | undefined
    box: RectangleLike
  }>()

  constructor(
    protected _parent: Element2D,
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
        this._parent.requestDraw()
        break
      case 'effects':
      case 'measureDom':
      case 'fonts':
        this.load()
        break
      case 'fill':
      case 'outline':
      case 'content':
        this.load().then(() => {
          this._updateTextureMap()
        })
        break
    }

    switch (key) {
      case 'content':
        this._textContent = this.getStringContent()
        break
    }
  }

  async load(): Promise<void> {
    await assets.awaitBy(async () => {
      await this.base.load()
      this.update()
    })
  }

  update(): void {
    this.base.fonts = this.base.fonts ?? this._parent.tree?.fonts
    this.base.update()
    const texture = this._texture
    texture.width = Math.ceil(this.base.boundingBox.width)
    texture.height = Math.ceil(this.base.boundingBox.height)
    this.base.render({
      view: texture.source,
      pixelRatio: texture.pixelRatio,
    })
    texture.requestUpdate('source')
    this._parent.requestDraw()
  }

  protected _updateTextureMap(): void {
    this._textureMap.clear()
    if (this.useTextureDraw()) {
      return
    }
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

  protected async _updateTexture(key: string, fill: NormalizedFill | undefined, box: BoundingBox): Promise<void> {
    if (fill && Object.keys(fill).length > 0) {
      this._textureMap.set(key, {
        texture: await this._loadTexture(normalizeFill(fill), box),
        box,
      })
      this._parent.requestDraw()
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
      this._parent.tree?.log(`load image ${fill.image}`)
      return await assets.texture.load(fill.image)
    }
    else {
      return undefined
    }
  }

  setContent(content: TextContent): void {
    this.content = normalizeTextContent(content)
  }

  getStringContent(): string {
    return this.base.toString()
  }

  measure(): MeasureResult {
    this.update()
    return this.base.measure()
  }

  isValid(): boolean {
    return Boolean(
      this.enabled
      && !/^\s*$/.test(this.getStringContent()),
    )
  }

  protected _createTransformVertex(): TransformVertex | undefined {
    return undefined
    // const parent = this._parent
    // if (parent.scale.x > 0 && parent.scale.y > 0) {
    //   return undefined
    // }
    // const scale = parent.scale.x * parent.scale.y
    // const pivot = parent.pivot
    // const t2d = new Transform2D()
    //   .translate(-pivot.x, -pivot.y)
    //   .scale(scale > 0 ? 1 : -1, 1)
    //   .translate(pivot.x, pivot.y)
    // const { a, c, tx, b, d, ty } = t2d.toObject()
    // let x, y
    // return (vertices, i) => {
    //   x = vertices[i]
    //   y = vertices[i + 1]
    //   vertices[i] = (a * x) + (c * y) + tx
    //   vertices[i + 1] = (b * x) + (d * y) + ty
    // }
  }

  useTextureDraw(): boolean {
    let drawMode = this.drawMode
    if (drawMode === 'auto') {
      if (
        Boolean(this.effects?.length)
        || Boolean(this.outline?.width)
        || this.content.some((p) => {
          return p.fragments.some(f => Boolean(
            f.highlightImage
            || f.highlight?.image,
          ))
        })
      ) {
        drawMode = 'texture'
      }
      else {
        drawMode = this._autoDrawMode ?? 'texture'
      }
    }
    return drawMode === 'texture'
  }

  protected _pathDraw(ctx: CanvasContext): void {
    const transformVertex = this._createTransformVertex()
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
                ctx.addPath(path)
                ctx.style = { ...path.style }
                ctx.fillStyle = texture?.texture ?? fill.color
                ctx.fill({
                  ...getFillDrawOptions(
                    fill,
                    texture?.box ?? {
                      x: 0,
                      y: 0,
                      width: this._parent.size.width,
                      height: this._parent.size.height,
                    },
                  ),
                  transformVertex,
                })
              }
            }
            else {
              ctx.addPath(path)
              ctx.style = { ...path.style }
              ctx.fill({
                transformVertex,
              })
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
                ctx.addPath(path)
                ctx.style = { ...path.style }
                ctx.lineWidth = outline.width || 1
                ctx.strokeStyle = texture?.texture ?? outline.color
                ctx.lineCap = outline.lineCap
                ctx.lineJoin = outline.lineJoin
                ctx.stroke({
                  ...getFillDrawOptions(
                    outline,
                    texture?.box ?? {
                      x: 0,
                      y: 0,
                      width: this._parent.size.width,
                      height: this._parent.size.height,
                    },
                  ),
                  transformVertex,
                })
              }
            }
            else {
              ctx.addPath(path)
              ctx.style = { ...path.style }
              ctx.stroke({
                transformVertex,
              })
            }
          }
        }
        else {
          ctx.addPath(path)
          ctx.style = { ...path.style }

          if (path.style.fill && !isNone(path.style.fill)) {
            ctx.fill({
              transformVertex: this._createTransformVertex(),
            })
          }

          if (path.style.stroke && !isNone(path.style.stroke)) {
            ctx.stroke({
              transformVertex: this._createTransformVertex(),
            })
          }
        }
      })
    })
  }

  protected _textureDraw(ctx: CanvasContext): void {
    const { left = 0, top = 0, width, height } = this.base.boundingBox
    ctx.fillStyle = this._texture
    ctx.rect(left, top, width, height)
    const { a, c, tx, b, d, ty } = new Transform2D()
      .translate(-left, -top)
      .scale(1 / width, 1 / height)
    let x, y
    ctx.fill({
      transformUv: (uvs, i) => {
        x = uvs[i]
        y = uvs[i + 1]
        uvs[i] = (a * x) + (c * y) + tx
        uvs[i + 1] = (b * x) + (d * y) + ty
      },
      transformVertex: this._createTransformVertex(),
    })
  }

  draw(): void {
    const ctx = this._parent.context

    if (this.useTextureDraw()) {
      this._textureDraw(ctx)
    }
    else {
      this._pathDraw(ctx)
    }
  }

  process(_delta: number): void {
    //
  }
}
