import type { Assets } from '../Assets'
import { VideoTexture } from '../../scene'
import { Loader } from './Loader'

export class VideoLoader extends Loader {
  declare load: (url: string) => Promise<VideoTexture>

  install(assets: Assets): this {
    this.load = (url) => {
      return new VideoTexture(url).load()
    }

    assets.video = this

    return this
  }
}
