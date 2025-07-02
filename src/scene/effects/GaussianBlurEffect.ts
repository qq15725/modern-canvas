import type { WebGLRenderer } from '../../core'
import type { EffectProperties, Node, Viewport } from '../main'
import { property } from 'modern-idoc'
import { customNode } from '../../core'
import { Effect } from '../main/Effect'
import { Material, QuadUvGeometry } from '../resources'

export interface GaussianBlurEffectProperties extends EffectProperties {
  strength: number
  quality: number
}

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

@customNode('GaussianBlurEffect')
export class GaussianBlurEffect extends Effect {
  static materialX = new Material({
    vert: `attribute vec2 position;
attribute vec2 uv;
uniform float uStrength;
varying vec2 vUv[9];

void main(void) {
  gl_Position = vec4(position, 0, 1);
  vUv[0] = uv + vec2(-4.0 * uStrength, 0.0);
  vUv[1] = uv + vec2(-3.0 * uStrength, 0.0);
  vUv[2] = uv + vec2(-2.0 * uStrength, 0.0);
  vUv[3] = uv + vec2(-1.0 * uStrength, 0.0);
  vUv[4] = uv + vec2(0.0 * uStrength, 0.0);
  vUv[5] = uv + vec2(1.0 * uStrength, 0.0);
  vUv[6] = uv + vec2(2.0 * uStrength, 0.0);
  vUv[7] = uv + vec2(3.0 * uStrength, 0.0);
  vUv[8] = uv + vec2(4.0 * uStrength, 0.0);
}`,
    frag,
  })

  static materialY = new Material({
    vert: `attribute vec2 position;
attribute vec2 uv;
uniform float uStrength;
varying vec2 vUv[9];

void main(void) {
  gl_Position = vec4(position, 0, 1);
  vUv[0] = uv + vec2(0.0, -4.0 * uStrength);
  vUv[1] = uv + vec2(0.0, -3.0 * uStrength);
  vUv[2] = uv + vec2(0.0, -2.0 * uStrength);
  vUv[3] = uv + vec2(0.0, -1.0 * uStrength);
  vUv[4] = uv + vec2(0.0, 0.0 * uStrength);
  vUv[5] = uv + vec2(0.0, 1.0 * uStrength);
  vUv[6] = uv + vec2(0.0, 2.0 * uStrength);
  vUv[7] = uv + vec2(0.0, 3.0 * uStrength);
  vUv[8] = uv + vec2(0.0, 4.0 * uStrength);
}`,
    frag,
  })

  @property() accessor strength: number = 4
  @property() accessor quality: number = 3

  constructor(properties?: Partial<GaussianBlurEffectProperties>, children: Node[] = []) {
    super()

    this
      .setProperties(properties)
      .append(children)
  }

  override apply(renderer: WebGLRenderer, source: Viewport): void {
    const sx = (1 / source.width)
    const sy = (1 / source.height)
    const quality = Math.max(this.quality, 1)

    for (let i = 0; i < quality; i++) {
      source.redraw(renderer, () => {
        QuadUvGeometry.draw(renderer, GaussianBlurEffect.materialX, {
          sampler: 0,
          uStrength: sx * (this.strength / quality),
        })
      })
    }

    for (let i = 0; i < quality; i++) {
      source.redraw(renderer, () => {
        QuadUvGeometry.draw(renderer, GaussianBlurEffect.materialY, {
          sampler: 0,
          uStrength: sy * (this.strength / quality),
        })
      })
    }
  }
}
