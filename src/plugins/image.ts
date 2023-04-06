import { definePlugin } from '../plugin'

export const imagePlugin = definePlugin(() => {
  return {
    name: 'canvas:image',
    include: node => node.type === 'image',
    register(canvas) {
      canvas.registerProgram({
        name: 'canvas:image',
        vertexBufferName: 'canvas:rectangle',
        frag: `uniform sampler2D uSampler;
varying vec2 vTextureCoord;
void main() {
  gl_FragColor = texture2D(uSampler, vTextureCoord);
}`,
      })
    },
    draw(canvas, node) {
      const { textures } = canvas

      if (!textures.has(node.url)) {
        const source = new Image()
        source.src = node.url
        canvas.registerTexture({
          name: node.url,
          source,
        })
      }

      canvas.useProgram({
        name: 'canvas:image',
        textureName: node.url,
      })
    },
  }
})
