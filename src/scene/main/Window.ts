import type { WebGLRenderer } from '../../core'
import { customNode } from '../../core'
import { Viewport } from './Viewport'

@customNode('Window', {
  processMode: 'always',
  renderMode: 'always',
})
export class Window extends Viewport {
  constructor() {
    super()

    this.renderTargets.forEach(r => r.isRoot = true)
  }

  finish(renderer: WebGLRenderer): void {
    renderer.renderTarget.finishRenderPass(this.renderTarget)
  }

  override flush(renderer: WebGLRenderer): void {
    super.flush(renderer)
    this.finish(renderer)
  }
}
