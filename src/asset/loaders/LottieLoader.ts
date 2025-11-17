import type { AnimationItem } from 'lottie-web'
import type { Assets } from '../Assets'
import { Loader } from './Loader'

export class LottieLoader extends Loader {
  declare load: (url: string, canvas: HTMLCanvasElement) => Promise<AnimationItem>

  install(assets: Assets): this {
    this.load = async (url, canvas) => {
      const lottie = await import('lottie-web').then(pkg => pkg.default)
      return lottie.loadAnimation<'canvas'>({
        container: null as any,
        renderer: 'canvas',
        rendererSettings: {
          context: canvas.getContext('2d')!,
        },
        loop: false,
        autoplay: false,
        animationData: await assets.loadBy(
          url,
          () => assets.fetch(url).then(rep => rep.json()),
        ),
      })
    }

    assets.lottie = this

    return this
  }
}
