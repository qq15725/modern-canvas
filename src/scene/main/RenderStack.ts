import type { WebGLRenderer } from '../../core'
import type { Node } from './Node'

export type Renderable = Node & {
  needsRender?: boolean
}

export interface RenderCall {
  renderable: Renderable
  fn: (renderer: WebGLRenderer, next: () => void) => void
  parentCall: RenderCall | undefined
  calls: RenderCall[]
}

export class RenderStack {
  currentCall?: RenderCall
  calls: RenderCall[] = []

  createCall(renderable: Renderable): RenderCall {
    return {
      renderable,
      parentCall: this.currentCall,
      fn: renderable.render.bind(renderable),
      calls: [],
    }
  }

  push(renderable: Renderable): RenderCall {
    const call = this.createCall(renderable)
    ;(this.currentCall?.calls ?? this.calls).push(call)
    return call
  }

  /**
   * Discard any queued calls without rendering them. The stack is a per-process
   * transient: it must start empty on every `_process` pass. Without this, a
   * `_process` that is not followed by a `render` (e.g. the export pipeline's
   * `waitUntilProcessed`, which processes then only awaits a tick) leaves its
   * calls behind; the next `_process` appends to them, the scene ends up queued
   * twice, and stateful effects (which flip `needsRender`/ping-pong viewports
   * during the first pass) render the second pass wrong — e.g. a masked element
   * drawn unmasked on export.
   */
  reset(): void {
    this.calls = []
    this.currentCall = undefined
  }

  render(renderer: WebGLRenderer): void {
    this.calls.forEach(function render(call: RenderCall) {
      call.fn(renderer, () => {
        call.calls.forEach(render)
      })
    })
    this.reset()
  }
}
