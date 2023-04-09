import { definePlugin } from '../plugin'

export const node2dImagePlugin = definePlugin(() => {
  return {
    name: 'canvas:node2d-image',
    include: node => node.type === 'image',
    register(canvas) {
      canvas.registerMaterial({
        name: 'node2d:image',
        fragmentShader: `uniform sampler2D uSampler;
varying vec2 vTextureCoord;
void main() {
  gl_FragColor = texture2D(uSampler, vTextureCoord);
}`,
      })
    },
    render(canvas, node) {
      const { textures } = canvas

      if (!textures.has(node.url)) {
        const source = new Image()
        source.src = node.url
        canvas.registerTexture({
          name: node.url,
          source,
        })
      }

      canvas.renderNode({
        shape: 'rectangle',
        material: 'node2d:image',
        uniforms: {
          uSampler: node.url,
        },
      })
    },
  }
})
