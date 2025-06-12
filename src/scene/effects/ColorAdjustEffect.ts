import type { WebGLRenderer } from '../../core'
import type { EffectProperties, Node, Viewport } from '../main'
import { property } from 'modern-idoc'
import { customNode } from '../../core'
import { Effect } from '../main/Effect'
import { Material, QuadUvGeometry } from '../resources'

export interface ColorAdjustEffectProperties extends EffectProperties {
  saturation: number
  contrast: number
  brightness: number
  red: number
  green: number
  blue: number
  alpha: number
  gamma: number
}

@customNode('ColorAdjustEffect')
export class ColorAdjustEffect extends Effect {
  static material = new Material({
    vert: `precision mediump float;
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
  vUv = uv;
}`,
    frag: `varying vec2 vUv;
uniform sampler2D sampler;
uniform float gamma;
uniform float contrast;
uniform float saturation;
uniform float brightness;
uniform float red;
uniform float green;
uniform float blue;
uniform float alpha;

void main(void) {
  vec4 c = texture2D(sampler, vUv);
  if (c.a > 0.0) {
      c.rgb /= c.a;
      vec3 rgb = pow(c.rgb, vec3(1. / gamma));
      rgb = mix(vec3(.5), mix(vec3(dot(vec3(.2125, .7154, .0721), rgb)), rgb, saturation), contrast);
      rgb.r *= red;
      rgb.g *= green;
      rgb.b *= blue;
      c.rgb = rgb * brightness;
      c.rgb *= c.a;
  }
  gl_FragColor = c * alpha;
}`,
  })

  @property({ default: 1 }) declare saturation: number
  @property({ default: 1 }) declare contrast: number
  @property({ default: 1 }) declare brightness: number
  @property({ default: 1 }) declare red: number
  @property({ default: 1 }) declare green: number
  @property({ default: 1 }) declare blue: number
  @property({ default: 1 }) declare alpha: number
  @property({ default: 1 }) declare gamma: number

  constructor(properties?: Partial<ColorAdjustEffectProperties>, children: Node[] = []) {
    super()

    this
      .setProperties(properties)
      .append(children)
  }

  override apply(renderer: WebGLRenderer, source: Viewport): void {
    source.redraw(renderer, () => {
      QuadUvGeometry.draw(renderer, ColorAdjustEffect.material, {
        sampler: 0,
        saturation: this.saturation,
        contrast: this.contrast,
        brightness: this.brightness,
        red: this.red,
        green: this.green,
        blue: this.blue,
        alpha: this.alpha,
        gamma: Math.max(this.gamma ?? 1, 0.0001),
      })
    })
  }
}
