import type { Assets } from '../Assets'
import { AnimatedTexture, PixelsTexture } from '../../scene'
import { Loader } from './Loader'

export class GifLoader extends Loader {
  declare load: (url: string | Blob) => Promise<AnimatedTexture>

  install(assets: Assets): this {
    const handler = async (blob: Blob): Promise<AnimatedTexture> => {
      const { decodeFrames } = await import('modern-gif')
      return await blob.arrayBuffer()
        .then(buffer => decodeFrames(
          buffer,
          assets.gifWorkerUrl
            ? { workerUrl: assets.gifWorkerUrl } as any
            : undefined,
        ))
        .then(frames => new AnimatedTexture(
          frames.map((frame) => {
            return {
              duration: frame.delay,
              texture: new PixelsTexture({
                source: frame.data,
                width: frame.width,
                height: frame.height,
              }),
            }
          }),
        ))
    }

    this.load = (url) => {
      if (typeof url === 'string') {
        return assets.loadBy(
          url,
          () => assets.fetch(url).then(rep => rep.blob()).then(handler),
        )
      }
      return handler(url)
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
