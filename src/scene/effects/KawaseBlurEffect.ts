import type { PropertyDeclaration, WebGLRenderer } from '../../core'
import type { EffectProperties, Node, Viewport } from '../main'
import { customNode, property } from '../../core'
import { Effect } from '../main'
import { Material, QuadUvGeometry } from '../resources'

export interface KawaseBlurFilterProperties extends EffectProperties {
  strength?: number
  quality?: number
  pixelSize?: [number, number]
  clamp?: boolean
}

export const frag = `varying vec2 vUv;
uniform sampler2D sampler;
uniform vec2 uOffset;

void main(void) {
    vec4 color = vec4(0.0);
    color += texture2D(sampler, vec2(vUv.x - uOffset.x, vUv.y + uOffset.y));
    color += texture2D(sampler, vec2(vUv.x + uOffset.x, vUv.y + uOffset.y));
    color += texture2D(sampler, vec2(vUv.x + uOffset.x, vUv.y - uOffset.y));
    color += texture2D(sampler, vec2(vUv.x - uOffset.x, vUv.y - uOffset.y));
    color *= 0.25;
    gl_FragColor = color;
}`

export const clampFrag = `precision highp float;
varying vec2 vUv;
uniform sampler2D sampler;
uniform vec2 uOffset;
uniform vec4 uInputClamp;
void main(void) {
    vec4 color = vec4(0.0);
    color += texture2D(sampler, clamp(vec2(vUv.x - uOffset.x, vUv.y + uOffset.y), uInputClamp.xy, uInputClamp.zw));
    color += texture2D(sampler, clamp(vec2(vUv.x + uOffset.x, vUv.y + uOffset.y), uInputClamp.xy, uInputClamp.zw));
    color += texture2D(sampler, clamp(vec2(vUv.x + uOffset.x, vUv.y - uOffset.y), uInputClamp.xy, uInputClamp.zw));
    color += texture2D(sampler, clamp(vec2(vUv.x - uOffset.x, vUv.y - uOffset.y), uInputClamp.xy, uInputClamp.zw));
    color *= 0.25;
    gl_FragColor = color;
}`

@customNode('KawaseBlurEffect')
export class KawaseBlurEffect extends Effect {
  material: Material
  @property({ default: 4 }) declare strength: number
  @property({ default: 3 }) declare quality: number
  @property({ default: [1, 1] }) declare pixelSize: [number, number]

  protected _kernels: number[] = [0]

  constructor(properties?: Partial<KawaseBlurFilterProperties>, children: Node[] = []) {
    super()

    this.material = new Material({
      vert: `precision mediump float;
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
  vUv = uv;
}`,
      frag: properties?.clamp ? clampFrag : frag,
    })

    this
      .setProperties(properties)
      .append(children)

    this._generateKernels()
  }

  protected override _updateProperty(key: PropertyKey, value: any, oldValue: any, declaration?: PropertyDeclaration): void {
    super._updateProperty(key, value, oldValue, declaration)

    switch (key) {
      case 'quality':
      case 'strength':
        this._generateKernels()
        break
    }
  }

  /** Auto generate kernels by blur & quality */
  protected _generateKernels(): void {
    const blur = Math.max(1, Math.round(this.strength))
    const quality = Math.max(1, Math.round(this.quality))
    const kernels: number[] = [blur]
    if (blur > 0) {
      let k = blur
      const step = blur / quality
      for (let i = 1; i < quality; i++) {
        k -= step
        kernels.push(k)
      }
    }
    this._kernels = kernels
  }

  override apply(renderer: WebGLRenderer, source: Viewport): void {
    const uvX = this.pixelSize[0] / source.width
    const uvY = this.pixelSize[1] / source.height
    let offset: number
    if (this.quality === 1 || this.strength === 0) {
      offset = this._kernels[0] + 0.5
      source.redraw(renderer, () => {
        QuadUvGeometry.draw(renderer, this.material, {
          sampler: 0,
          uOffset: [
            offset * uvX,
            offset * uvY,
          ],
          uInputClamp: [0, 0, 1, 1],
        })
      })
    }
    else {
      const last = this.quality - 1
      for (let i = 0; i < last; i++) {
        offset = this._kernels[i] + 0.5
        source.redraw(renderer, () => {
          QuadUvGeometry.draw(renderer, this.material, {
            sampler: 0,
            uOffset: [
              offset * uvX,
              offset * uvY,
            ],
            uInputClamp: [0, 0, 1, 1],
          })
        })
      }
      offset = this._kernels[last] + 0.5
      QuadUvGeometry.draw(renderer, this.material, {
        sampler: 0,
        uOffset: [
          offset * uvX,
          offset * uvY,
        ],
        uInputClamp: [0, 0, 1, 1],
      })
    }
  }
}
