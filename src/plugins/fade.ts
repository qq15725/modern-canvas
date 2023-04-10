import { definePlugin } from '../plugin'

export const fadePlugin = definePlugin(() => {
  return {
    name: 'canvas:fade',
    register(canvas) {
      canvas.registerNodeRenderer({
        name: 'fade',
        include: node => Boolean(node.fade),
        shape: 'rectangle',
        material: {
          vertexShader: `attribute vec2 aPosition;
varying vec2 vTextureCoord;
void main() {
  vTextureCoord = step(0.0, aPosition);
  gl_Position = vec4(aPosition, 0, 1);
}`,
          fragmentShader: `uniform sampler2D uSampler;
varying vec2 vTextureCoord;
uniform float uTime;
float linear(float time, float offset, float change, float duration) {
  return change * (time / duration) + offset;
}
void main(void) {
  vec4 color = texture2D(uSampler, vTextureCoord);
  gl_FragColor = vec4(color.rgb, linear(uTime, 0.0, 1.0, 3.0));
}`,
        },
        update: (node, time) => {
          return {
            uTime: time,
          }
        },
      })
    },
  }
})

