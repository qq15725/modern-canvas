import type { Rectangulable } from '../main/interfaces'
import type { Texture2D } from '../resources'
import type { Node2DProperties } from './Node2D'
import { Transform2D } from '../../core'
import { Node2D } from './Node2D'

export interface TextureRect2DProperties extends Node2DProperties {
  //
}

export class TextureRect2D<T extends Texture2D = Texture2D> extends Node2D implements Rectangulable {
  texture?: T

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
