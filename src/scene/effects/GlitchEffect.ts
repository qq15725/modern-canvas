import type { WebGLRenderer } from '../../core'
import type { Viewport } from '../main'
import { customNode, property } from '../../core'
import { Effect } from '../main/Effect'
import { Material, QuadUvGeometry, Texture2D } from '../resources'

@customNode('GlitchEffect')
export class GlitchEffect extends Effect {
  static material = new Material({
    vert: `precision mediump float;
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
  vUv = uv;
}`,
    frag: `precision mediump float;

varying vec2 vUv;
uniform sampler2D sampler;

uniform vec4 filterArea;
uniform vec4 filterClamp;
uniform vec2 dimensions;
uniform float aspect;

uniform sampler2D displacementMap;
uniform float offset;
uniform float sinDir;
uniform float cosDir;
uniform int fillMode;

uniform float seed;
uniform vec2 red;
uniform vec2 green;
uniform vec2 blue;

const int TRANSPARENT = 0;
const int ORIGINAL = 1;
const int LOOP = 2;
const int CLAMP = 3;
const int MIRROR = 4;

void main(void) {
  vec2 coord = (vUv * filterArea.xy) / dimensions;

  if (coord.x > 1.0 || coord.y > 1.0) {
      return;
  }

  float cx = coord.x - 0.5;
  float cy = (coord.y - 0.5) * aspect;
  float ny = (-sinDir * cx + cosDir * cy) / aspect + 0.5;

  // displacementMap: repeat
  // ny = ny > 1.0 ? ny - 1.0 : (ny < 0.0 ? 1.0 + ny : ny);

  // displacementMap: mirror
  ny = ny > 1.0 ? 2.0 - ny : (ny < 0.0 ? -ny : ny);

  vec4 dc = texture2D(displacementMap, vec2(0.5, ny));

  float displacement = (dc.r - dc.g) * (offset / filterArea.x);

  coord = vUv + vec2(cosDir * displacement, sinDir * displacement * aspect);

  if (fillMode == CLAMP) {
    coord = clamp(coord, filterClamp.xy, filterClamp.zw);
  } else {
    if (coord.x > filterClamp.z) {
      if (fillMode == TRANSPARENT) {
        discard;
      } else if (fillMode == LOOP) {
        coord.x -= filterClamp.z;
      } else if (fillMode == MIRROR) {
        coord.x = filterClamp.z * 2.0 - coord.x;
      }
    } else if (coord.x < filterClamp.x) {
      if (fillMode == TRANSPARENT) {
        discard;
      } else if (fillMode == LOOP) {
        coord.x += filterClamp.z;
      } else if (fillMode == MIRROR) {
        coord.x *= -filterClamp.z;
      }
    }

    if (coord.y > filterClamp.w) {
      if (fillMode == TRANSPARENT) {
        discard;
      } else if (fillMode == LOOP) {
        coord.y -= filterClamp.w;
      } else if (fillMode == MIRROR) {
        coord.y = filterClamp.w * 2.0 - coord.y;
      }
    } else if (coord.y < filterClamp.y) {
      if (fillMode == TRANSPARENT) {
        discard;
      } else if (fillMode == LOOP) {
        coord.y += filterClamp.w;
      } else if (fillMode == MIRROR) {
        coord.y *= -filterClamp.w;
      }
    }
  }

  gl_FragColor.r = texture2D(sampler, coord + red * (1.0 - seed * 0.4) / filterArea.xy).r;
  gl_FragColor.g = texture2D(sampler, coord + green * (1.0 - seed * 0.3) / filterArea.xy).g;
  gl_FragColor.b = texture2D(sampler, coord + blue * (1.0 - seed * 0.2) / filterArea.xy).b;
  gl_FragColor.a = texture2D(sampler, coord).a;
}`,
  })

  protected _canvas: HTMLCanvasElement
  protected _texture: Texture2D
  protected _sizes: Float32Array
  protected _offsets: Float32Array
  protected _redraw = false

  @property() slices = 10
  @property() sampleSize = 512
  @property() offset = 100
  @property() direction = 0
  @property() fillMode = 2
  @property() seed = 0
  @property() red = [2, 2]
  @property() green = [-10, 4]
  @property() blue = [10, -4]

  constructor() {
    super()

    this._canvas = document.createElement('canvas')
    this._canvas.width = 4
    this._canvas.height = this.sampleSize
    this._texture = new Texture2D(this._canvas)
    this._sizes = new Float32Array(this.slices)
    this._offsets = new Float32Array(this.slices)
  }

  redraw(): void {
    const size = this.sampleSize
    const texture = this._texture
    const ctx = this._canvas.getContext('2d') as CanvasRenderingContext2D
    ctx.clearRect(0, 0, 8, size)
    let offset
    let y = 0
    for (let i = 0; i < this.slices; i++) {
      offset = Math.floor(this._offsets[i] * 256)
      const height = this._sizes[i] * size
      const red = offset > 0 ? offset : 0
      const green = offset < 0 ? -offset : 0
      ctx.fillStyle = `rgba(${red}, ${green}, 0, 1)`
      ctx.fillRect(0, y >> 0, size, height + 1 >> 0)
      y += height
    }
    texture.requestUpload()
  }

  override apply(renderer: WebGLRenderer, source: Viewport): void {
    if (!this._redraw) {
      this._redraw = true
      this.redraw()
    }

    const width = source.width
    const height = source.height
    const radians = this.direction * (Math.PI / 180)
    const sinDir = Math.sin(radians)
    const cosDir = Math.cos(radians)

    source.redraw(renderer, () => {
      this._texture.activate(renderer, 1)
      QuadUvGeometry.draw(renderer, GlitchEffect.material, {
        sampler: 0,
        filterClamp: [0, 0, 1, 1],
        filterArea: [width, height, 0, 0],
        dimensions: [width, height],
        aspect: height / width,
        displacementMap: 1,
        offset: this.offset,
        sinDir,
        cosDir,
        fillMode: this.fillMode,
        seed: this.seed,
        red: this.red,
        green: this.green,
        blue: this.blue,
      })
    })
  }
}
