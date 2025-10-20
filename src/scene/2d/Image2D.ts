import type { ImageFillCropRect } from 'modern-idoc'
import type { CanvasBatchable, Node } from '../main'
import type { ImageFrame, Texture2D } from '../resources'
import type { Element2DProperties } from './Element2D'
import { property } from 'modern-idoc'
import { assets } from '../../asset'
import { customNode, Transform2D } from '../../core'
import { AnimatedTexture } from '../resources'
import { Element2D } from './Element2D'

export interface Image2DProperties extends Element2DProperties {
  src: string
  srcRect: ImageFillCropRect
  gif: boolean
}

@customNode('Image2D')
export class Image2D extends Element2D {
  @property({ internal: true }) declare texture: AnimatedTexture | undefined
  @property({ fallback: '' }) declare src: string
  @property() declare srcRect: ImageFillCropRect | undefined
  @property({ fallback: false }) declare gif: boolean

  get currentFrameTexture(): Texture2D | undefined { return this.texture?.frames[this._frameIndex]?.texture }
  get textureDuration(): number { return this.texture?.duration ?? 0 }

  // HTMLImageElement
  get naturalWidth(): number { return this.currentFrameTexture?.realWidth ?? 0 }
  get naturalHeight(): number { return this.currentFrameTexture?.realHeight ?? 0 }
  get complete(): boolean { return this._complete }

  protected _frameIndex = 0
  protected _complete = false
  protected _wait = Promise.resolve()

  constructor(properties?: Partial<Image2DProperties>, children: Node[] = []) {
    super()
    this.setProperties(properties)
    this.append(children)
  }

  protected override _updateProperty(key: string, value: any, oldValue: any): void {
    super._updateProperty(key, value, oldValue)

    switch (key) {
      case 'src':
        this._wait = this._load(value)
        break
      case 'srcRect':
        this.requestRedraw()
        break
    }
  }

  decode(): Promise<void> { return this._wait }

  setResource(source: Texture2D | ImageFrame[] | AnimatedTexture): this {
    let texture: AnimatedTexture
    if (source instanceof AnimatedTexture) {
      texture = source
    }
    else {
      texture = new AnimatedTexture(source)
    }
    this.texture = texture.updateDuration()
    if (this.currentFrameTexture && (!this.style.width || !this.style.height)) {
      const texture = this.currentFrameTexture
      this.style.width = texture.realWidth
      this.style.height = texture.realHeight
    }
    return this
  }

  protected async _load(src: string): Promise<void> {
    this._complete = false
    if (src) {
      try {
        this.setResource(
          this.gif || src?.includes('.gif')
            ? await assets.gif.load(src)
            : await assets.texture.load(src),
        )
        this.requestRedraw()
        this.emit('load')
      }
      catch (err) {
        console.warn(err)
        this.emit('error', err)
      }
    }
    else {
      this.texture = undefined
    }
    this._complete = true
  }

  protected _getFrameCurrentTime(): number {
    const duration = this.textureDuration
    if (!duration || !this._tree)
      return 0
    const currentTime = this._currentTime
    if (currentTime < 0)
      return 0
    return currentTime % duration
  }

  protected _updateFrameIndex(): this {
    if (!this.texture)
      return this
    const currentTime = this._getFrameCurrentTime()
    const frames = this.texture.frames
    const len = frames.length
    if (len <= 1 && this._frameIndex === 0)
      return this
    let index = len - 1
    for (let time = 0, i = 0; i < len; i++) {
      time += frames[i].duration ?? 0
      if (time >= currentTime) {
        index = i
        break
      }
    }
    if (this._frameIndex !== index) {
      this._frameIndex = index
      this.requestRedraw()
    }
    return this
  }

  protected override _process(delta: number): void {
    this._updateFrameIndex()
    super._process(delta)
  }

  protected override _drawContent(): void {
    const texture = this.currentFrameTexture
    if (texture?.isValid()) {
      const { left = 0, top = 0, right = 0, bottom = 0 } = this.srcRect ?? {}
      const { width, height } = this.size
      this.context.fillStyle = texture
      const w = Math.abs(1 + (left + right)) * width
      const h = Math.abs(1 + (top + bottom)) * height
      const sx = 1 / w
      const sy = 1 / h
      const tx = (left * width) * sx
      const ty = (top * height) * sy
      this.context.uvTransform = new Transform2D()
        .scale(sx, sy)
        .translate(tx, ty)
      this.shape.draw()
      this.context.fill()
    }
  }

  protected _repaint(batchables: CanvasBatchable[]): CanvasBatchable[] {
    return super._repaint(batchables).map((batchable) => {
      return {
        ...batchable,
        disableWrapMode: true,
      }
    })
  }
}
