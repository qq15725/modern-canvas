import type { Canvas } from './canvas'
import type { Node } from './types'

export function draw(canvas: Canvas, time: number) {
  const { gl, children, plugins } = canvas

  function render(node: Node) {
    const usePlugins = plugins.get(node.type)

    if (usePlugins) {
      for (let len = usePlugins.length, i = 0; i < len; i++) {
        usePlugins[i].render?.(canvas, node, time)
      }
    }

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
