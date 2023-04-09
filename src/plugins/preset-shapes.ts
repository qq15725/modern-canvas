import { definePlugin } from '../plugin'

export const presetShapesPlugin = definePlugin(() => {
  return {
    name: 'canvas:preset-shapes',
    register(canvas) {
      canvas.registerShape({
        name: 'rectangle',
        data: new Float32Array([
          -1, 1, -1, -1, 1, -1,
          1, -1, 1, 1, -1, 1,
        ]),
      })
    },
  }
})
