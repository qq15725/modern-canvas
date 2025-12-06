import type { Node2D } from '../2d'
import type { GlRenderer } from '../../core'
import type { EffectContext, EffectProperties, Node, Viewport } from '../main'
import type { Texture2D } from '../resources'
import { property } from 'modern-idoc'
import { assets } from '../../asset'
import { customNode } from '../../core'
import { Effect } from '../main/Effect'
import { Material, QuadUvGeometry } from '../resources'

export interface MaskEffectProperties extends EffectProperties {
  src?: string
}

@customNode('MaskEffect')
export class MaskEffect extends Effect {
  static material = new Material({
    gl: {
      vertex: `attribute vec2 position;
in vec2 uv;
out vec2 vUv;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
  vUv = uv;
}`,
      fragment: `in vec2 vUv;

uniform sampler2D sampler;
uniform sampler2D mask;
uniform float rotation;

vec2 rotateUV(vec2 uv, float angle) {
  uv -= 0.5;
  float cosAngle = cos(angle);
  float sinAngle = sin(angle);
  mat2 rotationMatrix = mat2(
    cosAngle, -sinAngle,
    sinAngle,  cosAngle
  );
  uv = rotationMatrix * uv;
  uv += 0.5;
  return uv;
}

void main(void) {
  vec4 color = texture(sampler, vUv);
  vec4 maskColor = texture(mask, rotateUV(vUv, rotation));
  gl_FragColor = mix(vec4(0.), color, maskColor.a);
}`,
    },
  })

  @property({ internal: true }) declare texture?: Texture2D<ImageBitmap>
  @property({ fallback: '' }) declare src: string

  constructor(properties?: Partial<MaskEffectProperties>, children: Node[] = []) {
    super()

    this
      .setProperties(properties)
      .append(children)
  }

  async load(): Promise<void> {
    this.texture = undefined
    if (this.src) {
      this.texture = await assets.texture.load(this.src)
    }
  }

  protected override _updateProperty(key: string, value: any, oldValue: any): void {
    super._updateProperty(key, value, oldValue)

    switch (key) {
      case 'src':
        this.load()
        break
      case 'texture':
        oldValue?.free?.()
        break
    }
  }

  override apply(renderer: GlRenderer, source: Viewport, context: EffectContext): void {
    if (this.texture) {
      source.redraw(renderer, () => {
        this.texture!.activate(renderer, 1)
        QuadUvGeometry.draw(renderer, MaskEffect.material, {
          sampler: 0,
          mask: 1,
          rotation: (context.target as Node2D)?.globalRotation ?? 0,
        })
        renderer.texture.unbind(1)
      })
    }
  }
}
