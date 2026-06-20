import type { Node } from '../main'
import type { Texture2D } from '../resources'
import type { Element2DProperties } from './element'
import { Transform2D } from 'modern-path2d'
import { Element2D } from './element'

/** 纹理子区域（图集 sub-rect），单位为纹理像素。设置后只绘制该矩形区域，用于精灵图集 / 骨骼插槽。 */
export interface TextureRect2DRegion {
  x: number
  y: number
  width: number
  height: number
}

export interface TextureRect2DProperties extends Element2DProperties {
  /** 纹理子区域（像素）。省略则绘制整张纹理。 */
  region?: TextureRect2DRegion
}

export class TextureRect2D<T extends Texture2D = Texture2D> extends Element2D {
  texture?: T
  /** 纹理子区域（像素）。省略则绘制整张纹理。 */
  region?: TextureRect2DRegion

  constructor(properties?: Partial<TextureRect2DProperties>, children: Node[] = []) {
    super()

    this
      .setProperties(properties)
      .append(children)
  }

  /** 把节点显示尺寸坐标(0..size)映射到纹理 UV(0..1)的变换；有 region 时映射到子矩形。 */
  protected _uvTransform(): Transform2D {
    const region = this.region
    if (region && this.texture) {
      const tw = this.texture.width || 1
      const th = this.texture.height || 1
      // u = region.x/tw + (px/size.x) * (region.width/tw)
      return new Transform2D(
        region.width / (this.size.x * tw),
        0,
        0,
        region.height / (this.size.y * th),
        region.x / tw,
        region.y / th,
      )
    }
    return new Transform2D().scale(1 / this.size.x, 1 / this.size.y)
  }

  protected override _drawContent(): void {
    if (this.texture?.isValid()) {
      this.shape.draw(true)
      this.context.fillStyle = this.texture
      const { a, c, tx, b, d, ty } = this._uvTransform()
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
