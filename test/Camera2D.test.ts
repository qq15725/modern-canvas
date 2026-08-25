import { describe, expect, it } from 'vitest'
import { Camera2D } from '../src'

describe('camera2D', () => {
  it('continues zooming out at decimal step boundaries', () => {
    const camera = new Camera2D()

    camera.setZoom(0.4)
    camera.zoomOut()

    expect(camera.zoom.x).toBeCloseTo(0.3)
    expect(camera.zoom.y).toBeCloseTo(0.3)
  })
})
