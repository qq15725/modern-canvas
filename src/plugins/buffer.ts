import { definePlugin } from '../plugin'

export const bufferPlugin = definePlugin(() => {
  return {
    name: 'canvas:buffer',
    register(canvas) {
      canvas.registerBuffer({
        name: 'canvas:rectangle',
        target: 'arrayBuffer',
        value: new Float32Array([
          -1, 1, -1, -1, 1, -1,
          1, -1, 1, 1, -1, 1,
        ]),
      })
    },
  }
})
