import type { AnimationItem } from 'lottie-web'
import type { Node } from '../main'
import type { Node2DProperties } from './Node2D'
import { assets } from '../../asset'
import { customNode, property } from '../../core'
import { CanvasTexture } from '../resources'
import { TextureRect2D } from './TextureRect2D'

export interface Lottie2DProperties extends Node2DProperties {
  src: string
}

@customNode('Lottie2D')
export class Lottie2D extends TextureRect2D {
  @property({ default: '' }) declare src: string

  readonly texture = new CanvasTexture()
  animation?: AnimationItem

  constructor(properties?: Partial<Lottie2DProperties>, children: Node[] = []) {
    super()
    this.setProperties(properties)
    this.append(children)
  }

  protected override _onUpdateProperty(key: PropertyKey, value: any, oldValue: any): void {
    super._onUpdateProperty(key, value, oldValue)
    switch (key) {
      case 'src':
        this._load()
        break
    }
  }

  protected override _onUpdateStyleProperty(key: PropertyKey, value: any, oldValue: any): void {
    super._onUpdateStyleProperty(key, value, oldValue)
    switch (key) {
      case 'width':
        this.texture.width = this.style.width
        break
      case 'height':
        this.texture.height = this.style.height
        break
    }
  }

  protected async _load(): Promise<void> {
    this.animation = await assets.lottie.load(this.src, this.texture.source)
    this.duration = this.animation.getDuration(false) * 1000
    this.texture.requestUpload()
    this.requestRedraw()
  }

  protected override _process(delta: number): void {
    this.animation?.goToAndStop(this.timeRelative, false)
    this.texture.requestUpload()
    this.requestRepaint()
    super._process(delta)
  }
}
