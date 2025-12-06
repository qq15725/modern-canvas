import type { GlRenderer } from '../../core'
import type { EffectProperties, Node, Viewport } from '../main'
import { property } from 'modern-idoc'
import { customNode } from '../../core'
import { Effect } from '../main/Effect'
import { Material, QuadUvGeometry } from '../resources'

export interface PixelateEffectProperties extends EffectProperties {
  strength: number
}

@customNode('PixelateEffect')
export class PixelateEffect extends Effect {
  static material = new Material({
    gl: {
      vertex: `attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
  vUv = uv;
}`,
      fragment: `precision highp float;
varying vec2 vUv;
uniform sampler2D sampler;
uniform vec2 offset;
uniform vec2 step;

void main(void) {
  vec2 uv = vUv;
  uv = floor((uv - offset) / step) * step + offset + step / 2.0;
  gl_FragColor = texture2D(sampler, uv);
}`,
    },
  })

  @property({ fallback: 10 }) declare strength: number

  constructor(properties?: Partial<PixelateEffectProperties>, children: Node[] = []) {
    super()

    this
      .setProperties(properties)
      .append(children)
  }

  override apply(renderer: GlRenderer, source: Viewport): void {
    source.redraw(renderer, () => {
      const viewMatrix = renderer.shader.uniforms.viewMatrix
      const zoom = [viewMatrix[0], viewMatrix[4]]
      const translate = [viewMatrix[6], viewMatrix[7]]
      const params = {
        sampler: 0,
        offset: [
          (zoom[0] + translate[0]) / source.width,
          1 - (zoom[1] + translate[1]) / source.height,
        ],
        step: [
          (this.strength * zoom[0]) / source.width,
          (this.strength * zoom[1]) / source.height,
        ],
      }
      QuadUvGeometry.draw(renderer, PixelateEffect.material, params)
    })
  }
}
