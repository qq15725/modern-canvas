import type { Node } from '../main'
import type { Texture2D } from '../resources'
import type { Element2DProperties } from './Element2D'
import { Transform2D } from '../../core'
import { Element2D } from './Element2D'

export interface TextureRect2DProperties extends Element2DProperties {
  //
}

export class TextureRect2D<T extends Texture2D = Texture2D> extends Element2D {
  texture?: T

  constructor(properties?: Partial<TextureRect2DProperties>, children: Node[] = []) {
    super()

    this
      .setProperties(properties)
      .append(children)
  }

  protected override _drawContent(): void {
    if (this.texture?.valid) {
      const { width, height } = this.size
      this.context.fillStyle = this.texture
      this.context.textureTransform = new Transform2D().scale(
        width / this.texture.width,
        height / this.texture.height,
      )
      super._drawContent()
    }
  }
}
