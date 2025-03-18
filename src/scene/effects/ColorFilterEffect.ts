import type { WebGLRenderer } from '../../core'
import type { Node, Viewport } from '../main'
import { ColorMatrix, customNode, parseCssFunctions, PI_2, property } from '../../core'
import { Effect } from '../main/Effect'
import { Material, QuadUvGeometry } from '../resources'

export interface ColorFilterEffectProperties {
  filter?: string
}

@customNode('ColorFilterEffect')
export class ColorFilterEffect extends Effect {
  @property({ default: '' }) declare filter: string

  protected _colorMatrix = new ColorMatrix()

  constructor(properties?: Partial<ColorFilterEffectProperties>, children: Node[] = []) {
    super()

    this
      .setProperties(properties)
      .append(children)
  }

  override apply(renderer: WebGLRenderer, source: Viewport): void {
    if (!this.filter)
      return

    const funs = parseCssFunctions(this.filter)
    const matrix = this._colorMatrix.identity()
    funs.forEach(({ name, args }) => {
      const values = args.map(arg => arg.normalizedIntValue)
      switch (name) {
        case 'hue-rotate':
        case 'hueRotate':
          matrix.hueRotate(values[0] * PI_2)
          break
        case 'saturate':
          matrix.saturate(values[0])
          break
        case 'brightness':
          matrix.brightness(values[0])
          break
        case 'contrast':
          matrix.contrast(values[0])
          break
        case 'invert':
          matrix.invert(values[0])
          break
        case 'sepia':
          matrix.sepia(values[0])
          break
        case 'opacity':
          matrix.opacity(values[0])
          break
        case 'grayscale':
          matrix.grayscale(values[0])
          break
      }
    })

    source.redraw(renderer, () => {
      QuadUvGeometry.draw(renderer, ColorFilterEffect.material, {
        sampler: 0,
        m: matrix.toArray(),
      })
    })
  }

  static material = new Material({
    vert: `precision mediump float;
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
  vUv = uv;
}`,
    frag: `precision highp float;
varying vec2 vUv;
uniform sampler2D sampler;
uniform float m[20];

void main(void) {
  vec4 c = texture2D(sampler, vUv);
  if (c.a > 0.0) {
    c.rgb /= c.a;
  }
  gl_FragColor = vec4(
    m[0]  * c.r + m[1]  * c.g + m[2]  * c.b + m[3]  * c.a + m[4] / 255.0,
    m[5]  * c.r + m[6]  * c.g + m[7]  * c.b + m[8]  * c.a + m[9] / 255.0,
    m[10] * c.r + m[11] * c.g + m[12] * c.b + m[13] * c.a + m[14] / 255.0,
    m[15] * c.r + m[16] * c.g + m[17] * c.b + m[18] * c.a + m[19] / 255.0
  );
}`,
  })
}
