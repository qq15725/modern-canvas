import type { WebGLRenderer } from '../../core'
import { customNode } from '../../core'
import { Viewport } from '../main'
import { Material, QuadUvGeometry, UvMaterial } from '../resources'
import { BlurEffect } from './BlurEffect'
import { Effect } from './Effect'

@customNode('ShadowEffect')
export class ShadowEffect extends Effect {
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
uniform float alpha;
uniform vec3 color;
uniform vec2 offset;

void main(void) {
  vec4 sample = texture2D(sampler, vUv - offset);
  sample.rgb = color.rgb * sample.a;
  sample *= alpha;
  gl_FragColor = sample;
}`,
  })

  blur = new BlurEffect()
  viewport3 = new Viewport()

  apply(renderer: WebGLRenderer, source: Viewport): void {
    this.viewport3.activateWithCopy(renderer, source)
    this.viewport3.redraw(renderer, () => {
      QuadUvGeometry.draw(renderer, ShadowEffect.material, {
        sampler: 0,
        offset: [0.001, 0.001],
        color: [0, 0, 0],
        alpha: 0.5,
      })
    })
    this.blur.apply(renderer, source)
    source.redraw(renderer, () => {
      this.viewport3.texture.activate(renderer, 1)
      QuadUvGeometry.draw(renderer, UvMaterial.instance, {
        sampler: 1,
      })
      QuadUvGeometry.draw(renderer, UvMaterial.instance, {
        sampler: 0,
      })
    })
  }
}
