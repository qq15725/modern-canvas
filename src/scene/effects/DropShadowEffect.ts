import type { ColorValue, WebGLRenderer } from '../../core'
import type { EffectProperties, Node } from '../main'
import { Color, customNode, property } from '../../core'
import { Viewport } from '../main'
import { Effect } from '../main/Effect'
import { Material, QuadUvGeometry, UvMaterial } from '../resources'
import { KawaseBlurEffect } from './KawaseBlurEffect'

export interface DropShadowEffectProperties extends EffectProperties {
  offset: [number, number]
  color: ColorValue
  alpha: number
  shadowOnly: boolean
  blur: number
  quality: number
  pixelSize: [number, number]
}

@customNode('DropShadowEffect')
export class DropShadowEffect extends Effect {
  static material = new Material({
    vert: `precision mediump float;
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
  vUv = uv;
}`,
    frag: `precision highp float;
varying vec2 vUv;
uniform sampler2D sampler;
uniform float uAlpha;
uniform vec3 uColor;
uniform vec2 uOffset;
uniform vec4 uInputSize;

void main(void) {
  vec4 sample = texture2D(sampler, vUv + uOffset * uInputSize.zw);
  sample.rgb = uColor.rgb * sample.a;
  sample *= uAlpha;
  gl_FragColor = sample;
}`,
  })

  @property({ default: [4, 4] }) declare offset: [number, number]
  @property({ default: 0x000000 }) declare color: ColorValue
  @property({ default: 1 }) declare alpha: number
  @property({ default: false }) declare shadowOnly: boolean
  @property({ default: 2 }) declare blur: number
  @property({ default: 4 }) declare quality: number
  @property({ default: [1, 1] }) declare pixelSize: [number, number]

  kawaseBlurEffect = new KawaseBlurEffect()
  viewport3 = new Viewport()

  protected _color = new Color()

  constructor(properties?: Partial<DropShadowEffectProperties>, children: Node[] = []) {
    super()

    this
      .setProperties(properties)
      .append(children)
  }

  apply(renderer: WebGLRenderer, source: Viewport): void {
    this.viewport3.activateWithCopy(renderer, source)

    this.viewport3.redraw(renderer, () => {
      this._color.value = this.color
      QuadUvGeometry.draw(renderer, DropShadowEffect.material, {
        sampler: 0,
        uAlpha: this.alpha,
        uColor: this._color.toArray().slice(0, 3),
        uOffset: [-this.offset[0], this.offset[1]],
        uInputSize: [source.width, source.height, 1 / source.width, 1 / source.height],
      })
    })

    this.kawaseBlurEffect.strength = this.blur
    this.kawaseBlurEffect.quality = this.quality
    this.kawaseBlurEffect.pixelSize = this.pixelSize
    this.kawaseBlurEffect.apply(renderer, this.viewport3)

    source.redraw(renderer, () => {
      this.viewport3.texture.activate(renderer, 1)
      QuadUvGeometry.draw(renderer, UvMaterial.instance, {
        sampler: 1,
      })
      if (!this.shadowOnly) {
        QuadUvGeometry.draw(renderer, UvMaterial.instance, {
          sampler: 0,
        })
      }
      renderer.texture.unbind(1)
    })
  }
}
