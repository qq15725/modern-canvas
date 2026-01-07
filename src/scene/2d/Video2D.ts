import type { Node } from '../main'
import type { VideoTexture } from '../resources'
import type { TextureRect2DProperties } from './TextureRect2D'
import { property } from 'modern-idoc'
import { assets } from '../../asset'
import { customNode } from '../../core'
import { TextureRect2D } from './TextureRect2D'

export interface Video2DProperties extends TextureRect2DProperties {
  src: string
}

@customNode('Video2D')
export class Video2D extends TextureRect2D<VideoTexture> {
  @property({ fallback: '' }) declare src: string

  get videoDuration(): number { return (this.texture?.duration ?? 0) * 1000 }

  protected _wait = Promise.resolve()

  constructor(properties?: Partial<Video2DProperties>, children: Node[] = []) {
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
    }
  }

  waitLoad(): Promise<void> { return this._wait }

  protected async _load(src: string): Promise<void> {
    this.texture = await assets.video.load(src)
    this.requestDraw()
  }

  protected _updateVideoCurrentTime(): void {
    const texture = this.texture
    if (!texture)
      return

    if (!texture.isPlaying && !texture.seeking) {
      const videoCurrentTime = ~~Math.max(0, this.currentTime % (texture.duration * 1000)) / 1000
      if (texture.currentTime !== videoCurrentTime) {
        texture.currentTime = videoCurrentTime
      }
    }
  }

  protected override _process(delta: number): void {
    super._process(delta)
    this._updateVideoCurrentTime()
  }
}
