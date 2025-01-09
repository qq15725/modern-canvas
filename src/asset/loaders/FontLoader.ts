import type { Font } from 'modern-font'
import type { Assets } from '../Assets'
import { Loader } from './Loader'

export class FontLoader extends Loader {
  declare load: (url: string) => Promise<Font>

  install(assets: Assets): this {
    const handler = async (url: string): Promise<Font> => {
      const { parseFont } = await import('modern-font')
      return await assets.fetch(url)
        .then(res => res.arrayBuffer())
        .then(buffer => parseFont(buffer))
    }

    this.load = (url) => {
      return assets.loadBy(url, () => handler(url))
    }

    [
      'woff',
      'ttf',
      'otf',
    ].forEach((mimeType) => {
      assets.register(mimeType, handler)
    })

    assets.font = this

    return this
  }
}
