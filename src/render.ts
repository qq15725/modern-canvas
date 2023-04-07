import type { Canvas } from './canvas'
import type { Node } from './types'

export function render(canvas: Canvas, time = 0) {
  const { gl, width, height, data, beforeRenderPlugins, afterRenderPlugins, renderPlugins } = canvas

  beforeRenderPlugins.forEach(plugin => plugin.beforeRender?.(canvas))
  gl.viewport(0, 0, width, height)
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
  renderNodes(data)
  afterRenderPlugins.forEach(plugin => plugin.afterRender?.(canvas))

  gl.flush()

  function renderNode(node: Node) {
    renderNodes(node.children ?? [])

    const plugins = renderPlugins.filter(plugin => {
      return (
        (!plugin.include && !plugin.exclude)
        || (plugin.include && plugin.include(node))
        || (plugin.exclude && !plugin.exclude(node))
      )
    })

    for (let len = plugins.length, i = 0; i < len; i++) {
      const plugin = plugins[i]
      let buffer: any = null
      if (i < len - 1) buffer = canvas.glDefaultFramebuffers[i % 2]
      gl.bindFramebuffer(gl.FRAMEBUFFER, buffer?.glFramebuffer ?? null)
      plugin.render?.(canvas, node, time)
      if (buffer) gl.bindTexture(gl.TEXTURE_2D, buffer.glTexture)
    }
  }

  function renderNodes(children: Node[]) {
    for (let i = children.length - 1; i >= 0; i--) {
      renderNode(children[i])
    }
  }
}

export function startRenderLoop(canvas: Canvas) {
  let then = 0
  let time = 0

  loopRender(0)

  function loopRender(now: number) {
    requestAnimationFrame(loopRender)
    render(canvas, time)
    now *= 0.001
    time += now - then
    then = now
  }
}
