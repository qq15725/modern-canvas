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
        update(node, time) {
          if (!canvas.resources.has(node.video)) {
            const video = document.createElement('video')
            video.playsInline = true
            video.muted = true
            video.loop = true
            video.src = node.video
            canvas.registerResource({
              name: node.video,
              source: video,
            })
          } else {
            const video = canvas.resources.get(node.video)?.source as HTMLVideoElement
            if (video.duration) {
              video.currentTime = time % video.duration
            }
          }
          return {
            uSampler: node.video,
          }
        },
      })
    },
  }
})
