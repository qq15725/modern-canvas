import type { Font } from 'modern-font'
import type { Assets } from '../Assets'
import { Loader } from './Loader'

export class FontLoader extends Loader {
  declare load: (url: string | Blob) => Promise<Font>

  install(assets: Assets): this {
    const handler = async (blob: Blob): Promise<Font> => {
      const { parseFont } = await import('modern-font')
      return await blob.arrayBuffer()
        .then(buffer => parseFont(buffer))
    }

    this.load = (url) => {
      if (typeof url === 'string') {
        return assets.loadBy(url).then(handler)
      }
      return handler(url)
    }

    [
      'font/woff',
      'font/ttf',
      'font/otf',
    ].forEach((mimeType) => {
      assets.register(mimeType, handler)
    })

    assets.font = this

    return this
  }
}
