import type { Assets } from '../Assets'
import { Loader } from './Loader'

export class TextLoader extends Loader {
  declare load: (url: string) => Promise<string>

  install(assets: Assets): this {
    const handler = async (url: string): Promise<string> => {
      return await assets.fetch(url)
        .then(res => res.text())
    }

    this.load = (url) => {
      return assets.loadBy(url, () => handler(url))
    }

    assets.text = this

    return this
  }
}
