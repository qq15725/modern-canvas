import type { ColorValue, GlRenderer } from '../../core'
import type { EffectProperties, Node, Viewport } from '../main'
import { property } from 'modern-idoc'
import { Color, customNode } from '../../core'
import { Effect } from '../main/Effect'
import { Material, QuadUvGeometry } from '../resources'

export interface ColorOverlayEffectProperties extends EffectProperties {
  colors: ColorValue[]
  alpha: number
}

const MAX_COLORS = 50

@customNode('ColorOverlayEffect')
export class ColorOverlayEffect extends Effect {
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
      fragment: `precision mediump float;
uniform sampler2D sampler;
uniform vec4 colors[${MAX_COLORS}];
varying vec2 vUv;

float calcWidth() {
  return distance(vec2(0, 0), vec2(1, 0));
}

int calcCount() {
    int count = 0;
    for (int i = 0; i < ${MAX_COLORS}; i++) {
        if (colors[i] != vec4(0,0,0,0)){
            count++;
        }
    }
    return count;
}

vec4 calcColor(float x) {
  float perUnit = calcWidth() / float(calcCount());
  int index = int(x / perUnit);

  for(int i=0; i<${MAX_COLORS}; i++){
    if(i==index){
        return colors[i];
    }
  }

  return vec4(0, 0, 0, 0);
}

void main(void) {
  vec4 color = texture2D(sampler, vUv);
  vec4 mask = calcColor(vUv.x);
  gl_FragColor = vec4(mix(color.rgb, mask.rgb, color.a * mask.a), color.a);
}`,
    },
  })

  @property({ default: () => ([]) }) declare colors: ColorValue[]
  @property({ fallback: 0.5 }) declare alpha: number

  protected _color = new Color()

  constructor(properties?: Partial<ColorOverlayEffectProperties>, children: Node[] = []) {
    super()

    this
      .setProperties(properties)
      .append(children)
  }

  override apply(renderer: GlRenderer, source: Viewport): void {
    source.redraw(renderer, () => {
      const colors = this.colors.map((val) => {
        this._color.value = val
        const rgba = this._color.toArray()
        rgba[3] = this.alpha
        return rgba
      })

      while (colors.length < MAX_COLORS) {
        colors.push([0, 0, 0, 0])
      }

      QuadUvGeometry.draw(renderer, ColorOverlayEffect.material, {
        sampler: 0,
        colors: colors.slice(0, MAX_COLORS).flatMap(item => item),
      })
    })
  }
}
