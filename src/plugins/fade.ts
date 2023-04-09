import { definePlugin } from '../plugin'

export const fadePlugin = definePlugin(() => {
  return {
    name: 'canvas:fade',
    include: node => node.fade,
    register(canvas) {
      canvas.registerMaterial({
        name: 'fade',
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
      })
    },
    render(canvas, node, time) {
      canvas.renderNode({
        material: 'fade',
        shape: 'rectangle',
        uniforms: {
          uTime: time,
        },
      })
    },
  }
})

