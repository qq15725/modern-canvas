import { definePlugin } from '../plugin'

export const nodeVideoPlugin = definePlugin(() => {
  return {
    name: 'canvas:node-video',
    register(canvas) {
      canvas.registerNodeRenderer({
        name: 'video',
        include: node => Boolean(node.video),
        shape: 'rectangle',
        material: 'textureMaterial',
        update(node) {
          if (!canvas.resources.has(node.video)) {
            const video = document.createElement('video')
            video.playsInline = true
            video.muted = true
            video.loop = true
            video.src = node.video
            video.play()
            canvas.registerResource({
              name: node.video,
              data: video,
            })
          }
          return {
            uSampler: node.video,
          }
        },
      })
    },
  }
})
