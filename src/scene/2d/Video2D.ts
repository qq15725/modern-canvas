import type { Node } from '../main'
import type { VideoTexture } from '../resources'
import type { Node2DProperties } from './Node2D'
import { assets } from '../../asset'
import { customNode, property, Transform2D } from '../../core'
import { Node2D } from './Node2D'

export interface Video2DProperties extends Node2DProperties {
  src: string
}

@customNode('Video2D')
export class Video2D extends Node2D {
  @property({ default: '' }) declare src: string

  texture?: VideoTexture

  get duration(): number { return (this.texture?.duration ?? 0) * 1000 }

  protected _wait = Promise.resolve()

  constructor(properties?: Partial<Video2DProperties>, children: Node[] = []) {
    super()
    this.setProperties(properties)
    this.append(children)
  }

  protected override _onUpdateProperty(key: PropertyKey, value: any, oldValue: any): void {
    super._onUpdateProperty(key, value, oldValue)

    switch (key) {
      case 'src':
        this._wait = this._load(value)
        break
    }
  }

  waitLoad(): Promise<void> { return this._wait }

  protected async _load(src: string): Promise<void> {
    this.texture = await assets.video.load(src)
    if (!this.style.width || !this.style.height) {
      this.style.width = this.texture!.width
      this.style.height = this.texture!.height
    }
    this.requestRedraw()
  }

  protected override _drawContent(): void {
    const src = this.texture
    if (src) {
      this.context.fillStyle = src
      this.context.textureTransform = new Transform2D().scale(
        this.style.width! / src.width,
        this.style.height! / src.height,
      )
    }
    super._drawContent()
  }

  protected _updateVideoCurrentTime(): void {
    let currentTime = this.visibleRelativeTime
    if (currentTime < 0)
      return

    const texture = this.texture
    if (!texture)
      return

    const duration = texture.duration

    currentTime = duration
      ? currentTime % (duration * 1000)
      : 0

    if (!texture.isPlaying && !texture.seeking) {
      currentTime = ~~currentTime / 1000
      if (texture.currentTime !== currentTime) {
        texture.currentTime = currentTime
      }
    }
  }

  protected override _process(delta: number): void {
    this._updateVideoCurrentTime()
    super._process(delta)
  }
}
