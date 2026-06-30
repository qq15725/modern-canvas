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
import { BoundingBox, Transform2D } from 'modern-path2d'
import { Character, Text } from 'modern-text'
import { assets } from '../../../asset'
import { CoreObject, createHTMLCanvas, markRaw } from '../../../core'
import { CanvasTexture, GradientTexture, sharedGlyphAtlas } from '../../resources'
import { getFillDrawOptions } from './utils'

export type TextDrawMode = 'auto' | 'texture' | 'path'

// 文字栅格像素密度（2 倍超采样，保证常规文字清晰；缩小靠 mipmap）。
const DEFAULT_TEXT_PIXEL_RATIO = 2

// 纹理尺寸安全余量：夹到 GPU 上限时留几像素，避免 ceil 后正好触达上限导致纹理异常/黑块。
const TEXTURE_SIZE_MARGIN = 64

// 懒查一次 GPU 的 MAX_TEXTURE_SIZE 并缓存（同 GPU 恒定）。文字纹理的设备尺寸
// （逻辑尺寸 × pixelRatio）不能超过它，否则整张纹理上传失败、大文本直接渲染不出来。
// 无 WebGL 环境回退到保守值。
let _maxTextureSize = 0
function getMaxTextureSize(): number {
  if (_maxTextureSize) {
    return _maxTextureSize
  }
  try {
    const canvas = createHTMLCanvas() as HTMLCanvasElement
    const gl = (canvas.getContext('webgl2') || canvas.getContext('webgl')) as WebGLRenderingContext | null
    _maxTextureSize = (gl && gl.getParameter(gl.MAX_TEXTURE_SIZE)) || 4096
  }
  catch {
    _maxTextureSize = 4096
  }
  return _maxTextureSize
}

export class Element2DText extends CoreObject implements NormalizedText {
  @property({ fallback: true }) declare enabled: NormalizedText['enabled']
  @property({ fallback: () => [] }) declare content: NormalizedText['content']
  @property({ alias: '_parent.style.json' }) declare style: NormalizedText['style']
  @property() declare effects: NormalizedText['effects']
  @property() declare fill: NormalizedText['fill']
  @property() declare outline: NormalizedText['outline']
  @property() declare deformation: NormalizedText['deformation']
  @property({ alias: 'base.measureDom' }) declare measureDom: HTMLElement
  @property({ alias: 'base.fonts' }) declare fonts: Fonts
  @property({ fallback: 'auto' }) declare drawMode: TextDrawMode

  readonly base: Text

  get textContent(): string { return this._textContent }
  set textContent(val) { this.setContent(val) }

  protected _textContent = ''
  protected _autoDrawMode?: TextDrawMode // TODO
  protected _atlasEligible = false
  protected _textureStale = true
  protected _texture = new CanvasTexture({
    mipmap: true,
  })

  // 超大文字分块平铺：单张纹理超 GPU 上限时，把文字按上限切成若干块、每块满分辨率栅格，
  // 绘制时逐块贴到各自子矩形 → 任意大小都清晰（不再夹小 pixelRatio 导致糊/黑块）。
  // 为空时走单纹理(_texture)路径。tile.{x,y,w,h} 为该块在 boundingBox 内的逻辑矩形。
  protected _tiles: { texture: CanvasTexture, x: number, y: number, w: number, h: number }[] = []

  protected _textureMap = new Map<string, {
    texture: Texture2D | undefined
    box: RectangleLike
  }>()

  constructor(
    protected _parent: Element2D,
  ) {
    super()

    // 文本排版实例挂载大量字形 path 数据，是渲染资源而非视图数据：创建即 markRaw，
    // 使其不被宿主响应式系统深度代理（否则代理海量 path 会带来严重的响应式开销）。
    this.base = markRaw(new Text())
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
      case 'deformation':
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
    // glyph atlas 路径：纯色实心字形走逐字 quad 批渲染，跳过整段栅格化（编辑/缩放/resize
    // 不再每次重栅整篇）。slot 在 draw() 时按需栅格化、跨元素复用。
    this._atlasEligible = this._computeAtlasEligible()
    if (this._atlasEligible) {
      this._releaseTiles()
      this._textureStale = true
      this._parent.requestDraw()
      return
    }
    this._rasterTexture()
    this._parent.requestDraw()
  }

  // 整段栅格化到 CanvasTexture（atlas 不适用时的回退路径：effects/outline/渐变/图片填充/超大字形）。
  protected _rasterTexture(): void {
    const width = Math.ceil(this.base.boundingBox.width)
    const height = Math.ceil(this.base.boundingBox.height)
    const pixelRatio = DEFAULT_TEXT_PIXEL_RATIO
    const maxTile = Math.floor((getMaxTextureSize() - TEXTURE_SIZE_MARGIN) / pixelRatio)
    if (width <= maxTile && height <= maxTile) {
      this._releaseTiles()
      const texture = this._texture
      texture.pixelRatio = pixelRatio
      texture.width = width
      texture.height = height
      this.base.render({ view: texture.source, pixelRatio })
      texture.requestUpdate('source')
    }
    else {
      this._renderTiles(width, height, pixelRatio, maxTile)
    }
    this._textureStale = false
  }

  // 把文字按 maxTile 切成 cols×rows 块逐块栅格；复用已有 tile 纹理（多退少补），
  // 每块只渲染 boundingBox 内对应子区域（modern-text 的 region 参数）。
  protected _renderTiles(width: number, height: number, pixelRatio: number, maxTile: number): void {
    const cols = Math.ceil(width / maxTile)
    const rows = Math.ceil(height / maxTile)
    const need = cols * rows
    while (this._tiles.length > need) {
      this._tiles.pop()!.texture.destroy()
    }
    let i = 0
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * maxTile
        const y = r * maxTile
        const w = Math.min(maxTile, width - x)
        const h = Math.min(maxTile, height - y)
        let tile = this._tiles[i]
        if (!tile) {
          tile = { texture: new CanvasTexture({ mipmap: true }), x, y, w, h }
          this._tiles[i] = tile
        }
        tile.x = x
        tile.y = y
        tile.w = w
        tile.h = h
        const tex = tile.texture
        tex.pixelRatio = pixelRatio
        tex.width = w
        tex.height = h
        this.base.render({ view: tex.source, pixelRatio, region: { x, y, width: w, height: h } })
        tex.requestUpdate('source')
        i++
      }
    }
  }

  protected _releaseTiles(): void {
    if (this._tiles.length) {
      this._tiles.forEach(t => t.texture.destroy())
      this._tiles = []
    }
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
    if (this._tiles.length) {
      // 分块：逐块贴到各自子矩形（块在 boundingBox 内偏移 (x,y)、尺寸 (w,h)）。
      for (const tile of this._tiles) {
        this._drawTextureRect(ctx, tile.texture, left + tile.x, top + tile.y, tile.w, tile.h)
      }
    }
    else {
      this._drawTextureRect(ctx, this._texture, left, top, width, height)
    }
  }

  // 把一张纹理铺满给定矩形（rx,ry,rw,rh），UV [0,1] 映射到该矩形。
  protected _drawTextureRect(ctx: CanvasContext, texture: Texture2D, rx: number, ry: number, rw: number, rh: number): void {
    ctx.fillStyle = texture
    ctx.rect(rx, ry, rw, rh)
    const { a, c, tx, b, d, ty } = new Transform2D()
      .translate(-rx, -ry)
      .scale(1 / rw, 1 / rh)
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

  // atlas 适用条件：drawMode 非强制 path/texture、无 effects/outline/高亮图片、无渐变/图片填充
  // （仅纯色实心字形），且最大字号不超过单页容量（超大字走 tiling 回退）。
  protected _computeAtlasEligible(): boolean {
    if (this.drawMode === 'texture' || this.drawMode === 'path') {
      return false
    }
    if (Boolean(this.effects?.length) || Boolean(this.outline?.width)) {
      return false
    }
    if (this.fill && !isNone(this.fill)) {
      return false // 元素级渐变/图片填充。
    }
    const hasComplexFragment = this.content.some(p => p.fragments.some(f => Boolean(
      f.highlightImage || f.highlight?.image || (f.fill && !isNone(f.fill as any)),
    )))
    if (hasComplexFragment) {
      return false
    }
    // 单页设备尺寸上限 PAGE(2048) / superSample(2)，留 1.5 余量给高瘦字形。
    const maxGlyphLogical = (2048 / sharedGlyphAtlas.superSample) / 1.5
    const chars = this.base.characters
    for (let i = 0; i < chars.length; i++) {
      const cs = chars[i].computedStyle
      if (typeof cs.color !== 'string') {
        return false
      }
      if (cs.fontSize > maxGlyphLogical) {
        return false
      }
    }
    return true
  }

  // 逐字形 quad 批渲染：每唯一字形向共享 atlas 取 slot（miss 时栅格化一次），按页纹理分组
  // 累积顶点/UV/索引，每页一次 drawMesh → 同纹理 quad 经批渲染塌缩成 ~1 draw call。
  // 返回 false 表示遇到无法装箱的字形，调用方回退整段栅格。
  protected _atlasDraw(ctx: CanvasContext): boolean {
    const atlas = sharedGlyphAtlas
    const chars = this.base.characters
    const groups = new Map<CanvasTexture, { v: number[], uv: number[], idx: number[], n: number }>()
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i]
      const gb = ch.glyphBox
      if (!gb || gb.width <= 0 || gb.height <= 0) {
        continue
      }
      const cs = ch.computedStyle
      const color = cs.color
      if (typeof color !== 'string') {
        return false
      }
      const italic = cs.fontStyle === 'italic' ? 1 : 0
      const key = `${ch.content}|${cs.fontFamily}|${cs.fontSize}|${cs.fontWeight ?? 400}|${italic}|${color}`
      const left = gb.left
      const top = gb.top
      const slot = atlas.acquire(key, gb.width, gb.height, (c2d) => {
        // ctx 已被 atlas 预置（设备像素、缩放=superSample、原点=slot 内部左上）。
        // 把字形 path 平移到 ink 盒原点后绘制（path 惰性构建，仅 miss 时触发）。
        c2d.translate(-left, -top)
        ch.path.drawTo(c2d, { fill: color, fillRule: 'nonzero', stroke: 'none' })
      })
      if (!slot) {
        return false
      }
      let g = groups.get(slot.texture)
      if (!g) {
        g = { v: [], uv: [], idx: [], n: 0 }
        groups.set(slot.texture, g)
      }
      const b = g.n * 4
      const right = left + gb.width
      const bottom = top + gb.height
      g.v.push(left, top, right, top, right, bottom, left, bottom)
      g.uv.push(slot.u0, slot.v0, slot.u1, slot.v0, slot.u1, slot.v1, slot.u0, slot.v1)
      g.idx.push(b, b + 1, b + 2, b, b + 2, b + 3)
      g.n++
    }
    for (const [texture, g] of groups) {
      if (!g.n) {
        continue
      }
      ctx.fillStyle = texture
      ctx.drawMesh(g.v, g.uv, g.idx)
    }
    return true
  }

  draw(): void {
    const ctx = this._parent.context

    if (this._atlasEligible && this._atlasDraw(ctx)) {
      return
    }

    if (this.useTextureDraw()) {
      if (this._textureStale) {
        this._rasterTexture()
      }
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
