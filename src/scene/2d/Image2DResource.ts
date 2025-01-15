import { Resource } from '../../core'
import { Texture2D } from '../resources'

export interface ImageFrame {
  texture: Texture2D
  duration: number
}

export class Image2DResource extends Resource {
  frames: ImageFrame[]
  declare duration: number

  constructor(
    source: Texture2D | ImageFrame[],
  ) {
    super()
    let frames
    if (Array.isArray(source)) {
      frames = source
    }
    else if (source instanceof Texture2D) {
      frames = [{ texture: source, duration: 0 }]
    }
    else {
      throw new TypeError('Failed new Image2DResource')
    }
    this.frames = frames
    this.updateDuration()
  }

  updateDuration(): this {
    this.duration = this.frames.reduce((duration, frame) => frame.duration + duration, 0)
    return this
  }

  destroy(): void {
    this.frames.forEach((frame) => {
      frame.texture.destroy()
    })
  }
}
