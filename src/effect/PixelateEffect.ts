import type { Viewport } from '../core'
import type { WebGLRenderer } from '../renderer'
import { customNode, Material, property, QuadUvGeometry } from '../core'
import { Effect } from './Effect'

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
uniform vec2 size;
uniform sampler2D sampler;
uniform vec4 filterArea;

vec2 mapCoord(vec2 coord) {
  coord *= filterArea.xy;
  coord += filterArea.zw;
  return coord;
}

vec2 unmapCoord(vec2 coord) {
  coord -= filterArea.zw;
  coord /= filterArea.xy;
  return coord;
}

vec2 pixelate(vec2 coord, vec2 size) {
  return floor(coord / size) * size;
}

void main(void) {
  vec2 coord = mapCoord(vUv);
  coord = pixelate(coord, size);
  coord = unmapCoord(coord);
  gl_FragColor = texture2D(sampler, coord);
}`,
  })

  @property() size!: number

  constructor(
    size = 10,
  ) {
    super()
    this.size = size
  }

  override apply(renderer: WebGLRenderer, source: Viewport): void {
    source.redraw(renderer, () => {
      QuadUvGeometry.draw(renderer, PixelateEffect.material, {
        sampler: 0,
        size: [this.size, this.size],
        filterArea: [source.width, source.height, 0, 0],
      })
    })
  }
}
