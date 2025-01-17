import type { WebGLRenderer } from '../../core'
import type { Viewport } from '../main'
import { customNode, property } from '../../core'
import { Effect } from '../main/Effect'
import { Material, QuadUvGeometry } from '../resources'

@customNode('ZoomBlurEffect')
export class ZoomBlurEffect extends Effect {
  @property() center?: number[]
  @property() innerRadius = 20
  @property() radius = -1
  @property() strength = 0.1

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
uniform vec4 inputSize;

uniform vec2 center;
uniform float strength;
uniform float innerRadius;
uniform float radius;

const float MAX_KERNEL_SIZE = 32.0;

highp float rand(vec2 co, float seed) {
  const highp float a = 12.9898, b = 78.233, c = 43758.5453;
  highp float dt = dot(co + seed, vec2(a, b)), sn = mod(dt, 3.14159);
  return fract(sin(sn) * c + seed);
}

void main() {
  float minGradient = innerRadius * 0.3;
  float innerRadius1 = (innerRadius + minGradient * 0.5) / inputSize.x;

  float gradient = radius * 0.3;
  float radius1 = (radius - gradient * 0.5) / inputSize.x;

  float countLimit = MAX_KERNEL_SIZE;

  vec2 dir = vec2(center.xy / inputSize.xy - vUv);
  float dist = length(vec2(dir.x, dir.y * inputSize.y / inputSize.x));

  float strength1 = strength;

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
    float normalCount = gap / inputSize.x;
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

  override apply(renderer: WebGLRenderer, source: Viewport): void {
    source.redraw(renderer, () => {
      QuadUvGeometry.draw(renderer, ZoomBlurEffect.material, {
        sampler: 0,
        center: this.center ?? [source.width / 2, source.height / 2],
        innerRadius: this.innerRadius,
        radius: this.radius,
        strength: this.strength,
        inputSize: [source.width, source.height, 1 / source.width, 1 / source.height],
      })
    })
  }
}
