import { definePlugin } from '../plugin'

export const nodeImagePlugin = definePlugin(() => {
  return {
    name: 'canvas:node-image',
    register(canvas) {
      canvas.registerNodeRenderer({
        name: 'image',
        include: node => Boolean(node.image),
        shape: 'rectangle',
        material: 'baseMaterial',
        update(node) {
          if (!canvas.resources.has(node.image)) {
            const img = new Image()
            img.src = node.image
            canvas.registerResource({
              name: node.image,
              data: img,
            })
          }
          return {
            uSampler: node.image,
          }
        },
      })
    },
  }
})
