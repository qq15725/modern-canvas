import type { Texture, Viewport } from '../core'
import type { WebGLRenderer } from '../renderer'
import type { EffectContext, EffectOptions } from './Effect'
import { assets } from '../asset'
import { customNode, Material, property, protectedProperty, QuadUvGeometry } from '../core'
import { Effect } from './Effect'

export interface MaskEffectOptions extends EffectOptions {
  src?: string
}

@customNode('MaskEffect')
export class MaskEffect extends Effect {
  @protectedProperty() texture?: Texture<ImageBitmap>

  @property({ default: '' }) declare src: string

  constructor(options?: MaskEffectOptions) {
    super()
    this.setProperties(options)
  }

  async load(): Promise<void> {
    this.texture = undefined
    if (this.src) {
      this.texture = await assets.texture.load(this.src)
    }
  }

  protected override _onUpdateProperty(key: PropertyKey, value: any, oldValue: any): void {
    super._onUpdateProperty(key, value, oldValue)

    switch (key) {
      case 'src':
        this.load()
        break
      case 'texture':
        oldValue?.destroy?.()
        break
    }
  }

  override apply(renderer: WebGLRenderer, source: Viewport, context: EffectContext): void {
    if (this.texture && context.targetArea) {
      source.redraw(renderer, () => {
        this.texture!.activate(renderer, 1)
        QuadUvGeometry.draw(renderer, MaskEffect.material, {
          sampler: 0,
          mask: 1,
          area: context.targetArea,
        })
        renderer.texture.unbind(1)
      })
    }
  }

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
uniform sampler2D mask;
uniform float area[4];

void main(void) {
  if (
    vUv.x > area[0]
    && vUv.x < (area[0] + area[2])
    && (1.0 - vUv.y) > area[1]
    && (1.0 - vUv.y) < (area[1] + area[3])
  ) {
    vec4 color = texture2D(sampler, vUv);
    vec2 uv = vec2(
      (vUv.x - area[0]) / area[2],
      ((1.0 - vUv.y) - area[1]) / area[3]
    );
    vec4 maskColor = texture2D(mask, uv);
    gl_FragColor = mix(vec4(0.), color, maskColor.a);
  } else {
    gl_FragColor = vec4(0.);
  }
}`,
  })
}
