import type { Assets } from '../Assets'
import { AnimatedTexture, PixelsTexture } from '../../scene'
import { Loader } from './Loader'

export class GifLoader extends Loader {
  declare load: (url: string) => Promise<AnimatedTexture>

  install(assets: Assets): this {
    const handler = async (url: string): Promise<AnimatedTexture> => {
      const { default: workerUrl } = await import('modern-gif/worker?url')
      const { decodeFrames } = await import('modern-gif')
      return await assets.fetch(url)
        .then(res => res.arrayBuffer())
        .then(buffer => decodeFrames(buffer, { workerUrl }))
        .then(frames => new AnimatedTexture(
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
