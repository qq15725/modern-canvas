import { definePlugin } from '../plugin'
import { Matrix3 } from '../utils'
import type { Node } from '../types'

export const selector2dPlugin = definePlugin(() => {
  const mouse = { x: 0, y: 0 }
  let path: number[] | undefined
  return {
    name: 'canvas:selector2d',
    register(canvas) {
      const { view } = canvas
      view.addEventListener('mousemove', (e) => {
        const rect = view.getBoundingClientRect()
        mouse.x = e.clientX - rect.left
        mouse.y = e.clientY - rect.top
      })
      canvas.registerMaterial({
        name: 'selector2d',
        vertexShader: `attribute vec2 aPosition;
varying vec2 vTextureCoord;
uniform mat3 uLocalMatrix;
void main() {
  vTextureCoord = step(0.0, aPosition);
  vec2 position = aPosition;
  gl_Position = vec4((uLocalMatrix * vec3(position, 1)).xy, 0, 1);
}`,
        fragmentShader: `uniform vec4 uColor;
void main() {
  gl_FragColor = uColor;
}`,
      })
    },
    beforeRender(canvas) {
      // TODO
      const { width, height, gl, data } = canvas
      let uid = 0
      const map: Record<number, number[]> = {}

      gl.viewport(0, 0, width, height)
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
      gl.bindFramebuffer(gl.FRAMEBUFFER, canvas.glDefaultFramebuffers[0].glFramebuffer)
      renderNodes(data, [])
      const color = new Uint8Array(4)
      gl.readPixels(mouse.x, height - mouse.y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, color)
      const id = (color[0] << 16) + (color[1] << 8) + color[2]
      path = map[id]

      function renderNode(node: Node, indexes: number[]) {
        renderNodes(node.children ?? [], indexes)
        gl.bindTexture(gl.TEXTURE_2D, canvas.glDefaultTexture)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, Uint8Array.from([0, 0, 0, 1]))
        const id = ++uid
        map[id] = indexes
        const x = node.x / width
        const y = node.y / height
        const w = node.w / width
        const h = node.h / height
        const radians = (node.rotation ?? 0) / 180 * Math.PI
        canvas?.renderNode({
          shape: 'rectangle',
          material: 'selector2d',
          uniforms: {
            uLocalMatrix: Matrix3.identity()
              .multiply(Matrix3.translation((2 * x) - (1 - w), (1 - h) - (2 * y)))
              .multiply(Matrix3.scaling(w, h))
              .multiply(Matrix3.rotation(radians)),
            uColor: [((id >>> 16) & 255) / 255, ((id >>> 8) & 255) / 255, (id & 255) / 255, 1],
          },
        })
      }
      function renderNodes(children: Node[], indexes: number[]) {
        for (let i = children.length - 1; i >= 0; i--) {
          renderNode(children[i], [...indexes, i])
        }
      }
    },
    afterRender(canvas) {
      // TODO
      const { data } = canvas
      if (path) {
        let node: any = { children: data }
        path.forEach(val => {
          node = node.children?.[val]
        })
      }
    },
  }
})
