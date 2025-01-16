import type { CanvasBatchable, Node } from '../main'
import type { Texture2D } from '../resources'
import type { ImageFrame } from './Image2DResource'
import type { Node2DProperties } from './Node2D'
import { assets } from '../../asset'
import { customNode, property, type PropertyDeclaration, protectedProperty, Transform2D } from '../../core'
import { Image2DResource } from './Image2DResource'
import { Node2D } from './Node2D'

export interface Image2DProperties extends Node2DProperties {
  src: string
  gif: boolean
}

@customNode('Image2D')
export class Image2D extends Node2D {
  @protectedProperty() resource?: Image2DResource
  @property({ default: false }) declare gif: boolean
  @property({ default: '' }) declare src: string

  get currentTexture(): Texture2D | undefined { return this.resource?.frames[this._frameIndex]?.texture }
  get framesDuration(): number { return this.resource?.duration ?? 0 }

  // HTMLImageElement
  get naturalWidth(): number { return this.currentTexture?.realWidth ?? 0 }
  get naturalHeight(): number { return this.currentTexture?.realHeight ?? 0 }
  get complete(): boolean { return this._complete }

  protected _frameIndex = 0
  protected _complete = false
  protected _wait = Promise.resolve()

  constructor(properties?: Partial<Image2DProperties>, children: Node[] = []) {
    super()
    this.setProperties(properties)
    this.append(children)
  }

  protected override _updateProperty(key: PropertyKey, value: any, oldValue: any, declaration?: PropertyDeclaration): void {
    super._updateProperty(key, value, oldValue, declaration)

    switch (key) {
      case 'src':
        this._wait = this._load(value)
        break
    }
  }

  decode(): Promise<void> { return this._wait }

  setResource(source: Texture2D | ImageFrame[] | Image2DResource): this {
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

  protected _getFrameCurrentTime(): number {
    const duration = this.framesDuration
    if (!duration || !this._tree)
      return 0
    const currentTime = this._currentTime
    if (currentTime < 0)
      return 0
    return currentTime % duration
  }

  protected _updateFrameIndex(): this {
    if (!this.resource)
      return this
    const currentTime = this._getFrameCurrentTime()
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
        if ((this._backgroundImage ? i === 1 : i === 0) && batchable.type === 'fill') {
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
