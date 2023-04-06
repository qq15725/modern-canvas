import { definePlugin } from '../plugin'
import { Matrix3 } from '../matrix3'

export const transformPlugin = definePlugin(() => {
  return {
    name: 'canvas:transform',
    register(canvas) {
      canvas.registerProgram({
        name: 'canvas:transform',
        vertexBufferName: 'canvas:rectangle',
        vert: `attribute vec2 aPosition;
varying vec2 vTextureCoord;
uniform mat3 uLocalMatrix;
void main() {
  vTextureCoord = step(0.0, aPosition);
  vec2 position = aPosition;
  gl_Position = vec4((uLocalMatrix * vec3(position, 1)).xy, 0, 1);
}`,
      })
    },
    draw(canvas, node) {
      const { width, height } = canvas

      const x = node.x / width
      const y = node.y / height
      const w = node.w / width
      const h = node.h / height
      const radians = (node.rotation ?? 0) / 180 * Math.PI

      canvas.useProgram({
        name: 'canvas:transform',
        uniforms: {
          uLocalMatrix: Matrix3.identity()
            .multiply(Matrix3.translation((2 * x) - (1 - w), (1 - h) - (2 * y)))
            .multiply(Matrix3.scaling(w, h))
            .multiply(Matrix3.rotation(radians)),
        },
      })
    },
  }
})
