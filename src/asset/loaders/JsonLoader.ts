import type { Assets } from '../Assets'
import { Loader } from './Loader'

export class JsonLoader extends Loader {
  declare load: (url: string | Blob) => Promise<Record<string, any>>

  install(assets: Assets): this {
    const handler = async (blob: Blob): Promise<Record<string, any>> => {
      return JSON.parse(await blob.text())
    }

    this.load = (url) => {
      if (typeof url === 'string') {
        return assets.loadBy(url).then(handler)
      }
      return handler(url)
    }

    [
      'application/json',
    ].forEach((mimeType) => {
      assets.register(mimeType, handler)
    })

    assets.json = this

    return this
  }
}
