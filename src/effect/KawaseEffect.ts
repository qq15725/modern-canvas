import type { Viewport } from '../core'
import type { WebGLRenderer } from '../renderer'
import { customNode, Material, QuadUvGeometry } from '../core'
import { Effect } from './Effect'

@customNode('KawaseEffect')
export class KawaseEffect extends Effect {
  static material = new Material({
    vert: `attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
  vUv = uv;
}`,
    frag: `precision highp float;
varying vec2 vUv;
uniform sampler2D sampler;
uniform vec2 offset;
uniform float progress;

void main(void) {
  vec2 offset1 = vec2(offset.x - progress * offset.x, offset.y - progress * offset.y);
  vec4 color = vec4(0.0);
  color += texture2D(sampler, vec2(vUv.x - offset1.x, vUv.y + offset1.y));
  color += texture2D(sampler, vec2(vUv.x + offset1.x, vUv.y + offset1.y));
  color += texture2D(sampler, vec2(vUv.x + offset1.x, vUv.y - offset1.y));
  color += texture2D(sampler, vec2(vUv.x - offset1.x, vUv.y - offset1.y));
  color *= 0.25;
  gl_FragColor = color;
}`,
  })

  blur = 10
  quality = 10

  override apply(renderer: WebGLRenderer, target: Viewport): void {
    const visibleProgress = this.visibleProgress
    let sampler: number
    let progress: number
    if (visibleProgress < 0.5) {
      sampler = 0
      progress = (0.5 - visibleProgress) / 0.5
    }
    else {
      sampler = 1
      progress = (visibleProgress - 0.5) / 0.5
    }

    const blur = this.blur
    const quality = this.quality
    const width = target.width
    const height = target.height

    const drawCalls: any[] = []
    const kernels = [blur]
    if (blur > 0) {
      let k = blur
      const step = blur / quality
      for (let i = 1; i < quality; i++) {
        k -= step
        kernels.push(k)
      }
    }
    const uvX = 1 / width
    const uvY = 1 / height
    const uOffset: number[] = []
    let offset: number
    const last = quality - 1
    for (let i = 0; i < last; i++) {
      offset = kernels[i] + 0.5
      uOffset[0] = offset * uvX
      uOffset[1] = offset * uvY
      drawCalls.push({
        offset: uOffset,
      })
    }
    offset = kernels[last] + 0.5
    uOffset[0] = offset * uvX
    uOffset[1] = offset * uvY
    drawCalls.push({
      offset: uOffset,
    })

    drawCalls.forEach((uniforms) => {
      QuadUvGeometry.draw(renderer, KawaseEffect.material, {
        sampler,
        progress,
        ...uniforms,
      })
    })
  }
}
