import type { Assets } from '../Assets'
import { Loader } from './Loader'

export class TextLoader extends Loader {
  declare load: (url: string | Blob) => Promise<string>

  install(assets: Assets): this {
    const handler = async (blob: Blob): Promise<string> => {
      return blob.text()
    }

    this.load = (url) => {
      if (typeof url === 'string') {
        return assets.loadBy(url).then(handler)
      }
      return handler(url)
    }

    assets.text = this

    return this
  }
}
