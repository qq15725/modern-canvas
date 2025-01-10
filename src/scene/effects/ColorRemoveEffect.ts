import type { ColorValue, WebGLRenderer } from '../../core'
import type { Viewport } from '../main'
import { Color, customNode, property } from '../../core'
import { Material, QuadUvGeometry } from '../resources'
import { Effect } from './Effect'

@customNode('ColorRemoveEffect')
export class ColorRemoveEffect extends Effect {
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
const int MAX_COLORS = 50;
uniform vec3 originalColors[MAX_COLORS];

void main(void) {
  vec4 color = texture2D(sampler, vUv);

  for (int i = 0; i < MAX_COLORS; i++) {
    vec3 origColor = originalColors[i];
    if (origColor.r < 0.0) {
      break;
    }
    vec3 colorDiff = origColor - color.rgb;
    if (length(colorDiff) < epsilon) {
      gl_FragColor = vec4(0, 0, 0, 0);
      return;
    }
  }

  gl_FragColor = color;
}`,
  })

  @property() colors: ColorValue[] = []
  @property() epsilon = 0.5

  protected _color = new Color()

  override apply(renderer: WebGLRenderer, source: Viewport): void {
    const maxColors = 50
    const originalColors = new Float32Array(maxColors * 3)
    const colors = this.colors.map((val) => {
      this._color.value = val
      return this._color.toArray().slice(0, 3)
    })

    while (colors.length < maxColors) {
      colors.push([-1, 0, 0])
    }

    colors.slice(0, maxColors).forEach((originalColor, i) => {
      originalColors[i * 3] = originalColor[0]
      originalColors[i * 3 + 1] = originalColor[1]
      originalColors[i * 3 + 2] = originalColor[2]
    })

    source.redraw(renderer, () => {
      QuadUvGeometry.draw(renderer, ColorRemoveEffect.material, {
        sampler: 0,
        epsilon: this.epsilon,
        originalColors,
      })
    })
  }
}
