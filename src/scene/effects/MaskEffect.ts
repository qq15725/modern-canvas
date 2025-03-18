import type { Node2D } from '../2d'
import type { PropertyDeclaration, WebGLRenderer } from '../../core'
import type { EffectContext, EffectProperties, Node, Viewport } from '../main'
import type { Texture2D } from '../resources'
import { assets } from '../../asset'
import { customNode, property, protectedProperty } from '../../core'
import { Effect } from '../main/Effect'
import { Material, QuadUvGeometry } from '../resources'

export interface MaskEffectProperties extends EffectProperties {
  src?: string
}

@customNode('MaskEffect')
export class MaskEffect extends Effect {
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
    vec4 maskColor = texture2D(mask, rotateUV(uv, rotation));
    gl_FragColor = mix(vec4(0.), color, maskColor.a);
  } else {
    gl_FragColor = vec4(0.);
  }
}`,
  })

  @protectedProperty() texture?: Texture2D<ImageBitmap>
  @property({ default: '' }) declare src: string

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

  protected override _updateProperty(key: PropertyKey, value: any, oldValue: any, declaration?: PropertyDeclaration): void {
    super._updateProperty(key, value, oldValue, declaration)

    switch (key) {
      case 'src':
        this.load()
        break
      case 'texture':
        oldValue?.free?.()
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
          rotation: (context.target as Node2D)?.globalRotation ?? 0,
        })
        renderer.texture.unbind(1)
      })
    }
  }
}
