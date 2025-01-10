import type { WebGLRenderer } from '../../core'
import type { Viewport } from '../main'
import { customNode, property } from '../../core'
import { Material, QuadUvGeometry } from '../resources'
import { Effect } from './Effect'

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

  @property() saturation = 1
  @property() contrast = 1
  @property() brightness = 1
  @property() red = 1
  @property() green = 1
  @property() blue = 1
  @property() alpha = 1
  @property() gamma = 1

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
