import type { WebGLRenderer } from '../../core'
import { property } from 'modern-idoc'
import { customNode } from '../../core'
import { Viewport } from './Viewport'

@customNode('Window')
export class Window extends Viewport {
  @property({ fallback: false }) declare msaa: boolean

  finish(renderer: WebGLRenderer): void {
    renderer.framebuffer.finishRenderPass(
      this._glFramebuffer(renderer),
    )
  }

  override flush(renderer: WebGLRenderer): void {
    this.finish(renderer)
    super.flush(renderer)
  }
}
