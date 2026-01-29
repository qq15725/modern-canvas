import type { Node } from '../main'
import type { Texture2D } from '../resources'
import type { Element2DProperties } from './element'
import { Transform2D } from '../../core'
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
      const { a, c, tx, b, d, ty } = new Transform2D()
        .scale(1 / this.size.x, 1 / this.size.y)
      let _x, _y
      this.context.fill({
        transformUv: (uvs, i) => {
          _x = uvs[i]
          _y = uvs[i + 1]
          uvs[i] = (a * _x) + (c * _y) + tx
          uvs[i + 1] = (b * _x) + (d * _y) + ty
        },
      })
    }
  }
}
