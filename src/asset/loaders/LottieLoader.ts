import type { AnimationItem } from 'lottie-web'
import type { Assets } from '../Assets'
import { Loader } from './Loader'

declare module '../Assets' {
  interface Assets {
    lottie: LottieLoader
  }
}

export class LottieLoader extends Loader {
  declare load: (url: string, canvas: HTMLCanvasElement) => Promise<AnimationItem>

  install(assets: Assets): this {
    const handler = async (url: string, canvas: HTMLCanvasElement) => {
      const lottie = await import('lottie-web').then(pkg => pkg.default)
      return lottie.loadAnimation<'canvas'>({
        container: null as any,
        renderer: 'canvas',
        rendererSettings: {
          context: canvas.getContext('2d')!,
        },
        loop: false,
        autoplay: false,
        animationData: await assets.fetch(url).then(rep => rep.json()),
      })
    }

    this.load = (url, canvas) => {
      return assets.loadBy(url, () => handler(url, canvas))
    }

    [
      'lottie',
    ].forEach((mimeType) => {
      assets.register(mimeType, handler)
    })

    assets.lottie = this

    return this
  }
}
