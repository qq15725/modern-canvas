import type { Node } from '../main'
import type { Texture2D } from '../resources'
import type { Element2DProperties } from './element'
import { Element2D } from './element'

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
    if (this.texture?.isValid()) {
      this.shape.draw(true)
      this.context.fillStyle = this.texture
      this.context.fill()
    }
  }
}
