import type { ColorValue, WebGLRenderer } from '../../core'
import type { EffectProperties, Viewport } from '../main'
import { Color, customNode, property } from '../../core'
import { Effect } from '../main'
import { Material, QuadUvGeometry } from '../resources'

export interface OutlineEffectProperties extends EffectProperties {
  thickness?: number
  color?: ColorValue
  alpha?: number
  quality?: number
  knockout?: boolean
}

const frag = `precision highp float;
varying vec2 vUv;
uniform sampler2D sampler;
uniform vec2 uThickness;
uniform vec3 uColor;
uniform float uAlpha;
uniform float uKnockout;
uniform vec4 uInputClamp;

const float DOUBLE_PI = 2. * 3.14159265358979323846264;
const float ANGLE_STEP = {ANGLE_STEP};

float outlineMaxAlphaAtPos(vec2 pos) {
    if (uThickness.x == 0. || uThickness.y == 0.) {
        return 0.;
    }
    vec4 displacedColor;
    vec2 displacedPos;
    float maxAlpha = 0.;
    for (float angle = 0.; angle <= DOUBLE_PI; angle += ANGLE_STEP) {
        displacedPos.x = vUv.x + uThickness.x * cos(angle);
        displacedPos.y = vUv.y + uThickness.y * sin(angle);
        displacedColor = texture2D(sampler, clamp(displacedPos, uInputClamp.xy, uInputClamp.zw));
        maxAlpha = max(maxAlpha, displacedColor.a);
    }
    return maxAlpha;
}

void main(void) {
    vec4 sourceColor = texture2D(sampler, vUv);
    vec4 contentColor = sourceColor * float(uKnockout < 0.5);
    float outlineAlpha = uAlpha * outlineMaxAlphaAtPos(vUv.xy) * (1.-sourceColor.a);
    vec4 outlineColor = vec4(vec3(uColor) * outlineAlpha, outlineAlpha);
    gl_FragColor = contentColor + outlineColor;
}`

@customNode('OutlineEffect')
export class OutlineEffect extends Effect {
  material: Material

  static MIN_SAMPLES = 1
  static MAX_SAMPLES = 100

  static getAngleStep(quality: number): number {
    return Number.parseFloat(
      ((Math.PI * 2) / Math.max(
        quality * OutlineEffect.MAX_SAMPLES,
        OutlineEffect.MIN_SAMPLES,
      )).toFixed(7),
    )
  }

  @property({ default: 1 }) declare thickness: number
  @property({ default: 0x000000 }) declare color: ColorValue
  @property({ default: 1 }) declare alpha: number
  @property({ default: 0.1 }) declare quality: number
  @property({ default: false }) declare knockout: boolean

  protected _color = new Color()

  constructor(properties?: Partial<OutlineEffectProperties>) {
    super()
    this.setProperties(properties)

    this.material = new Material({
      vert: `precision mediump float;
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
  vUv = uv;
}`,
      frag: frag.replace(
        /\{ANGLE_STEP\}/,
        OutlineEffect.getAngleStep(this.quality).toFixed(7),
      ),
    })
  }

  override apply(renderer: WebGLRenderer, source: Viewport): void {
    source.redraw(renderer, () => {
      this._color.value = this.color

      QuadUvGeometry.draw(renderer, this.material, {
        sampler: 0,
        uThickness: [
          this.thickness / source.width,
          this.thickness / source.height,
        ],
        uColor: this._color.toArray().slice(0, 3),
        uAlpha: this.alpha,
        uAngleStep: OutlineEffect.getAngleStep(this.quality),
        uKnockout: this.knockout ? 1 : 0,
        uInputClamp: [0, 0, 1, 1],
      })
    })
  }
}
