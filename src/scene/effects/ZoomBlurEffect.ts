import type { WebGLRenderer } from '../../core'
import type { EffectContext, EffectProperties, Node, Viewport } from '../main'
import { property } from 'modern-idoc'
import { customNode } from '../../core'
import { Effect } from '../main/Effect'
import { Material, QuadUvGeometry } from '../resources'

export interface ZoomBlurEffectProperties extends EffectProperties {
  center?: number[]
  innerRadius: number
  radius: number
  strength: number
}

@customNode('ZoomBlurEffect')
export class ZoomBlurEffect extends Effect {
  static material = new Material({
    vert: `attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
  vUv = uv;
}`,
    frag: `varying vec2 vUv;
uniform sampler2D sampler;
uniform vec4 uInputSize;

uniform vec2 uCenter;
uniform float uStrength;
uniform float uInnerRadius;
uniform float uRadius;

const float MAX_KERNEL_SIZE = 32.0;

highp float rand(vec2 co, float seed) {
  const highp float a = 12.9898, b = 78.233, c = 43758.5453;
  highp float dt = dot(co + seed, vec2(a, b)), sn = mod(dt, 3.14159);
  return fract(sin(sn) * c + seed);
}

void main() {
  float minGradient = uInnerRadius * 0.3;
  float innerRadius1 = (uInnerRadius + minGradient * 0.5) / uInputSize.x;

  float gradient = uRadius * 0.3;
  float radius1 = (uRadius - gradient * 0.5) / uInputSize.x;

  float countLimit = MAX_KERNEL_SIZE;

  vec2 dir = vec2(uCenter.xy / uInputSize.xy - vUv);
  float dist = length(vec2(dir.x, dir.y * uInputSize.y / uInputSize.x));

  float strength1 = uStrength;

  float delta = 0.0;
  float gap;
  if (dist < innerRadius1) {
    delta = innerRadius1 - dist;
    gap = minGradient;
  } else if (radius1 >= 0.0 && dist > radius1) { // radius1 < 0 means it's infinity
    delta = dist - radius1;
    gap = gradient;
  }

  if (delta > 0.0) {
    float normalCount = gap / uInputSize.x;
    delta = (normalCount - delta) / normalCount;
    countLimit *= delta;
    strength1 *= delta;
    if (countLimit < 1.0) {
      gl_FragColor = texture2D(sampler, vUv);
      return;
    }
  }

  float offset = rand(vUv, 0.0);

  float total = 0.0;
  vec4 color = vec4(0.0);

  dir *= strength1;

  for (float t = 0.0; t < MAX_KERNEL_SIZE; t++) {
    float percent = (t + offset) / MAX_KERNEL_SIZE;
    float weight = 4.0 * (percent - percent * percent);
    vec2 p = vUv + dir * percent;
    color += texture2D(sampler, p) * weight;
    total += weight;

    if (t > countLimit){
        break;
    }
  }

  color /= total;

  gl_FragColor = color;
}`,
  })

  @property() declare center?: number[]
  @property({ default: 20 }) declare innerRadius: number
  @property({ default: -1 }) declare radius: number
  @property({ default: 0.1 }) declare strength: number

  constructor(properties?: Partial<ZoomBlurEffectProperties>, children: Node[] = []) {
    super()

    this
      .setProperties(properties)
      .append(children)
  }

  override apply(renderer: WebGLRenderer, source: Viewport, context: EffectContext): void {
    let center = this.center
    if (context.targetArea) {
      center = [
        (context.targetArea[0] + context.targetArea[2] / 2) * source.width,
        (context.targetArea[1] + context.targetArea[3] / 2) * source.height,
      ]
    }
    source.redraw(renderer, () => {
      QuadUvGeometry.draw(renderer, ZoomBlurEffect.material, {
        sampler: 0,
        uCenter: center ?? [source.width / 2, source.height / 2],
        uInnerRadius: this.innerRadius,
        uRadius: this.radius,
        uStrength: this.strength,
        uInputSize: [source.width, source.height, 1 / source.width, 1 / source.height],
      })
    })
  }
}
