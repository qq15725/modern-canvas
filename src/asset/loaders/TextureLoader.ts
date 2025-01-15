import type { Assets } from '../Assets'
import { Texture2D } from '../../scene'
import { Loader } from './Loader'

export class TextureLoader extends Loader {
  declare load: (url: string) => Promise<Texture2D<ImageBitmap>>

  install(assets: Assets): this {
    const handler = (url: string): Promise<Texture2D<ImageBitmap>> => {
      return assets.fetchImageBitmap(url, { premultiplyAlpha: 'premultiply' })
        .then(bitmap => new Texture2D(bitmap))
    }

    this.load = (url) => {
      return assets.loadBy(url, () => handler(url))
    }

    [
      'image/gif',
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
