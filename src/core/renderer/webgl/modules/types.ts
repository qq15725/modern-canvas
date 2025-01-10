import type { WebGLRenderer } from '../WebGLRenderer'

export interface Renderable {
  render: (renderer: WebGLRenderer) => void
}
