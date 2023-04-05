import { definePlugin } from '../plugin'

export const nodePlugin = definePlugin(() => {
  return {
    name: 'canvas:node',
    type: 'unknown',
    register(canvas) {
      canvas.registerProgram({
        name: 'canvas:node-render',
        mode: 'triangle',
        vertices: [
          -1, 1, -1, -1, 1, -1,
          1, -1, 1, 1, -1, 1,
        ],
        vert: `attribute vec2 aPosition;
uniform vec4 uTransform;
void main() {
  vec2 position = aPosition;
  position += uTransform.xy;
  position *= uTransform.zw;
  gl_Position = vec4(position, 0, 1);
}`,
        frag: `void main() {
  gl_FragColor = vec4(1, 1, 1, 1);
}`,
      })
    },
    render(canvas, node) {
      canvas.useProgram({
        name: 'canvas:node-render',
        uniforms: {
          uTransform: [node.x, node.y, node.w, node.h],
        },
      })
    },
  }
})
