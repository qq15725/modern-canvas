import { definePlugin } from '../plugin'

export const nodeTextPlugin = definePlugin(() => {
  const context2d = document.createElement('canvas').getContext('2d')!

  return {
    name: 'canvas:node-text',
    register(canvas) {
      canvas.registerNodeRenderer({
        name: 'text',
        include: node => Boolean(node.text),
        shape: 'rectangle',
        material: 'textureMaterial',
        update(node) {
          const {
            width = 100,
            height = 20,
            text,
            color = 'black',
            fontSize = '14',
          } = node
          if (!canvas.resources.has(text)) {
            context2d.canvas.width = width
            context2d.canvas.height = height
            context2d.font = `${ fontSize }px monospace`
            context2d.textAlign = 'center'
            context2d.textBaseline = 'middle'
            context2d.fillStyle = color
            context2d.clearRect(0, 0, width, height)
            context2d.fillText(text, width / 2, height / 2)
            canvas.registerResource({
              name: text,
              source: context2d.canvas,
            })
          }
          return {
            uSampler: node.text,
          }
        },
      })
    },
  }
})
