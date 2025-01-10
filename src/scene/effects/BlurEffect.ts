import type { WebGLRenderer } from '../../core'
import type { Viewport } from '../main'
import { customNode, property } from '../../core'
import { Material, QuadUvGeometry } from '../resources'
import { Effect } from './Effect'

const vertX = `attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv[9];
uniform float strength;

void main(void) {
  gl_Position = vec4(position, 0, 1);
  vUv[0] = uv + vec2(-4.0 * strength, 0.0);
  vUv[1] = uv + vec2(-3.0 * strength, 0.0);
  vUv[2] = uv + vec2(-2.0 * strength, 0.0);
  vUv[3] = uv + vec2(-1.0 * strength, 0.0);
  vUv[4] = uv + vec2(0.0 * strength, 0.0);
  vUv[5] = uv + vec2(1.0 * strength, 0.0);
  vUv[6] = uv + vec2(2.0 * strength, 0.0);
  vUv[7] = uv + vec2(3.0 * strength, 0.0);
  vUv[8] = uv + vec2(4.0 * strength, 0.0);
}`

const vertY = `attribute vec2 position;
attribute vec2 uv;
uniform float strength;
varying vec2 vUv[9];

void main(void) {
  gl_Position = vec4(position, 0, 1);
  vUv[0] = uv + vec2(0.0, -4.0 * strength);
  vUv[1] = uv + vec2(0.0, -3.0 * strength);
  vUv[2] = uv + vec2(0.0, -2.0 * strength);
  vUv[3] = uv + vec2(0.0, -1.0 * strength);
  vUv[4] = uv + vec2(0.0, 0.0 * strength);
  vUv[5] = uv + vec2(0.0, 1.0 * strength);
  vUv[6] = uv + vec2(0.0, 2.0 * strength);
  vUv[7] = uv + vec2(0.0, 3.0 * strength);
  vUv[8] = uv + vec2(0.0, 4.0 * strength);
}`

const frag = `varying vec2 vUv[9];
uniform sampler2D sampler;

void main(void) {
  gl_FragColor = vec4(0.0);
  float flag = 0.0;
  for (int i = 0; i < 9; i++) {
   vec2 uv = vUv[i];
   if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
     flag = 1.0;
     break;
   }
  }
  if (flag == 1.0) {
    gl_FragColor += texture2D(sampler, vUv[4]) * 0.028532;
    gl_FragColor += texture2D(sampler, vUv[4]) * 0.067234;
    gl_FragColor += texture2D(sampler, vUv[4]) * 0.124009;
    gl_FragColor += texture2D(sampler, vUv[4]) * 0.179044;
    gl_FragColor += texture2D(sampler, vUv[4]) * 0.20236;
    gl_FragColor += texture2D(sampler, vUv[4]) * 0.179044;
    gl_FragColor += texture2D(sampler, vUv[4]) * 0.124009;
    gl_FragColor += texture2D(sampler, vUv[4]) * 0.067234;
    gl_FragColor += texture2D(sampler, vUv[4]) * 0.028532;
  } else {
    gl_FragColor += texture2D(sampler, vUv[0]) * 0.028532;
    gl_FragColor += texture2D(sampler, vUv[1]) * 0.067234;
    gl_FragColor += texture2D(sampler, vUv[2]) * 0.124009;
    gl_FragColor += texture2D(sampler, vUv[3]) * 0.179044;
    gl_FragColor += texture2D(sampler, vUv[4]) * 0.20236;
    gl_FragColor += texture2D(sampler, vUv[5]) * 0.179044;
    gl_FragColor += texture2D(sampler, vUv[6]) * 0.124009;
    gl_FragColor += texture2D(sampler, vUv[7]) * 0.067234;
    gl_FragColor += texture2D(sampler, vUv[8]) * 0.028532;
  }
}`

@customNode('BlurEffect')
export class BlurEffect extends Effect {
  static materialX = new Material({
    vert: vertX,
    frag,
  })

  static materialY = new Material({
    vert: vertY,
    frag,
  })

  @property({ default: 8 }) declare strength: number
  @property({ default: 4 }) declare quality: number

  apply(renderer: WebGLRenderer, source: Viewport): void {
    source.redraw(renderer, () => {
      QuadUvGeometry.draw(renderer, BlurEffect.materialX, {
        sampler: 0,
        strength: (1 / source.width) * this.strength / this.quality,
      })
    })

    source.redraw(renderer, () => {
      QuadUvGeometry.draw(renderer, BlurEffect.materialY, {
        sampler: 0,
        strength: (1 / source.height) * this.strength / this.quality,
      })
    })
  }
}
