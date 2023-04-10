import { definePlugin } from '../plugin'
import { Matrix3 } from '../utils'

export const transform2dPlugin = definePlugin(() => {
  return {
    name: 'canvas:transform2d',
    register(canvas) {
      canvas.registerNodeRenderer({
        name: 'transform2d',
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
          fragmentShader: `uniform sampler2D uSampler;
varying vec2 vTextureCoord;
void main() {
  gl_FragColor = texture2D(uSampler, vTextureCoord);
}`,
        },
        update: node => {
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
          }
        },
      })
    },
  }
})
