import type { Assets } from '../Assets'
import { VideoTexture } from '../../scene'
import { Loader } from './Loader'

export class VideoLoader extends Loader {
  declare load: (url: string) => Promise<VideoTexture>

  install(assets: Assets): this {
    const handler = (url: string): Promise<VideoTexture> => {
      return new VideoTexture(url).load()
    }

    this.load = (url) => {
      return assets.loadBy(url, () => handler(url))
    }

    [
      'video/3gpp',
      'video/mpeg',
      'video/quicktime',
      'video/x-flv',
      'video/x-mng',
      'video/x-ms-asf',
      'video/x-ms-wmv',
      'video/x-msvideo',
      'video/mp4',
    ].forEach((mimeType) => {
      assets.register(mimeType, handler)
    })

    assets.video = this

    return this
  }
}
