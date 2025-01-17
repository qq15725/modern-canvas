import type { WebGLRenderer } from '../../core'
import type { Viewport } from '../main'
import { customNode, property } from '../../core'
import { Effect } from '../main/Effect'
import { Material, QuadUvGeometry } from '../resources'

@customNode('EmbossEffect')
export class EmbossEffect extends Effect {
  @property() strength!: number

  constructor(
    strength = 5,
  ) {
    super()

    this.strength = strength
  }

  override apply(renderer: WebGLRenderer, source: Viewport): void {
    source.redraw(renderer, () => {
      QuadUvGeometry.draw(renderer, EmbossEffect.material, {
        sampler: 0,
        strength: this.strength,
        inputSize: [source.width, source.height, 1 / source.width, 1 / source.height],
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
    frag: `precision mediump float;
uniform sampler2D sampler;
uniform vec4 inputSize;
uniform float strength;
varying vec2 vUv;

void main(void) {
    vec2 onePixel = inputSize.zw;
    vec4 color;
    color.rgb = vec3(0.5);
    color -= texture2D(sampler, vUv - onePixel) * strength;
    color += texture2D(sampler, vUv + onePixel) * strength;
    color.rgb = vec3((color.r + color.g + color.b) / 3.0);
    float alpha = texture2D(sampler, vUv).a;
    gl_FragColor = vec4(color.rgb * alpha, alpha);
}`,
  })
}
