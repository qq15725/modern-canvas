import type { Texture } from '../core'
import type { CanvasBatchable } from './CanvasContext'
import type { Element2DOptions } from './Element2D'
import type { ImageFrame } from './Image2DResource'
import { assets } from '../asset'
import { customNode, property, protectedProperty } from '../core'
import { Transform2D } from '../math'
import { Element2D } from './Element2D'
import { Image2DResource } from './Image2DResource'

export interface Image2DOptions extends Element2DOptions {
  src?: string
  gif?: boolean
}

@customNode('Image2D')
export class Image2D extends Element2D {
  @protectedProperty() resource?: Image2DResource
  @property({ default: false }) declare gif: boolean
  @property({ default: '' }) declare src: string

  get currentTexture(): Texture | undefined { return this.resource?.frames[this._frameIndex]?.texture }
  get duration(): number { return this.resource?.duration ?? 0 }

  // HTMLImageElement
  get naturalWidth(): number { return this.currentTexture?.realWidth ?? 0 }
  get naturalHeight(): number { return this.currentTexture?.realHeight ?? 0 }
  get complete(): boolean { return this._complete }

  protected _frameIndex = 0
  protected _complete = false
  protected _wait = Promise.resolve()

  constructor(options?: Image2DOptions) {
    super()
    options && this.setProperties(options)
  }

  protected override _onUpdateProperty(key: PropertyKey, value: any, oldValue: any): void {
    super._onUpdateProperty(key, value, oldValue)

    switch (key) {
      case 'src':
        this._wait = this._load(value)
        break
    }
  }

  decode(): Promise<void> { return this._wait }

  setResource(source: Texture | ImageFrame[] | Image2DResource): this {
    let resource: Image2DResource
    if (source instanceof Image2DResource) {
      resource = source
    }
    else {
      resource = new Image2DResource(source)
    }
    this.resource = resource.updateDuration()
    if (this.currentTexture && (!this.style.width || !this.style.height)) {
      const texture = this.currentTexture
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
          this.gif
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
      this.resource = undefined
    }
    this._complete = true
  }

  protected _getCurrentTime(): number {
    const duration = this.resource?.duration ?? 0
    if (!duration || !this._tree)
      return 0
    const currentTime = this.visibleRelativeTime
    if (currentTime < 0)
      return 0
    return currentTime % duration
  }

  protected _updateFrameIndex(): this {
    if (!this.resource)
      return this
    const currentTime = this._getCurrentTime()
    const frames = this.resource.frames
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
      this.requestRepaint()
    }
    return this
  }

  protected override _process(delta: number): void {
    this._updateFrameIndex()
    super._process(delta)
  }

  protected override _drawContent(): void {
    const texture = this.currentTexture
    if (texture?.valid) {
      this.context.fillStyle = texture
      this.context.textureTransform = new Transform2D().scale(
        this.style.width! / texture.width,
        this.style.height! / texture.height,
      )
      super._drawContent()
    }
  }

  protected override _repaint(batchables: CanvasBatchable[]): CanvasBatchable[] {
    const texture = this.currentTexture
    return super._repaint(
      batchables.map((batchable, i) => {
        if ((this._background ? i === 1 : i === 0) && batchable.type === 'fill') {
          return {
            ...batchable,
            texture: texture?.valid ? texture : undefined,
          }
        }
        return batchable
      }),
    )
  }
}
