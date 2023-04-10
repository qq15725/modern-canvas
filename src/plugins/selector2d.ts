import { definePlugin } from '../plugin'
import { Matrix3 } from '../utils'

export const selector2dPlugin = definePlugin(() => {
  const mouse = { x: 0, y: 0 }

  return {
    name: 'canvas:selector2d',
    register(canvas) {
      const { view } = canvas

      view.addEventListener('mousemove', (e) => {
        const rect = view.getBoundingClientRect()
        mouse.x = e.clientX - rect.left
        mouse.y = e.clientY - rect.top
      })

      view.addEventListener('click', () => {
        const hovered = canvas.get('hovered')
        hovered && canvas.get('onSelect')?.(hovered)
      })

      canvas.registerNodeRenderer({
        name: 'selector2d',
        include: () => false,
        shape: 'rectangle',
        material: {
          vertexShader: `attribute vec2 aPosition;
varying vec2 vTextureCoord;
uniform mat3 uModelMatrix;
void main() {
  vTextureCoord = step(0.0, aPosition);
  vec2 position = aPosition;
  gl_Position = vec4((uModelMatrix * vec3(position, 1)).xy, 0, 1);
}`,
          fragmentShader: `uniform vec4 uColor;
void main() {
  gl_FragColor = uColor;
}`,
        },
        update: (node, id) => {
          const { width: canvasWidth, height: canvasHeight } = canvas
          let {
            x = 0,
            y = 0,
            width = canvasWidth,
            height = canvasHeight,
          } = node
          const {
            rotation = 0,
          } = node
          x = x / canvasWidth
          y = y / canvasHeight
          width = width / canvasWidth
          height = height / canvasHeight
          const radians = rotation / 180 * Math.PI
          return {
            uModelMatrix: Matrix3.identity()
              .multiply(Matrix3.translation((2 * x) - (1 - width), (1 - height) - (2 * y)))
              .multiply(Matrix3.scaling(width, height))
              .multiply(Matrix3.rotation(radians)),
            uColor: [((id >>> 16) & 255) / 255, ((id >>> 8) & 255) / 255, (id & 255) / 255, 1],
          }
        },
      })
    },
    beforeRender(canvas) {
      const { width, height, gl, children, nodeRenderers } = canvas
      let uid = 0
      const map: Record<number, number[]> = {}
      gl.bindFramebuffer(gl.FRAMEBUFFER, canvas.glFramebuffers[0].buffer)
      gl.viewport(0, 0, width, height)
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
      gl.enable(gl.DEPTH_TEST)
      canvas.forEachNode((node, currentPath) => {
        const id = uid++
        map[id] = currentPath
        nodeRenderers.get('selector2d')?.render(node, id)
      })
      const color = new Uint8Array(4)
      gl.readPixels(mouse.x, height - mouse.y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, color)
      const path = map[(color[0] << 16) + (color[1] << 8) + color[2]]
      if (canvas.get('hoveredPath')?.join('') === path?.join('')) return
      let node: any
      if (path) {
        node = { children }
        path.forEach(val => node = node.children?.[val])
      }
      canvas.set('hovered', node)
      canvas.set('hoveredPath', path)
      node && canvas.get('onHover')?.(node, path)
    },
  }
})
