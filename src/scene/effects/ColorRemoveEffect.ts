import type { ColorValue, GlRenderer } from '../../core'
import type { EffectProperties, Node, Viewport } from '../main'
import { property } from 'modern-idoc'
import { Color, customNode } from '../../core'
import { Effect } from '../main/Effect'
import { Material, QuadUvGeometry } from '../resources'

export interface ColorRemoveEffectProperties extends EffectProperties {
  colors: ColorValue[]
  epsilon: number
}

@customNode('ColorRemoveEffect')
export class ColorRemoveEffect extends Effect {
  static material = new Material({
    gl: {
      vertex: `precision mediump float;
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
  vUv = uv;
}`,
      fragment: `varying vec2 vUv;
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
    },
  })

  @property({ default: () => ([]) }) declare colors: ColorValue[]
  @property({ fallback: 0.5 }) declare epsilon: number

  protected _color = new Color()

  constructor(properties?: Partial<ColorRemoveEffectProperties>, children: Node[] = []) {
    super()

    this
      .setProperties(properties)
      .append(children)
  }

  override apply(renderer: GlRenderer, source: Viewport): void {
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
