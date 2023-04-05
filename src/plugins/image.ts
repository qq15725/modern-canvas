import { definePlugin } from '../plugin'

export const imagePlugin = definePlugin(() => {
  return {
    name: 'canvas:image',
    type: 'image',
    register(canvas) {
      canvas.registerProgram({
        name: 'canvas:image-render',
        mode: 'triangle',
        vertices: [
          -1, 1, -1, -1, 1, -1,
          1, -1, 1, 1, -1, 1,
        ],
        vert: `attribute vec2 aPosition;
uniform vec4 uTransform;
varying vec2 vTextureCoord;
void main() {
  vTextureCoord = step(0.0, aPosition);
  vec2 position = aPosition;
  position += uTransform.xy;
  // position *= uTransform.zw;
  gl_Position = vec4(position, 0, 1);
}`,
        frag: `uniform sampler2D uSampler;
varying vec2 vTextureCoord;
void main() {
  gl_FragColor = texture2D(uSampler, vTextureCoord);
}`,
      })
    },
    async boot(canvas, node) {
      const source = await new Promise<HTMLImageElement>(resolve => {
        const img = new Image()
        img.src = node.url
        img.onload = () => resolve(img)
      })
      canvas.registerTexture({
        name: node.url,
        source,
      })
    },
    render(canvas, node) {
      canvas.useProgram({
        name: 'canvas:image-render',
        texture: node.url,
        uniforms: {
          uTransform: [node.x, node.y, node.w, node.h],
        },
      })
    },
  }
})
