import type { Canvas } from './canvas'
import type { Node } from './types'

export function draw(canvas: Canvas, time: number) {
  const { gl, width, height, children, plugins } = canvas

  const drawablePlugins = plugins.filter(plugin => plugin.draw)

  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
  gl.viewport(0, 0, width, height)
  gl.clearColor(1, 1, 1, 1)
  gl.clearDepth(1)
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
  // gl.enable(gl.DEPTH_TEST)

  function drawNode(node: Node) {
    const used = drawablePlugins.filter(plugin => {
      return (
        (!plugin.include && !plugin.exclude)
        || (plugin.include && plugin.include(node))
        || (plugin.exclude && !plugin.exclude(node))
      )
    })

    for (let len = used.length, i = 0; i < len; i++) {
      const last = i === len - 1
      const buffer = canvas.glDefaultFramebuffers[i % 2]
      if (last) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      } else {
        gl.bindFramebuffer(gl.FRAMEBUFFER, buffer.glFramebuffer)
      }
      used[i].draw?.(canvas, node, time)
      if (!last) {
        gl.bindTexture(gl.TEXTURE_2D, buffer.glTexture)
      }
    }

    const { children } = node
    if (children) {
      for (let len = children.length, i = 0; i < len; i++) {
        drawNode(children[i])
      }
    }
  }

  for (let len = children.length, i = 0; i < len; i++) {
    drawNode(children[i])
  }

  gl.flush()
}
