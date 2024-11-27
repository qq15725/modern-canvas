import type { Assets } from '../Assets'
import { Loader } from './Loader'

declare module '../Assets' {
  interface Assets {
    text: TextLoader
  }
}

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
