import type { Assets } from '../Assets'
import { Loader } from './Loader'

export class JSONLoader extends Loader {
  declare load: (url: string) => Promise<Record<string, any>>

  install(assets: Assets): this {
    const handler = (url: string): Promise<Record<string, any>> => {
      return assets.fetch(url).then(rep => rep.json())
    }

    this.load = (url) => {
      return assets.loadBy(url, () => handler(url))
    }

    [
      'json',
    ].forEach((mimeType) => {
      assets.register(mimeType, handler)
    })

    assets.json = this

    return this
  }
}
