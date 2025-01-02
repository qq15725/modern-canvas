import type { Assets } from '../Assets'
import { Image2DResource } from '../../2d'
import { PixelsTexture } from '../../core'
import { Loader } from './Loader'

declare module '../Assets' {
  interface Assets {
    gif: GifLoader
  }
}

export class GifLoader extends Loader {
  declare load: (url: string) => Promise<Image2DResource>

  install(assets: Assets): this {
    const handler = async (url: string): Promise<Image2DResource> => {
      const { decodeFrames } = await import('modern-gif')
      return await assets.fetch(url)
        .then(res => res.arrayBuffer())
        .then(buffer => decodeFrames(buffer))
        .then(frames => new Image2DResource(
          frames.map((frame) => {
            return {
              duration: frame.delay,
              texture: new PixelsTexture(frame.data, frame.width, frame.height),
            }
          }),
        ))
    }

    this.load = (url) => {
      return assets.loadBy(url, () => handler(url))
    }

    [
      'image/gif',
    ].forEach((mimeType) => {
      assets.register(mimeType, handler)
    })

    assets.gif = this

    return this
  }
}
