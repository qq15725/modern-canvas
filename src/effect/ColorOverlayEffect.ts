import type { ColorValue } from '../color'
import type { Viewport } from '../core'
import type { WebGLRenderer } from '../renderer'
import { Color } from '../color'
import { customNode, Material, property, QuadUvGeometry } from '../core'
import { Effect } from './Effect'

const MAX_COLORS = 50

@customNode('ColorOverlayEffect')
export class ColorOverlayEffect extends Effect {
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
  })

  @property() colors: ColorValue[] = []
  @property() alpha = 0.5

  protected _color = new Color()

  override apply(renderer: WebGLRenderer, source: Viewport): void {
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
