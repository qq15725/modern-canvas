import type { InternalNodeRenderer } from './node-renderer'
import type { Canvas } from './canvas'

export function render(canvas: Canvas, time = 0) {
  const {
    gl,
    width,
    height,
    beforeRenderPlugins,
    afterRenderPlugins,
    nodeRenderers,
    forEachNode,
  } = canvas

  const allRenderers = Array.from(nodeRenderers.values()) as InternalNodeRenderer[]

  beforeRenderPlugins.forEach(plugin => plugin.beforeRender?.(canvas))

  gl.viewport(0, 0, width, height)
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

  forEachNode(node => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.bindTexture(gl.TEXTURE_2D, null)

    const renderers = allRenderers.filter(renderer => {
      return (
        (!renderer.include && !renderer.exclude)
        || (renderer.include && renderer.include(node))
        || (renderer.exclude && !renderer.exclude(node))
      )
    })

    for (let len = renderers.length, i = 0; i < len; i++) {
      let framebuffer: any = null
      if (i < len - 1) framebuffer = canvas.glFramebuffers[i % 2]
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer?.buffer ?? null)
      framebuffer && gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
      renderers[i].render(node, time)
      framebuffer && gl.bindTexture(gl.TEXTURE_2D, framebuffer.texture)
    }
  })

  afterRenderPlugins.forEach(plugin => plugin.afterRender?.(canvas))

  gl.flush()
}
