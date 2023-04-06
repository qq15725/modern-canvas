import type { Canvas } from './canvas'
import type { Node } from './types'

export function draw(canvas: Canvas, time: number) {
  const { gl, width, height, children, plugins } = canvas

  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
  gl.viewport(0, 0, width, height)
  gl.clearColor(1, 1, 1, 1)
  gl.clearDepth(1)
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
  // gl.enable(gl.DEPTH_TEST)

  function render(node: Node) {
    const usePlugins = plugins.get(node.type)

    if (usePlugins) {
      for (let len = usePlugins.length, i = 0; i < len; i++) {
        const buffer = canvas.glDefaultFramebuffers[i % 2]
        gl.bindFramebuffer(gl.FRAMEBUFFER, buffer.glFramebuffer)
        usePlugins[i].draw?.(canvas, node, time)
        gl.bindTexture(gl.TEXTURE_2D, buffer.glTexture)
      }
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    canvas.useProgram({
      name: 'canvas:node-render',
      uniforms: {
        uTransform: [
          (node.x ?? 0) / width,
          (node.y ?? 0) / height,
          node.w / width,
          node.h / height,
        ],
      },
    })

    const { children } = node

    if (!children) return

    for (let len = children.length, i = 0; i < len; i++) {
      render(children[i])
    }
  }

  for (let len = children.length, i = 0; i < len; i++) {
    render(children[i])
  }

  gl.flush()
}
