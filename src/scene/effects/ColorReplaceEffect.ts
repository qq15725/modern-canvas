import type { ColorValue, WebGLRenderer } from '../../core'
import type { EffectProperties, Node, Viewport } from '../main'
import { property } from 'modern-idoc'
import { Color, customNode } from '../../core'
import { Effect } from '../main/Effect'
import { Material, QuadUvGeometry } from '../resources'

const MAX_COLORS = 50

export interface ColorReplaceEffectProperties extends EffectProperties {
  colors: ColorValue[]
  epsilon: number
}

@customNode('ColorReplaceEffect')
export class ColorReplaceEffect extends Effect {
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
uniform float epsilon;
const int MAX_COLORS = ${MAX_COLORS};
uniform vec3 originalColors[MAX_COLORS];
uniform vec3 targetColors[MAX_COLORS];

void main(void) {
  gl_FragColor = texture2D(sampler, vUv);

  float alpha = gl_FragColor.a;
  if (alpha < 0.0001) {
    return;
  }

  vec3 color = gl_FragColor.rgb / alpha;

  for(int i = 0; i < MAX_COLORS; i++) {
    vec3 origColor = originalColors[i];
    if (origColor.r < 0.0) {
      break;
    }
    vec3 colorDiff = origColor - color;
    if (length(colorDiff) < epsilon) {
      vec3 targetColor = targetColors[i];
      gl_FragColor = vec4((targetColor + colorDiff) * alpha, alpha);
      return;
    }
  }
}`,
  })

  @property() declare colors: ColorValue[][] = []
  @property() declare epsilon: number = 0.05

  protected _color = new Color()

  constructor(properties?: Partial<ColorReplaceEffectProperties>, children: Node[] = []) {
    super()

    this
      .setProperties(properties)
      .append(children)
  }

  override apply(renderer: WebGLRenderer, source: Viewport): void {
    const colors = this.colors.map((val) => {
      this._color.value = val[0]
      const color0 = this._color.toArray().slice(0, 3)
      this._color.value = val[1]
      const color1 = this._color.toArray().slice(0, 3)
      return [
        color0,
        color1,
      ]
    })
    const epsilon = this.epsilon
    const originalColors = new Float32Array(MAX_COLORS * 3)
    const targetColors = new Float32Array(MAX_COLORS * 3)

    while (colors.length < MAX_COLORS) {
      colors.push([
        [-1, 0, 0],
        [0, 0, 0, 1],
      ])
    }

    colors.slice(0, MAX_COLORS).forEach(([originalColor, targetColor], i) => {
      originalColors[i * 3] = originalColor[0]
      originalColors[i * 3 + 1] = originalColor[1]
      originalColors[i * 3 + 2] = originalColor[2]
      targetColors[i * 3] = targetColor[0]
      targetColors[i * 3 + 1] = targetColor[1]
      targetColors[i * 3 + 2] = targetColor[2]
    })

    source.redraw(renderer, () => {
      QuadUvGeometry.draw(renderer, ColorReplaceEffect.material, {
        sampler: 0,
        epsilon,
        originalColors,
        targetColors,
      })
    })
  }
}
