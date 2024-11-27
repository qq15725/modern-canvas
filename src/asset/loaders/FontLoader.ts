import type { Ttf, Woff } from 'modern-font'
import type { Assets } from '../Assets'
import { Loader } from './Loader'

declare module '../Assets' {
  interface Assets {
    font: FontLoader
  }
}

export class FontLoader extends Loader {
  declare load: (url: string) => Promise<Ttf | Woff>

  install(assets: Assets): this {
    const handler = async (url: string) => {
      const { parse } = await import('modern-font')
      return await assets.fetch(url)
        .then(res => res.arrayBuffer())
        .then(buffer => parse(buffer) as any)
    }

    this.load = (url) => {
      return assets.loadBy(url, () => handler(url))
    }

    [
      'woff',
      'ttf',
    ].forEach((mimeType) => {
      assets.register(mimeType, handler)
    })

    assets.font = this

    return this
  }
}
