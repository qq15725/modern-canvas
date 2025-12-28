import type { AnimationItem } from 'lottie-web'
import type { Node } from '../main'
import type { TextureRect2DProperties } from './TextureRect2D'
import { property } from 'modern-idoc'
import { assets } from '../../asset'
import { customNode } from '../../core'
import { CanvasTexture } from '../resources'
import { TextureRect2D } from './TextureRect2D'

export interface Lottie2DProperties extends TextureRect2DProperties {
  src: string
}

@customNode('Lottie2D')
export class Lottie2D extends TextureRect2D {
  @property({ fallback: '' }) declare src: string

  readonly texture = new CanvasTexture()
  animation?: AnimationItem

  constructor(properties?: Partial<Lottie2DProperties>, children: Node[] = []) {
    super()
    this.setProperties(properties)
    this.append(children)
  }

  protected override _updateProperty(key: string, value: any, oldValue: any): void {
    super._updateProperty(key, value, oldValue)

    switch (key) {
      case 'src':
        this._load()
        break
    }
  }

  protected override _updateStyleProperty(key: string, value: any, oldValue: any): void {
    super._updateStyleProperty(key, value, oldValue)
    switch (key) {
      case 'width':
        this.texture.width = Math.floor(this.style.width)
        break
      case 'height':
        this.texture.height = Math.floor(this.style.height)
        break
    }
  }

  protected async _load(): Promise<void> {
    this.animation = await assets.lottie.load(this.src, this.texture.source)
    this.duration = this.animation.getDuration(false) * 1000
    this.texture.requestUpdate('source')
    this.requestDraw()
  }

  protected override _process(delta: number): void {
    this.animation?.goToAndStop(this.currentTime, false)
    this.texture.requestUpdate('source')
    this.requestDraw()
    super._process(delta)
  }
}
