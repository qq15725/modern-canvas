import { definePlugin } from '../plugin'

export const positionTransformPlugin = definePlugin(() => {
  return {
    name: 'canvas:position-transform',
    register(canvas) {
      canvas.registerProgram({
        name: 'canvas:position-transform',
        vertexBufferName: 'canvas:rectangle',
        vert: `attribute vec2 aPosition;
varying vec2 vTextureCoord;
uniform vec4 uTransform;
void main() {
  vTextureCoord = step(0.0, aPosition);
  vec2 position = aPosition;
  position *= uTransform.zw;
  position.y += (1.0 - uTransform.w) - (2.0 * uTransform.y);
  position.x += (2.0 * uTransform.x) - (1.0 - uTransform.z);
  gl_Position = vec4(position, 0, 1);
}`,
      })
    },
    draw(canvas, node) {
      const { width, height } = canvas

      canvas.useProgram({
        name: 'canvas:position-transform',
        uniforms: {
          uTransform: [
            (node.x ?? 0) / width,
            (node.y ?? 0) / height,
            node.w / width,
            node.h / height,
          ],
        },
      })
    },
  }
})
