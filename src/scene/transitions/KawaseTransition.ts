import type { WebGLRenderer } from '../../core'
import type { Viewport } from '../main'
import { customNode } from '../../core'
import { Transition } from '../main/Transition'
import { Material, QuadUvGeometry } from '../resources'

@customNode('KawaseTransition')
export class KawaseTransition extends Transition {
  blur = 10
  quality = 10

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

  override apply(renderer: WebGLRenderer, target: Viewport): void {
    const currentTimeProgress = this.currentTimeProgress
    let sampler: number
    let progress: number
    if (currentTimeProgress < 0.5) {
      sampler = 0
      progress = (0.5 - currentTimeProgress) / 0.5
    }
    else {
      sampler = 1
      progress = (currentTimeProgress - 0.5) / 0.5
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
      QuadUvGeometry.draw(renderer, KawaseTransition.material, {
        sampler,
        progress,
        ...uniforms,
      })
    })
  }
}
