import { definePlugin } from '../plugin'

export const nodePlugin = definePlugin(() => {
  return {
    name: 'canvas:node',
    type: 'unknown',
    register(canvas) {
      canvas.registerBuffer({
        name: 'canvas:rectangle',
        target: 'arrayBuffer',
        value: new Float32Array([
          -1, 1, -1, -1, 1, -1,
          1, -1, 1, 1, -1, 1,
        ]),
      })

      canvas.registerProgram({
        name: 'canvas:node-render',
        drawMode: 'triangles',
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
        frag: `uniform sampler2D uSampler;
varying vec2 vTextureCoord;
void main() {
  gl_FragColor = texture2D(uSampler, vTextureCoord);
}`,
      })
    },
  }
})
