import { definePlugin } from '../plugin'

export const basePlugin = definePlugin(() => {
  return {
    name: 'canvas:base',
    register(canvas) {
      canvas.registerShape({
        name: 'rectangle',
        type: '2d',
        mode: 'triangles',
        data: new Float32Array([
          -1, 1, -1, -1, 1, -1,
          1, -1, 1, 1, -1, 1,
        ]),
      })

      canvas.registerMaterial({
        name: 'baseMaterial',
        vertexShader: `attribute vec2 aPosition;
varying vec2 vTextureCoord;
void main() {
  vTextureCoord = step(0.0, aPosition);
  gl_Position = vec4(aPosition, 0, 1);
}`,
        fragmentShader: `uniform sampler2D uSampler;
varying vec2 vTextureCoord;
void main() {
  gl_FragColor = texture2D(uSampler, vTextureCoord);
}`,
      })
    },
  }
})

