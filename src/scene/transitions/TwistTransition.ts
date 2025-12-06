import type { GlRenderer } from '../../core'
import type { Viewport } from '../main'
import { customNode } from '../../core'
import { Transition } from '../main/Transition'
import { Material, QuadUvGeometry } from '../resources'

@customNode('TwistTransition')
export class TwistTransition extends Transition {
  radius?: number
  angle = 4
  padding = 20
  offset?: number

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
uniform float radius;
uniform float angle;
uniform vec2 offset;
uniform vec4 filterArea;
uniform float progress;

vec2 mapCoord(vec2 coord) {
  coord -= filterArea.zw;
  coord *= filterArea.xy;
  return coord;
}

vec2 unmapCoord(vec2 coord) {
  coord -= filterArea.zw;
  coord /= filterArea.xy;
  return coord;
}

vec2 twist(vec2 coord, float radius) {
  coord -= offset;
  float dist = length(coord);
  if (dist < radius) {
    float ratioDist = (radius - dist) / radius;
    float angleMod = ratioDist * ratioDist * angle;
    float s = sin(angleMod);
    float c = cos(angleMod);
    coord = vec2(coord.x * c - coord.y * s, coord.x * s + coord.y * c);
  }
  coord += offset;
  return coord;
}

void main(void) {
  vec2 coord = mapCoord(vUv);
  coord = twist(coord, radius - (progress * radius));
  coord = unmapCoord(coord);
  gl_FragColor = texture2D(sampler, coord);
}`,
    },
  })

  override apply(renderer: GlRenderer, source: Viewport): void {
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

    const width = source.width
    const height = source.height

    QuadUvGeometry.draw(renderer, TwistTransition.material, {
      sampler,
      progress,
      filterArea: [width, height, 0, 0],
      radius: this.radius ?? width,
      angle: this.angle,
      padding: this.padding,
      offset: this.offset ?? [width / 2, height / 2],
    })
  }
}
