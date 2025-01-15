import type { AnimationItem } from 'lottie-web'
import type { Node } from '../main'
import type { Node2DProperties } from './Node2D'
import { assets } from '../../asset'
import { customNode, property, Transform2D } from '../../core'
import { Texture2D } from '../resources'
import { Node2D } from './Node2D'

export interface Lottie2DProperties extends Node2DProperties {
  pixelRatio: number
  src: string
}

@customNode('Lottie2D')
export class Lottie2D extends Node2D {
  @property({ default: 2 }) declare pixelRatio: number
  @property({ default: '' }) declare src: string
  duration = 0

  readonly texture = new Texture2D<HTMLCanvasElement>(document.createElement('canvas'))
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
        this.texture.source.width = this.style.width * this.pixelRatio
        break
      case 'height':
        this.texture.source.height = this.style.height * this.pixelRatio
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

  protected override _drawContent(): void {
    const texture = this.texture
    if (texture.valid) {
      this.context.fillStyle = texture
      this.context.textureTransform = new Transform2D().scale(
        this.style.width! / texture.width,
        this.style.height! / texture.height,
      )
      super._drawContent()
    }
  }
}
