import type { Rectangulable } from '../main/interfaces'
import type { Texture2D } from '../resources'
import type { Node2DProperties } from './Node2D'
import { Rect2, Transform2D } from '../../core'
import { Node2D } from './Node2D'

export interface TextureRect2DProperties extends Node2DProperties {
  //
}

export class TextureRect2D<T extends Texture2D = Texture2D> extends Node2D implements Rectangulable {
  texture?: T

  getRect(): Rect2 {
    let { left, top, width, height, rotate } = this.style
    if (rotate) {
      rotate = Math.abs(rotate % 180)
      rotate = (rotate / 180) * Math.PI
      const sin = Math.abs(Math.sin(rotate))
      const cos = Math.abs(Math.cos(rotate))
      const newWidth = height * sin + width * cos
      const newHeight = height * cos + width * sin
      left += (width - newWidth) / 2
      top += (height - newHeight) / 2
      width = newWidth
      height = newHeight
    }
    return new Rect2(left, top, width, height)
  }

  protected override _drawContent(): void {
    if (this.texture?.valid) {
      this.context.fillStyle = this.texture
      this.context.textureTransform = new Transform2D().scale(
        this.style.width! / this.texture.width,
        this.style.height! / this.texture.height,
      )
      super._drawContent()
    }
  }
}
