import { definePlugin } from '../plugin'
import { Matrix3 } from '../utils'

export const Renderer2d = definePlugin({
  name: 'renderer2d',
  register(app) {
    // Shapes
    app.registerShape('rectangle', {
      type: '2d',
      mode: 'triangles',
      buffer: new Float32Array([
        -1, 1, -1, -1, 1, -1,
        1, -1, 1, 1, -1, 1,
      ]),
    })

    // Materials
    app.registerMaterial('material2d', {
      vertexShader: `attribute vec2 aPosition;
varying vec2 vTextureCoord;
uniform mat3 uModelMatrix;
void main() {
  vTextureCoord = step(0.0, aPosition);
  vec2 position = aPosition;
  gl_Position = vec4((uModelMatrix * vec3(position, 1)).xy, 0, 1);
}`,
      fragmentShader: `uniform sampler2D uSampler;
varying vec2 vTextureCoord;
void main() {
  gl_FragColor = texture2D(uSampler, vTextureCoord);
}`,
    })

    // Systems
    const context2d = document.createElement('canvas').getContext('2d')!
    app.registerSystem({
      update(time = 0) {
        const { textures } = app

        const nodes = app.query('type')

        for (let len = nodes.length, i = 0; i < len; i++) {
          const node = nodes[i]
          const { type } = node

          if (type === 'image' && node.src) {
            if (!textures.has(node.id)) {
              const img = new Image()
              img.src = node.src
              app.registerTexture(node.id, img)
            }
          } else if (type === 'video') {
            if (!textures.has(node.id)) {
              const video = document.createElement('video')
              video.playsInline = true
              video.muted = true
              video.loop = true
              video.src = node.src
              app.registerTexture(node.id, video)
            } else {
              const video = textures.get(node.id)?.source as HTMLVideoElement
              if (video.duration) {
                video.currentTime = time % video.duration
              }
            }
          } else if (type === 'text') {
            const {
              width = 100,
              height = 20,
              color = 'black',
              fontSize = 14,
              fontWeight = 900,
              direction = 'inherit',
              fontFamily = 'monospace',
              fontKerning = 'normal',
              textAlign = 'center',
              textBaseline = 'middle',
            } = node.style ?? {}

            if (!textures.has(node.id)) {
              context2d.canvas.width = width
              context2d.canvas.height = height
              context2d.fillStyle = color
              context2d.direction = direction
              context2d.font = `${ fontWeight } ${ fontSize }px ${ fontFamily }`
              context2d.fontKerning = fontKerning
              context2d.textAlign = textAlign
              context2d.textBaseline = textBaseline
              context2d.clearRect(0, 0, width, height)
              context2d.fillText(node.content, width / 2, height / 2)
              app.registerTexture(node.id, context2d.canvas)
            }
          }
        }
      },
    })

    app.registerSystem({
      update() {
        const {
          width: appWidth,
          height: appHeight,
          textures,
        } = app

        const nodes = app.query()

        for (let len = nodes.length, i = 0; i < len; i++) {
          const node = nodes[i]

          const {
            shape = 'rectangle',
            material = 'material2d',
            filters = [],
          } = node

          const {
            left = 0,
            top = 0,
            width = 0,
            height = 0,
            rotation = 0,
          } = node.style ?? {}

          const x = left / appWidth
          const y = top / appHeight
          const w = width / appWidth
          const h = height / appHeight
          const r = rotation / 180 * Math.PI

          app.renderNode({
            shape,
            material,
            uniforms: {
              uSampler: textures.get(node.id)?.value,
              uModelMatrix: Matrix3.identity()
                .multiply(Matrix3.translation((2 * x) - (1 - w), (1 - h) - (2 * y)))
                .multiply(Matrix3.scaling(w, h))
                .multiply(Matrix3.rotation(r)),
            },
            extraRenderers: filters?.map((filter: any) => {
              const {
                shape: filterShape,
                material: filterMaterial,
                type,
                ...uniforms
              } = filter

              return {
                shape: filterShape ?? shape,
                material: filterMaterial ?? type ?? material,
                uniforms,
              }
            }),
          })
        }
      },
    })
  },
})
