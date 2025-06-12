import type { WebGLRenderer } from '../../core'
import type { EffectProperties, Node, Viewport } from '../main'
import { property } from 'modern-idoc'
import { customNode } from '../../core'
import { Effect } from '../main/Effect'
import { Material, QuadUvGeometry } from '../resources'

export interface PixelateEffectProperties extends EffectProperties {
  strength: number
}

@customNode('PixelateEffect')
export class PixelateEffect extends Effect {
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
uniform vec2 uSize;
uniform vec4 uInputSize;

vec2 mapCoord(vec2 coord) {
  coord *= uInputSize.xy;
  coord += uInputSize.zw;
  return coord;
}

vec2 unmapCoord(vec2 coord) {
  coord -= uInputSize.zw;
  coord /= uInputSize.xy;
  return coord;
}

vec2 pixelate(vec2 coord, vec2 size) {
  return floor(coord / size) * size;
}

void main(void) {
  vec2 coord = mapCoord(vUv);
  coord = pixelate(coord, uSize);
  coord = unmapCoord(coord);
  gl_FragColor = texture2D(sampler, coord);
}`,
  })

  @property({ default: 10 }) declare strength: number

  constructor(properties?: Partial<PixelateEffectProperties>, children: Node[] = []) {
    super()

    this
      .setProperties(properties)
      .append(children)
  }

  override apply(renderer: WebGLRenderer, source: Viewport): void {
    source.redraw(renderer, () => {
      QuadUvGeometry.draw(renderer, PixelateEffect.material, {
        sampler: 0,
        uSize: [this.strength, this.strength],
        uInputSize: [source.width, source.height, 1 / source.width, 1 / source.height],
      })
    })
  }
}
