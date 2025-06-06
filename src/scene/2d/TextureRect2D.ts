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
      this.context.uvTransform = new Transform2D().scale(
        1 / width,
        1 / height,
      )
      this.shape.drawRect()
      this.context.fill()
    }
  }
}
