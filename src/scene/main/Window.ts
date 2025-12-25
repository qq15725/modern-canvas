import type { GlRenderer } from '../../core'
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

  finish(renderer: GlRenderer): void {
    renderer.renderTarget.finishRenderPass(this.renderTarget)
  }

  override flush(renderer: GlRenderer): void {
    this.finish(renderer)
    super.flush(renderer)
  }
}
