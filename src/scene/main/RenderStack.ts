import type { GlRenderer } from '../../core'
import type { Node } from './Node'

export type Renderable = Node & {
  needsRender?: boolean
}

export interface RenderCall {
  renderable: Renderable
  fn: (renderer: GlRenderer, next: () => void) => void
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

  render(renderer: GlRenderer): void {
    this.calls.forEach(function render(call: RenderCall) {
      call.fn(renderer, () => {
        call.calls.forEach(render)
      })
    })
    this.calls = []
  }
}
