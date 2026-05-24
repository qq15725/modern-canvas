import type { GlRenderingContext } from '../types'
import { createHTMLCanvas } from '../../../shared'

let context: GlRenderingContext

export function getTestContext(): GlRenderingContext {
  if (!context || context?.isContextLost()) {
    const canvas = createHTMLCanvas()
    context = canvas?.getContext('webgl', {}) as GlRenderingContext
  }
  return context
}
