import { definePlugin } from '../plugin'

export const imagePlugin = definePlugin(() => {
  return {
    name: 'canvas:image',
    type: 'image',
    register(canvas) {
      canvas.registerProgram({
        name: 'canvas:image-render',
        drawMode: 'triangles',
        vertexBufferName: 'canvas:rectangle',
        vert: `attribute vec2 aPosition;
varying vec2 vTextureCoord;
void main() {
  vTextureCoord = step(0.0, aPosition);
  gl_Position = vec4(aPosition, 0, 1);
}`,
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
        name: 'canvas:image-render',
        textureName: node.url,
      })
    },
  }
})
