import type { GlRenderingContext } from '../types'

let context: GlRenderingContext

export function getTestContext(): GlRenderingContext {
  if (!context || context?.isContextLost()) {
    const canvas = document.createElement('canvas')
    context = canvas.getContext('webgl', {}) as GlRenderingContext
  }
  return context
}
