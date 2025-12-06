import type { Assets } from '../Assets'
import { Texture2D } from '../../scene'
import { Loader } from './Loader'

export class TextureLoader extends Loader {
  declare load: (url: string | Blob) => Promise<Texture2D<ImageBitmap>>

  install(assets: Assets): this {
    const handler = (blob: Blob): Promise<Texture2D<ImageBitmap>> => {
      // premultiply-alpha-on-upload
      return assets.fetchImageBitmap(blob, { premultiplyAlpha: 'premultiply' })
        .then((bitmap) => {
          return new Texture2D({
            source: bitmap,
            uploadMethodId: 'image',
            mipmap: true,
          })
        })
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
      'image/jpeg',
      'image/png',
      'image/tiff',
      'image/vnd.wap.wbmp',
      'image/x-icon',
      'image/x-jng',
      'image/x-ms-bmp',
      'image/svg+xml',
      'image/webp',
    ].forEach((mimeType) => {
      assets.register(mimeType, handler)
    })

    assets.texture = this

    return this
  }
}
