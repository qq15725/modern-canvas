import type { WebGLRenderer } from '../../core'
import type { EffectProperties, Node, Viewport } from '../main'
import { property } from 'modern-idoc'
import { customNode } from '../../core'
import { Effect } from '../main/Effect'
import { Material, QuadUvGeometry } from '../resources'

export interface DrawboardEffectProperties extends EffectProperties {
  checkerboard?: boolean
  checkerboardScale?: number
  pixelGrid?: boolean
}

@customNode('DrawboardEffect')
export class DrawboardEffect extends Effect {
  static material = new Material({
    vert: `precision mediump float;
attribute vec2 position;
attribute vec2 uv;
uniform mat3 projectionMatrix;
uniform mat3 viewMatrix;
varying vec2 vUv;
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
  vUv = uv;
}`,
    frag: `varying vec2 vUv;
uniform sampler2D sampler;
uniform int checkerboard;
uniform float checkerboardScale;
uniform int pixelGrid;
uniform vec2 pixelGridSize;
uniform vec2 inputSize;
uniform vec2 zoom;
uniform vec2 translate;

vec4 renderCheckerboard(vec2 coord, vec4 color, vec2 scale) {
  vec2 fractValue = fract(coord * scale) - 0.5;
  float value = fractValue.x * fractValue.y < 0.0 ? 1.0 : 0.95;
  return vec4(value * (1.0 - color.a) + color.rgb, 1);
}

vec3 renderPixelGrid(vec2 coord, vec3 rgb, vec2 size) {
  vec2 corner = fract(coord);
  float gridWeight = max(float(corner.x < size.x), float(corner.y < size.y));
  vec3 gridColor;
  vec3 weights = vec3(0.299, 0.587, 0.114);
  float c2 = dot(rgb * rgb, weights);
  float luminance = sqrt(c2);
  if (luminance > 0.5) {
    float target = (luminance - 0.05) / luminance;
    gridColor = rgb * target;
  }
  else {
    float target = luminance * 0.8 + 0.15;
    float c1 = dot(rgb, weights);
    float a = 1.0 - 2.0 * c1 + c2;
    float b = c2 - c1;
    gridColor = mix(rgb, vec3(1), (b + sqrt(b * b - a * (c2 - target * target))) / a);
  }
  return mix(rgb, gridColor, gridWeight);
}

void main(void) {
  vec4 color = texture2D(sampler, vUv);
  vec2 coord = vec2(vUv.x, 1.0 - vUv.y);
  coord = (coord * inputSize - translate) / zoom;

  if (checkerboard > 0) {
    color = renderCheckerboard(coord, color, vec2(checkerboardScale) * zoom);
  }
  if (pixelGrid > 0) {
    color = vec4(
      renderPixelGrid(coord, color.rgb, pixelGridSize),
      color.a
    );
  }
  gl_FragColor = color;
}`,
  })

  @property({ fallback: false }) declare checkerboard: boolean
  @property({ fallback: 1 / 16 }) declare checkerboardScale: number
  @property({ fallback: false }) declare pixelGrid: boolean

  constructor(properties?: Partial<DrawboardEffectProperties>, children: Node[] = []) {
    super()

    this
      .setProperties(properties)
      .append(children)
  }

  override apply(renderer: WebGLRenderer, source: Viewport): void {
    source.redraw(renderer, () => {
      const viewMatrix = renderer.program.uniforms.viewMatrix
      QuadUvGeometry.draw(renderer, DrawboardEffect.material, {
        sampler: 0,
        inputSize: [source.width, source.height],
        zoom: [viewMatrix[0], viewMatrix[4]],
        translate: [viewMatrix[6], viewMatrix[7]],
        checkerboard: this.checkerboard ? 1 : 0,
        checkerboardScale: this.checkerboardScale,
        pixelGrid: this.pixelGrid ? 1 : 0,
        pixelGridSize: [
          viewMatrix[0] > 4
            ? Math.ceil(0.5 / viewMatrix[0] * 10000) / 10000
            : 0,
          viewMatrix[4] > 4
            ? Math.ceil(0.5 / viewMatrix[4] * 10000) / 10000
            : 0,
        ],
      })
    })
  }
}
