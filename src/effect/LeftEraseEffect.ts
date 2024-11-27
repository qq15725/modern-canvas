import type { WebGLRenderer } from '../renderer'
import { customNode, Material, QuadUvGeometry } from '../core'
import { Effect } from './Effect'

@customNode('LeftEraseEffect')
export class LeftEraseEffect extends Effect {
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
uniform float progress;
uniform sampler2D previous;
uniform sampler2D next;

float easeInOutQuint(float t) {
    return t < 0.5 ? 16.0*t*t*t*t*t : 1.0+16.0*(--t)*t*t*t*t;
}

void main() {
  vec4 src1Color = texture2D(previous, vUv);
  vec4 src2Color = texture2D(next, vUv);
  float mProgress = 1.0 - progress;
  float mixPercent = 0.0;
  if (vUv.x <= mProgress) {
    mixPercent = 1.0;
  }
  gl_FragColor = mix(src2Color, src1Color, mixPercent);
}`,
  })

  override apply(renderer: WebGLRenderer) {
    QuadUvGeometry.draw(renderer, LeftEraseEffect.material, {
      previous: 0,
      next: 1,
      progress: this.visibleProgress,
    })
  }
}