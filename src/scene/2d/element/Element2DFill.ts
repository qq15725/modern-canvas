import type { Fill, NormalizedFill, PipelineImage } from 'modern-idoc'
import type { AnimatedTexture } from '../../resources'
import type { Element2D } from './Element2D'
import { isNone, normalizeFill, property } from 'modern-idoc'
import { assets } from '../../../asset'
import { CoreObject, createHTMLCanvas, SUPPORTS_IMAGE_BITMAP } from '../../../core'
import { GradientTexture, Texture2D, ViewportTexture } from '../../resources'
import { getImagePipelineResolver } from './imagePipeline'
import { getFillDrawOptions } from './utils'

type Snapshotable = CanvasImageSource & { width: number, height: number }

export interface Element2DFill extends NormalizedFill {
  //
}

export class Element2DFill extends CoreObject implements NormalizedFill {
  @property({ fallback: true }) declare enabled: boolean
  @property() declare color?: NormalizedFill['color']
  @property() declare image?: NormalizedFill['image']
  @property() declare linearGradient?: NormalizedFill['linearGradient']
  @property() declare radialGradient?: NormalizedFill['radialGradient']
  @property() declare cropRect?: NormalizedFill['cropRect']
  @property() declare stretchRect?: NormalizedFill['stretchRect']
  @property() declare dpi?: NormalizedFill['dpi']
  @property() declare rotateWithShape?: NormalizedFill['rotateWithShape']
  @property() declare tile?: NormalizedFill['tile']
  @property() declare opacity?: NormalizedFill['opacity']
  /** 图片处理管线；图片加载后交由注入的解析器烘焙到运行时纹理，不持久化 */
  @property() declare pipelines?: NormalizedFill['pipelines']

  texture?: Texture2D
  animatedTexture?: AnimatedTexture

  constructor(
    protected _parent: Element2D,
  ) {
    super()
  }

  protected _setProperties(properties?: NormalizedFill): this {
    return super.setProperties(properties)
  }

  override setProperties(properties?: Fill): this {
    return this._setProperties(
      isNone(properties)
        ? undefined
        : normalizeFill(properties),
    )
  }

  protected _updateProperty(key: string, value: any, oldValue: any): void {
    super._updateProperty(key, value, oldValue)

    switch (key) {
      case 'color':
      case 'cropRect':
      case 'stretchRect':
      case 'dpi':
      case 'rotateWithShape':
      case 'tile':
      case 'opacity':
      case 'enabled':
        this._parent.requestDraw()
        break
      case 'image':
      case 'linearGradient':
      case 'radialGradient':
      case 'pipelines':
        this._updateTexture()
        break
    }
  }

  async loadTexture(): Promise<void> {
    if (this.linearGradient || this.radialGradient) {
      this.texture = new GradientTexture(
        (this.linearGradient ?? this.radialGradient)!,
        Math.floor(this._parent.size.width),
        Math.floor(this._parent.size.height),
      )
    }
    else if (!isNone(this.image)) {
      this._parent.tree?.log(`load image ${this.image}`)

      if (this.image === 'viewport') {
        // skip
      }
      else {
        let isGif = this.image.split('?')[0].endsWith('.gif')
        const url = this.image
        const res = await assets.loadBy(url, async () => {
          const blob = await assets.fetch(url).then(rep => rep.blob())
          if (!isGif) {
            isGif = blob.type.startsWith('image/gif') ?? false
          }
          if (isGif) {
            return await assets.gif.load(blob)
          }
          else {
            return await assets.texture.load(blob)
          }
        })
        if (isGif) {
          this.animatedTexture = res as any
        }
        else {
          this.texture = res as any
          await this._applyPipelines(url)
        }
      }
    }
    else {
      this.animatedTexture = undefined
      this.texture = undefined
    }
  }

  /**
   * 把原图经 `pipelines` 烘焙成一张运行时纹理（无管线 / 无解析器 / gif 时跳过）。
   * 始终从 image 独立解码像素喂给管线，不读 `this.texture.source`（那张 ImageBitmap
   * 由纹理管线持有、会经 premultiply 上传/GC 而被消费）。结果按 `url + 管线` 缓存复用。
   */
  protected async _applyPipelines(url: string): Promise<void> {
    const pipelines = this.pipelines
    const resolver = getImagePipelineResolver()
    if (!pipelines?.length || !resolver)
      return
    const canvas = await assets.loadBy(`${url}#mc-pipeline:${this._pipelineKey(pipelines)}`, async () => {
      const source = await this._decodePipelineSource(url)
      if (!source)
        return undefined
      const out = await resolver(pipelines, source)
      if (!out)
        return undefined
      return this._pipelineImageToCanvas(out)
    })
    // 用普通 Texture2D 包裹烘焙结果（不能用 CanvasTexture：其设置 width/height 会重设
    // canvas 而清空已烘焙像素）。仅当确有结果时替换，避免覆盖已加载的原图纹理。
    if (canvas)
      this.texture = new Texture2D({ source: canvas, width: canvas.width, height: canvas.height, uploadMethodId: 'image' })
  }

  protected _pipelineKey(pipelines: NonNullable<NormalizedFill['pipelines']>): string {
    return pipelines.map(p => `${p.name}:${p.params ? JSON.stringify(p.params) : ''}`).join('|')
  }

  /** 从 image 独立解码为中立像素结构（不读 GPU 纹理 source） */
  protected async _decodePipelineSource(url: string): Promise<PipelineImage | undefined> {
    const bitmap = await assets.fetchImageBitmap(url) as unknown as Snapshotable
    const w = Math.max(1, Math.round(bitmap.width))
    const h = Math.max(1, Math.round(bitmap.height))
    const canvas = createHTMLCanvas(w, h)
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx)
      return undefined
    ctx.drawImage(bitmap, 0, 0, w, h)
    if (SUPPORTS_IMAGE_BITMAP && bitmap instanceof ImageBitmap)
      bitmap.close()
    const imageData = ctx.getImageData(0, 0, w, h)
    return { data: imageData.data, width: w, height: h }
  }

  protected _pipelineImageToCanvas(image: PipelineImage): HTMLCanvasElement | undefined {
    const w = Math.max(1, Math.round(image.width))
    const h = Math.max(1, Math.round(image.height))
    const canvas = createHTMLCanvas(w, h)
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx)
      return undefined
    const imageData = ctx.createImageData(w, h)
    imageData.data.set(image.data)
    ctx.putImageData(imageData, 0, 0)
    return canvas
  }

  protected async _updateTexture(): Promise<void> {
    await this.loadTexture()
    this._parent.requestDraw()
  }

  isValid(): boolean {
    return Boolean(
      this.enabled && (
        this.texture
        || this.animatedTexture
        || this.color
        || this.image === 'viewport'
      ),
    )
  }

  draw(): void {
    const { width, height } = this._parent.size
    const ctx = this._parent.context
    let options = {
      size: { width, height },
    }
    if (this.image === 'viewport') {
      ctx.fillStyle = new ViewportTexture()
    }
    else {
      const texture = this.animatedTexture?.currentFrame.texture
        ?? this.texture

      options = {
        ...options,
        ...getFillDrawOptions(
          this,
          this.tile && texture
            ? { x: 0, y: 0, width: texture.sourceWidth, height: texture.sourceHeight }
            : { x: 0, y: 0, width, height },
        ),
      }
      ctx.fillStyle = texture
        ?? this.color
        ?? '#000000FF'
    }
    ctx.fill(options)
  }

  protected _getFrameCurrentTime(): number {
    const duration = this.animatedTexture?.duration ?? 0
    if (!duration)
      return 0
    const currentTime = this._parent.currentTime
    if (currentTime < 0)
      return 0
    return currentTime % duration
  }

  updateFrameIndex(): this {
    if (!this.animatedTexture)
      return this
    const currentTime = this._getFrameCurrentTime()
    const frames = this.animatedTexture.frames
    const len = frames.length
    if (len <= 1 && this.animatedTexture.frameIndex === 0)
      return this
    let index = len - 1
    for (let time = 0, i = 0; i < len; i++) {
      time += frames[i].duration ?? 0
      if (time >= currentTime) {
        index = i
        break
      }
    }
    if (this.animatedTexture.frameIndex !== index) {
      this.animatedTexture.frameIndex = index
      this._parent.requestDraw()
    }
    return this
  }

  process(_delta: number): void {
    this.updateFrameIndex()
  }
}
