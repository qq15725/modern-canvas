import type { WebGLRenderer } from '../../core'
import type { Viewport } from '../main'
import { customNode } from '../../core'
import { Transition } from '../main/Transition'
import { Material, QuadUvGeometry } from '../resources'

@customNode('TiltShiftTransition')
export class TiltShiftTransition extends Transition {
  static material = new Material({
    vert: `attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
  vUv = uv;
}`,
    frag: `precision highp float;
varying vec2 vUv;
uniform sampler2D sampler;
uniform float blur;
uniform float gradientBlur;
uniform vec2 start;
uniform vec2 end;
uniform vec2 delta;
uniform vec2 texSize;
uniform float progress;

float random(vec3 scale, float seed) {
  return fract(sin(dot(gl_FragCoord.xyz + seed, scale)) * 43758.5453 + seed);
}

void main(void) {
  float blur1 = blur - progress * blur;
  float gradientBlur1 = progress * gradientBlur;

  vec4 color = vec4(0.0);
  float total = 0.0;
  float offset = random(vec3(12.9898, 78.233, 151.7182), 0.0);
  vec2 normal = normalize(vec2(start.y - end.y, end.x - start.x));
  float radius = smoothstep(0.0, 1.0, abs(dot(vUv * texSize - start, normal)) / gradientBlur1) * blur1;

  for (float t = -30.0; t <= 30.0; t++) {
    float percent = (t + offset - 0.5) / 30.0;
    float weight = 1.0 - abs(percent);
    vec4 sample1 = texture2D(sampler, vUv + delta / texSize * percent * radius);
    sample1.rgb *= sample1.a;
    color += sample1 * weight;
    total += weight;
  }

  color /= total;
  color.rgb /= color.a + 0.00001;

  gl_FragColor = color;
}`,
  })

  blur = 100
  gradientBlur = 600

  override apply(renderer: WebGLRenderer, target: Viewport): void {
    const currentTimeProgress = this.currentTimeProgress
    let sampler: number
    let progress: number
    if (currentTimeProgress < 0.5) {
      sampler = 0
      progress = (0.5 - currentTimeProgress) / 0.5
    }
    else {
      sampler = 1
      progress = (currentTimeProgress - 0.5) / 0.5
    }

    const width = target.width
    const height = target.height
    const start = [0, height / 2]
    const end = [600, height / 2]
    const texSize = [width, height]

    const dx = end[0] - start[0]
    const dy = end[1] - start[1]
    const d = Math.sqrt((dx * dx) + (dy * dy))

    QuadUvGeometry.draw(renderer, TiltShiftTransition.material, {
      sampler,
      progress,
      blur: this.blur,
      gradientBlur: this.gradientBlur,
      start,
      end,
      delta: [dx / d, dy / d],
      texSize,
    })

    QuadUvGeometry.draw(renderer, TiltShiftTransition.material, {
      sampler,
      progress,
      blur: this.blur,
      gradientBlur: this.gradientBlur,
      start,
      end,
      delta: [-dy / d, dx / d],
      texSize,
    })
  }
}
