import { definePlugin } from '../plugin'
import { Matrix3, createImage, createVideo, resolveColor } from '../utils'

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
uniform vec4 uBackgroundColor;
void main() {
  vec4 color = texture2D(uSampler, vTextureCoord);
  gl_FragColor = mix(uBackgroundColor, color, color.a);
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
              app.registerTexture(node.id, createImage(node.src))
            }
          } else if (type === 'video') {
            if (!textures.has(node.id)) {
              app.registerTexture(node.id, createVideo(node.src))
            } else {
              const video = textures.get(node.id)?.source as HTMLVideoElement
              if (video.duration) {
                video.currentTime = time % video.duration
              }
            }
          } else if (type === 'text') {
            const {
              width: userWidth,
              height: userHeight,
              color = 'black',
              fontSize = 14,
              fontWeight = 400,
              direction = 'inherit',
              fontFamily = 'monospace',
              fontKerning = 'normal',
              textAlign = 'center',
              textBaseline = 'middle',
            } = node.style ?? {}

            if (!textures.has(node.id)) {
              const font = `${ fontWeight } ${ fontSize }px ${ fontFamily }`
              context2d.font = font
              const result = context2d.measureText(node.content)
              const height = userHeight ?? result.actualBoundingBoxAscent + result.actualBoundingBoxDescent
              const width = userWidth ?? result.width
              node.style.width = width
              node.style.height = height
              context2d.canvas.width = width
              context2d.canvas.height = height
              context2d.fillStyle = color
              context2d.direction = direction
              context2d.font = font
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
            background,
          } = node.style ?? {}

          const x = left / appWidth
          const y = top / appHeight
          const w = width / appWidth
          const h = height / appHeight
          const r = rotation / 180 * Math.PI

          const backgroundColor = background?.color
            ? resolveColor(background.color)
            : [0, 0, 0, 0]

          app.renderNode({
            shape,
            material,
            uniforms: {
              uSampler: textures.get(node.id)?.value,
              uBackgroundColor: backgroundColor,
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
